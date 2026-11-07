// Production content changes use authenticated CMS endpoints only. Database access is read-only evidence.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const mongoose=createRequire(path.join(process.env.PMS_APP_ROOT,'package.json'))('mongoose');
const dir=process.env.PMS_AUDIT_DIR, base='https://passionmathstudy.in';
const file=path.join(dir,'remaining-repairs.json');
let state;try{state=JSON.parse(await fs.readFile(file,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e;state={startedAt:new Date().toISOString(),records:[],requests:[],checks:[],before:{}}}
const save=()=>fs.writeFile(file,JSON.stringify(state,null,2),{mode:0o600});
const cookies=new Map();let csrf;
async function api(method,url,data,expected=200){const headers={'Content-Type':'application/json',Origin:base,Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')};if(csrf)headers['X-CSRF-Token']=csrf;const r=await fetch(base+url,{method,headers,body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(30000)});for(const c of r.headers.getSetCookie()){const s=c.split(';')[0],i=s.indexOf('=');cookies.set(s.slice(0,i),s.slice(i+1))}const b=await r.json();state.requests.push({method,url,status:r.status,at:new Date().toISOString()});await save();assert.equal(r.status,expected,`${method} ${url}: ${JSON.stringify(b?.error||b).slice(0,350)}`);return b}
const oid=id=>new mongoose.Types.ObjectId(id);
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const p=s=>`<p>${esc(s)}</p>`;
async function create(key,resource,collection,data){const prior=state.records.find(x=>x.key===key);if(prior){assert.ok(await mongoose.connection.db.collection(collection).findOne({_id:oid(prior.id)}));return{_id:prior.id,...data}}const d=await api('POST',`/api/${resource}`,data,201);state.records.push({key,resource,collection,id:d._id});await save();return d}
await mongoose.connect(process.env.MONGODB_URI);
try{
 assert.equal(mongoose.connection.name,'test');const db=mongoose.connection.db;
 const backup=JSON.parse(await fs.readFile(path.join(dir,'backup-receipt.json'),'utf8'));assert.ok(backup.ok);assert.equal(backup.database,'test');assert.equal(crypto.createHash('sha256').update(await fs.readFile(backup.file)).digest('hex'),backup.sha256);state.backup=backup;await save();
 const auth=await api('POST','/api/auth/login',{email:process.env.SEED_ADMIN_EMAIL,password:process.env.SEED_ADMIN_PASSWORD});csrf=auth.csrfToken;assert.equal(auth.admin.role,'superadmin');
 const action=process.argv[2]||'repair';
 if(action==='repair'){
  const rs=await db.collection('books').findOne({_id:oid('6ae1e68ff9bcc5e2a6a3cf4f'),status:'published',isVisible:true});assert.equal(rs.category,'practice');
  const target=`/class-10/maths/books#book-${rs._id}`;const catalog=await api('GET','/api/public/resolve?'+new URLSearchParams({path:'/class-10/maths/books',lang:'en'}));assert.ok(JSON.stringify(catalog).includes(String(rs._id)));
  for(const key of ['footer','footerBottom']){
   const doc=await api('GET',`/api/navigation/${key}`);state.before[`navigation-${key}`]??=doc;await save();
   let changed=0;const walk=items=>items.map(item=>{const v={...item};if(['/secondary-school-mathematics-for-class-10-by-r-s-aggarwal','/reference-solutions/secondary-school-mathematics-for-class-10-by-r-s-aggarwal'].includes(v.url)){v.url=target;v.label={en:'R.S. Aggarwal — Book details',hi:'आर.एस. अग्रवाल — पुस्तक विवरण'};changed++}if(v.children)v.children=walk(v.children);return v});
   const items=walk(doc.items);if(changed)await api('PUT',`/api/navigation/${key}`,{items});
   const persisted=await db.collection('navigations').findOne({key});assert.ok(JSON.stringify(persisted).includes(target));state.checks.push({type:'RS footer',key,target,changed});await save();
  }
  const canonical='6ae1e684f9bcc5e2a6a3cee5',duplicate='6aedd7468e0483251e20a4c3',exercise='6aedd7708e0483251e20a4d2';
  const ch=await db.collection('chapters').findOne({_id:oid(duplicate)});const ex=await db.collection('exercises').findOne({_id:oid(exercise)});assert.ok(ch&&ex);
  state.before.class11Chapter??=ch;state.before.class11Exercise??=ex;await save();
  assert.equal(await db.collection('questions').countDocuments({exercise:oid(exercise)}),0);
  for(const name of ['questions','topics','notes','resources','books','importantquestions'])assert.equal(await db.collection(name).countDocuments({chapter:oid(duplicate)}),0,`Empty duplicate ${name}`);
  if(String(ex.chapter)!==canonical){assert.equal(String(ex.chapter),duplicate);await api('PUT',`/api/exercises/${exercise}`,{chapter:canonical})}
  if(ch.isVisible)await api('PUT',`/api/chapters/${duplicate}`,{isVisible:false});
  assert.ok(await db.collection('chapters').findOne({_id:oid(duplicate)}));assert.equal(String((await db.collection('exercises').findOne({_id:oid(exercise)})).chapter),canonical);
  const url='/class-11/maths/adhyay-1/prashnavali-1-1';await api('GET','/api/public/resolve?'+new URLSearchParams({path:url,lang:'en'}));state.checks.push({type:'Class11',url,duplicateRetained:true,exerciseRetained:true});await save();
 }
 if(action==='class6'){
  const dataset=JSON.parse(await fs.readFile(path.join(dir,'class6-ganita-prakash-pms-original.json'),'utf8'));assert.equal(dataset.chapters.length,10);
  const cls=await db.collection('classes').findOne({number:6,status:'published'}),subject=await db.collection('subjects').findOne({slug:'maths',status:'published'});assert.ok(cls&&subject);
  const scope={class:String(cls._id),subject:String(subject._id),academicSession:'2026-27',status:'published',languageMode:'en'};
  if(!state.records.some(x=>x.key==='c6-chapter-1'))assert.equal(await db.collection('chapters').countDocuments({class:cls._id}),0,'Refuse to overwrite existing Class 6 chapters');
  const attribution=`<p><strong>Original Passion Maths Study material.</strong> These explanations, practice questions and worked solutions are independently written and are not official NCERT exercises or answers.</p><p>Curriculum reference: NCERT Ganita Prakash, Grade 6, English. <a href="${dataset.source.officialUrl}" target="_blank" rel="noopener noreferrer">Read the official NCERT textbook and original exercises</a>. NCERT retains rights in its textbook. The chapter structure was checked against the authorised government-distributed edition and NCERT CIET resources; this page does not claim to reproduce a newer reprint.</p>`;
  for(const c of dataset.chapters){
   const slug=c.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');
   const intro=attribution+`<h2>Learning goals</h2>${p(c.objectives)}<p><a href="${c.officialChapterUrl}" target="_blank" rel="noopener noreferrer">Official NCERT chapter and textbook activities</a></p>`;
   const chapter=await create(`c6-chapter-${c.number}`,'chapters','chapters',{...scope,number:c.number,sortOrder:c.number,slug,title:{en:c.title},shortDescription:{en:'Original PMS explanations and practice alongside the Ganita Prakash curriculum.'},introduction:{en:intro},notes:{en:p(c.revision)}});
   const exercise=await create(`c6-exercise-${c.number}`,'exercises','exercises',{chapter:chapter._id,number:'PMS 1',slug:'pms-original-practice-1',title:{en:'PMS Original Practice 1'},description:{en:attribution},instructions:{en:p('These three original PMS questions practise selected chapter ideas. They are not a complete NCERT exercise set. Use the official textbook link for NCERT activities.')},status:'published',languageMode:'en'});
   await create(`c6-note-${c.number}`,'notes','notes',{...scope,chapter:chapter._id,slug:`ganita-prakash-${slug}-pms-revision`,category:'ncert_notes',title:{en:`${c.title} — PMS Revision Notes`},summary:{en:c.objectives},content:{en:attribution+'<h2>Key ideas</h2>'+p(c.revision)+'<h2>Worked example</h2>'+p(c.questions[0].text)+'<ol>'+c.questions[0].steps.map(s=>`<li>${esc(s)}</li>`).join('')+'</ol>'+p('Answer: '+c.questions[0].answer)}});
   for(const q of c.questions){const question=await create(`c6-question-${c.number}-${q.number}`,'questions','questions',{exercise:exercise._id,number:q.number,slug:`pms-question-${q.number}`,title:{en:`PMS Original Practice ${q.number}`},text:{en:p(q.text)},answer:{en:p(q.answer)},source:'Original Passion Maths Study practice; Ganita Prakash curriculum reference',status:'published',languageMode:'en',questionType:'short_answer',solution:{status:'published',languageMode:'en',blocks:[...q.steps.map((s,i)=>({type:'step',title:{en:`Step ${i+1}`},content:{en:p(s)}})),{type:'finalAnswer',content:{en:p(q.answer)}}]}});
    const url=`/class-6/maths/${slug}/${exercise.slug}/${question.slug}`;const page=await api('GET','/api/public/resolve?'+new URLSearchParams({path:url,lang:'en'}));assert.ok(JSON.stringify(page).includes(q.text));assert.ok(JSON.stringify(page).includes(q.answer));state.checks.push({type:'Class6 published question and solution',url,questionId:question._id});await save();
   }
  }
  state.class6Source=dataset.source;
 }
 await api('POST','/api/auth/logout',{});state.lastCompletedAction=action;state.completedAt=new Date().toISOString();await save();console.log(JSON.stringify({action,checks:state.checks.length,created:state.records.length,backup:state.backup.sha256}));
}catch(e){state.error=e.message;await save();console.error(e.message);process.exitCode=1}finally{await mongoose.disconnect()}
