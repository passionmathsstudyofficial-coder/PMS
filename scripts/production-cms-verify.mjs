// Controlled test records only; credentials come from the running app environment.
// Run "create" after a verified backup, inspect browser pages, then run "cleanup".
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(path.join(process.env.PMS_APP_ROOT, 'package.json'));
const mongoose = require('mongoose');
const audit = process.env.PMS_AUDIT_DIR;
const file = path.join(audit, 'cms-verification.json');
const base = 'https://passionmathstudy.in';
const cookies = new Map(); let csrf;
let state;
const action = process.argv[2] || 'create';
async function persist() { await fs.writeFile(file, JSON.stringify(state,null,2), {mode:0o600}); }
async function api(method, endpoint, data, expected = 200, authenticated = true) {
  const headers = { 'Content-Type':'application/json', Origin:base };
  if (authenticated) {
    headers.Cookie = [...cookies].map(([k,v]) => `${k}=${v}`).join('; ');
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }
  const response = await fetch(base+endpoint, { method, headers, body:data===undefined?undefined:JSON.stringify(data), signal:AbortSignal.timeout(20000) });
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(';'); const index = pair.indexOf('='); cookies.set(pair.slice(0,index),pair.slice(index+1));
  }
  let body; const text = await response.text(); try { body=JSON.parse(text); } catch { body=text; }
  if (state) { state.requests.push({method,endpoint,status:response.status,cacheControl:response.headers.get('cache-control'),responseDate:response.headers.get('date'),time:new Date().toISOString()}); await persist(); }
  assert.equal(response.status, expected, `${method} ${endpoint}: ${JSON.stringify(body?.error || body).slice(0,400)}`);
  return body;
}
async function readPage(url) { return api('GET','/api/public/resolve?'+new URLSearchParams({path:url,lang:'en'}),undefined,200,false); }
await mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:15000});
try {
  assert.equal(mongoose.connection.name,'test');
  const backup=JSON.parse(await fs.readFile(path.join(audit,'backup-receipt.json'),'utf8'));
  assert.equal(backup.ok,true); assert.equal(backup.database,'test');
  assert.equal(crypto.createHash('sha256').update(await fs.readFile(backup.file)).digest('hex'),backup.sha256);
  if(action==='create') {
    try { const prior=JSON.parse(await fs.readFile(file,'utf8')); assert.ok(prior.cleanedAt,'Previous verification records must be cleaned before a new run'); } catch(error) { if(error.code!=='ENOENT') throw error; }
    state={run:`pms-verify-${Date.now()}`,database:'test',startedAt:new Date().toISOString(),backupSha256:backup.sha256,records:[],requests:[],assertions:[],urls:{}};
    await persist();
  } else { state=JSON.parse(await fs.readFile(file,'utf8')); }
  const login=await api('POST','/api/auth/login',{email:process.env.SEED_ADMIN_EMAIL,password:process.env.SEED_ADMIN_PASSWORD});
  csrf=login.csrfToken; assert.equal(login.admin.role,'superadmin');
  const db=mongoose.connection.db;
  if(action==='cleanup') {
    for(const record of [...state.records].reverse()) {
      if(record.cleaned)continue;
      await api('DELETE',`/api/${record.resource}/${record.id}`);
      const existing=await db.collection(record.collection).findOne({_id:new mongoose.Types.ObjectId(record.id)});
      assert.equal(existing,null,`Cleanup persisted for ${record.resource}`);
      record.cleaned=true; await persist();
    }
    if(state.solutionId) assert.equal(await db.collection('solutions').findOne({_id:new mongoose.Types.ObjectId(state.solutionId)}),null);
    for(const url of [state.urls.page,state.urls.note,state.urls.question].filter(Boolean)) {
      await api('GET','/api/public/resolve?'+new URLSearchParams({path:url,lang:'en'}),undefined,404,false);
    }
    state.contentCounts = {};
    for(const name of ['books','chapters','exercises','questions','solutions','notes','importantquestions','pages']) { const count=await db.collection(name).countDocuments(); state.contentCounts[name]={before:backup.counts[name],after:count}; assert.equal(count,backup.counts[name],`Original content count preserved: ${name}`); }
    state.cleanedAt=new Date().toISOString();state.cleanup='PASS: test records and owned solution absent from database; public detail URLs return 404';await persist();
  } else {
    const site=await api('GET','/api/public/site?lang=en',undefined,200,false);
    const cls=site.classes.find(c=>c.number===10);assert.ok(cls);
    const subject=cls.subjects.find(s=>['maths','mathematics'].includes(s.slug));assert.ok(subject);
    const book=site.referenceBooks.find(b=>b.slug==='mathematics-for-class-10-by-r-d-sharma');assert.ok(book?._id);
    const session=site.academicSessions.find(s=>s.isCurrent)?.slug || '2026-27';
    const marker=state.run;
    const updated=`${marker} UPDATED`;
    state.marker=updated; state.baseClass=`/${cls.slug}/${subject.slug}`;await persist();
    async function create(resource,collection,data){
      const doc=await api('POST',`/api/${resource}`,data,201);state.records.push({resource,collection,id:doc._id});await persist();return doc;
    }
    async function verifyRecord(collection,id,field,value,url){
      const stored=await db.collection(collection).findOne({_id:new mongoose.Types.ObjectId(id)});
      const saved=field.split('.').reduce((x,k)=>x?.[k],stored);assert.equal(saved,value);
      const publicPage=await readPage(url);assert.ok(JSON.stringify(publicPage).includes(value),`Latest ${collection} public response`);
      state.assertions.push({collection,id,field,value,url,databaseReadback:true,publicReadback:true,time:new Date().toISOString()});await persist();
    }
    const page=await create('pages','pages',{slug:marker,title:{en:'Temporary deployment verification'},content:{en:`<p>${marker} draft</p>`},status:'draft'});
    await api('GET','/api/public/resolve?'+new URLSearchParams({path:`/${page.slug}`,lang:'en'}),undefined,404,false);
    await api('PUT',`/api/pages/${page._id}`,{content:{en:`<p>${updated} PAGE</p><p>$x^2+1=5$</p>`},status:'published'});
    state.urls.page=`/${page.slug}`;await verifyRecord('pages',page._id,'content.en',`<p>${updated} PAGE</p><p>$x^2+1=5$</p>`,state.urls.page);
    const chapter=await create('chapters','chapters',{class:cls._id,subject:subject._id,book:book._id,number:999,slug:marker,title:{en:`${marker} temporary chapter`},academicSession:session,status:'published'});
    const referenceBase=`/reference-solutions/${book.slug}/${cls.slug}`;
    state.urls.chapter=`${referenceBase}/${chapter.slug}`;
    await api('PUT',`/api/chapters/${chapter._id}`,{title:{en:`${updated} CHAPTER`}});
    await verifyRecord('chapters',chapter._id,'title.en',`${updated} CHAPTER`,state.urls.chapter);
    const exercise=await create('exercises','exercises',{chapter:chapter._id,number:'999.1',slug:marker,title:{en:'Temporary exercise'},academicSession:session,status:'published'});
    state.urls.exercise=`${state.urls.chapter}/${exercise.slug}`;
    await api('PUT',`/api/exercises/${exercise._id}`,{title:{en:`${updated} EXERCISE`}});
    await verifyRecord('exercises',exercise._id,'title.en',`${updated} EXERCISE`,state.urls.exercise);
    const question=await create('questions','questions',{exercise:exercise._id,number:'1',slug:marker,text:{en:`<p>${marker} temporary question</p>`},status:'published',solution:{status:'published',blocks:[{type:'formula',latex:'x=1'}]}});
    state.solutionId=question.solution._id;state.urls.question=`${state.urls.exercise}/${question.slug}`;await persist();
    await api('PUT',`/api/questions/${question._id}`,{text:{en:`<p>${updated} QUESTION</p>`}});
    await api('PUT',`/api/solutions/${state.solutionId}`,{blocks:[{type:'formula',latex:'x=7'}]});
    await verifyRecord('questions',question._id,'text.en',`<p>${updated} QUESTION</p>`,state.urls.question);
    await verifyRecord('solutions',state.solutionId,'blocks.0.latex','x=7',state.urls.question);
    const note=await create('notes','notes',{class:cls._id,subject:subject._id,slug:marker,title:{en:`${marker} temporary note`},academicSession:session,category:'ncert_notes',content:{en:'<p>Temporary note</p>'},status:'published'});
    state.urls.note=`${state.baseClass}/notes/${note.slug}`;
    await api('PUT',`/api/notes/${note._id}`,{content:{en:`<p>${updated} NOTE</p>`}});
    await verifyRecord('notes',note._id,'content.en',`<p>${updated} NOTE</p>`,state.urls.note);
    const important=await create('important-questions','importantquestions',{class:cls._id,subject:subject._id,slug:marker,title:{en:`${marker} temporary important question`},academicSession:session,text:{en:'<p>Temporary verification</p>'},status:'published'});
    state.urls.important=`${state.baseClass}/important-questions`;
    await api('PUT',`/api/important-questions/${important._id}`,{text:{en:`<p>${updated} IMPORTANT</p>`}});
    await verifyRecord('importantquestions',important._id,'text.en',`<p>${updated} IMPORTANT</p>`,state.urls.important);
    // Reopen every saved entity through independent public requests after all writes.
    for(const entry of state.assertions){assert.ok(JSON.stringify(await readPage(entry.url)).includes(entry.value));}
    state.apiVerification='PASS';state.readyForBrowserAt=new Date().toISOString();await persist();
  }
  await api('POST','/api/auth/logout',{});
  console.log(JSON.stringify({action,run:state.run,marker:state.marker,urls:state.urls,assertions:state.assertions.length,records:state.records.length,cleanup:state.cleanup,apiVerification:state.apiVerification},null,2));
} catch(error) {
  if(state){state.lastError=error.message;await persist();}
  console.error(error.message);process.exitCode=1;
} finally { await mongoose.disconnect(); }
