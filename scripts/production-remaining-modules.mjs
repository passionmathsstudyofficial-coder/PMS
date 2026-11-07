// Production content changes use authenticated CMS endpoints only. Database access is read-only evidence.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const mongoose=createRequire(path.join(process.env.PMS_APP_ROOT,'package.json'))('mongoose');
const dir=process.env.PMS_AUDIT_DIR, base='https://passionmathstudy.in';
const file=path.join(dir,'remaining-modules.json');
let state;try{state=JSON.parse(await fs.readFile(file,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e;state={startedAt:new Date().toISOString(),marker:'pms-module-'+Date.now(),records:[],requests:[],checks:[],before:{},urls:{}}}
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
 const backup=JSON.parse(await fs.readFile(path.join(dir,'backup-receipt.json'),'utf8'));assert.ok(backup.ok);assert.equal(crypto.createHash('sha256').update(await fs.readFile(backup.file)).digest('hex'),backup.sha256);state.backup=backup;await save();
 const auth=await api('POST','/api/auth/login',{email:process.env.SEED_ADMIN_EMAIL,password:process.env.SEED_ADMIN_PASSWORD});csrf=auth.csrfToken;
 const action=process.argv[2]||'create',marker=state.marker;
 if(action==='cleanup'){
  // Restore only fields temporarily changed by this run; preserve all other configuration.
  const ownTopic=state.records.find(r=>r.key==='topic');if(ownTopic&&!ownTopic.cleaned)await api('PUT',`/api/topics/${ownTopic.id}`,{image:null,video:null});
  if(state.before.footerDisclaimer)await api('PUT','/api/site-settings',{footer:{disclaimer:state.before.footerDisclaimer}});
  if(state.before.navigation)await api('PUT','/api/navigation/footerBottom',{items:state.before.navigation.items});
  if(state.before.video)await api('PUT',`/api/videos/${state.before.video.id}`,{description:state.before.video.description});
  if(state.before.seo)await api('PUT','/api/seo-settings/search',state.before.seo);
  for(const record of [...state.records].reverse()){
   if(record.cleaned)continue;await api('DELETE',`/api/${record.resource}/${record.id}`);assert.equal(await db.collection(record.collection).findOne({_id:oid(record.id)}),null);record.cleaned=true;await save();
  }
  state.cleanedAt=new Date().toISOString();await save();
 }else if(action==='routes'){
  for(const[key,slug]of [['class','class-20'],['subject','cms-test-maths'],['chapter','cms-sync-check'],['exercise','cms-practice'],['topic','sync-topic'],['question','sync-question']]){const r=state.records.find(r=>r.key===key);await api('PUT',`/api/${r.resource}/${r.id}`,{slug})}
  state.urls.topic='/class-20/cms-test-maths/cms-sync-check/topic/sync-topic';state.urls.question='/class-20/cms-test-maths/cms-sync-check/cms-practice/sync-question';state.urls.resources='/class-20/cms-test-maths/resources';
  const related=state.records.find(r=>r.key==='related');await api('PUT',`/api/related-content/${related.id}`,{items:[{targetType:'Url',url:state.urls.topic,label:{en:marker+' RELATED UPDATED'}}]});
  const nav=await api('GET','/api/navigation/footerBottom');await api('PUT','/api/navigation/footerBottom',{items:nav.items.map(i=>i.label?.en===marker+' NAVIGATION UPDATED'?{...i,url:state.urls.topic}:i)});await save();
 }else{
  if(!state.records.some(r=>r.key==='class'))assert.equal(await db.collection('classes').countDocuments({number:20}),0,'Reserved temporary class must be absent');
  const subject=await create('subject','subjects','subjects',{slug:marker,name:{en:'Temporary CMS verification'},isPublic:true,status:'published'});
  await api('PUT',`/api/subjects/${subject._id}`,{name:{en:marker+' SUBJECT UPDATED'}});
  const cls=await create('class','classes','classes',{number:20,slug:marker,name:{en:'Temporary verification class'},subjects:[subject._id],sortOrder:10000,status:'published'});
  await api('PUT',`/api/classes/${cls._id}`,{description:{en:marker+' CLASS UPDATED'}});
  const scope={class:cls._id,subject:subject._id,status:'published',academicSession:'2026-27'};const root=`/${cls.slug}/${subject.slug}`;
  const chapter=await create('chapter','chapters','chapters',{...scope,number:1,slug:marker,title:{en:'Temporary verification chapter'}});const churl=`${root}/${chapter.slug}`;
  const exercise=await create('exercise','exercises','exercises',{chapter:chapter._id,number:'1',slug:marker,status:'published'});
  const topic=await create('topic','topics','topics',{...scope,chapter:chapter._id,number:1,slug:marker,title:{en:'Temporary verification topic'}});
  await api('PUT',`/api/topics/${topic._id}`,{notes:{en:p(marker+' TOPIC UPDATED')}});state.urls.topic=`${churl}/topic/${topic.slug}`;
  const book=await create('book','books','books',{...scope,category:'reference',availableClasses:[20],slug:marker,title:{en:'Temporary verification book'}});
  await api('PUT',`/api/books/${book._id}`,{description:{en:marker+' BOOK UPDATED'}});state.urls.book=`/reference-solutions/${book.slug}`;
  const resource=await create('resource','resources','resources',{...scope,chapter:chapter._id,resourceType:'worksheet',title:{en:'Temporary verification resource'},externalUrl:'https://ncert.nic.in/'});
  await api('PUT',`/api/resources/${resource._id}`,{title:{en:marker+' RESOURCE UPDATED'}});state.urls.resources=`${root}/resources`;
  // Reuse a real saved video URL for an explicitly labelled, temporary wiring test.
  const existing=await db.collection('videos').findOne({provider:'youtube',isVisible:true});assert.ok(existing?.url);
  state.before.video??={id:String(existing._id),description:existing.description};await save();const video={_id:state.before.video.id};
  await api('PUT',`/api/videos/${video._id}`,{description:{en:(state.before.video.description?.en||'')+' '+marker+' VIDEO UPDATED'}});await api('PUT',`/api/topics/${topic._id}`,{video:video._id});
  const form=new FormData();form.append('files',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')],{type:'image/png'}),marker+'.png');form.append('title',marker+' MEDIA');
  const upload=await fetch(base+'/api/media/upload',{method:'POST',headers:{Origin:base,Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),'X-CSRF-Token':csrf},body:form});const mediaBody=await upload.json();assert.equal(upload.status,201,JSON.stringify(mediaBody));const media=mediaBody.items[0];state.records.push({key:'media',resource:'media',collection:'media',id:media._id});await save();
  await api('PUT',`/api/media/${media._id}`,{alt:{en:marker+' MEDIA UPDATED'}});await api('PUT',`/api/topics/${topic._id}`,{image:media._id});
  const section=await create('section','sections','sections',{page:'home',type:'text',name:marker,title:{en:marker+' SECTION'},config:{content:p('Temporary controlled CMS verification')},status:'published',sortOrder:10000});
  await api('PUT',`/api/sections/${section._id}`,{title:{en:marker+' SECTION UPDATED'}});state.urls.home='/';
  const announcement=await create('announcement','announcements','announcements',{text:{en:marker+' ANNOUNCEMENT'},linkUrl:root,linkLabel:{en:'Temporary verification'},sortOrder:-100,isVisible:true});
  await api('PUT',`/api/announcements/${announcement._id}`,{text:{en:marker+' ANNOUNCEMENT UPDATED'}});
  const template=await create('template','templates','templates',{name:marker,kind:'solution',blocks:[{type:'explanation',content:{en:p(marker+' TEMPLATE UPDATED')}}]});
  const question=await create('question','questions','questions',{exercise:exercise._id,number:'1',slug:marker,text:{en:p(marker+' QUESTION')},status:'published',solution:{status:'published',template:template._id,blocks:template.blocks}});state.urls.question=`${churl}/${exercise.slug}/${question.slug}`;
  const related=await create('related','related-content','relatedcontents',{sourceType:'Question',source:question._id,items:[{targetType:'Url',url:state.urls.topic,label:{en:marker+' RELATED UPDATED'}}],autoFill:false});
  const session=await create('session','academic-sessions','academicsessions',{name:marker,slug:marker,year:2098,isActive:true,isCurrent:false,sortOrder:10000});
  const settings=await api('GET','/api/site-settings?scope=admin');state.before.footerDisclaimer=settings.footer.disclaimer;await save();await api('PUT','/api/site-settings',{footer:{disclaimer:{en:(settings.footer.disclaimer.en||'')+' '+marker+' SETTINGS UPDATED'}}});
  const nav=await api('GET','/api/navigation/footerBottom');state.before.navigation=nav;await save();await api('PUT','/api/navigation/footerBottom',{items:[...nav.items,{label:{en:marker+' NAVIGATION UPDATED'},url:state.urls.topic,isVisible:true}]});
  const seo=(await api('GET','/api/seo-settings')).items.find(x=>x.routeKey==='search');state.before.seo={title:seo.title,description:seo.description,ogImage:seo.ogImage?._id||null,robots:seo.robots,canonical:seo.canonical};await save();await api('PUT','/api/seo-settings/search',{...state.before.seo,description:{en:marker+' SEO UPDATED'}});state.urls.search='/search';
  // Do not enable unrelated saved advertising code when global advertisements are disabled.
  const ad=await create('ad','ad-slots','adslots',{name:marker,placement:'afterContent',device:'all',pageTypes:['page'],code:`<p>${marker} AD UPDATED</p>`,isEnabled:true});
  const adResponse=await fetch(base+`/api/public/ad-frame/${ad._id}`);assert.equal(adResponse.status,settings.ads.enabled?200:404);state.advertising={globalEnabled:settings.ads.enabled,frameStatus:adResponse.status,positiveFrameVerified:settings.ads.enabled,reason:settings.ads.enabled?'Real enabled frame checked':'Global ads remain disabled; visibility gate tested without activating existing advertising code'};
  const checks=[['subjects',subject._id,'/api/public/site?lang=en',marker+' SUBJECT UPDATED'],['classes',cls._id,'/api/public/resolve?'+new URLSearchParams({path:root,lang:'en'}),marker+' CLASS UPDATED'],['topics',topic._id,'/api/public/resolve?'+new URLSearchParams({path:state.urls.topic,lang:'en'}),marker+' TOPIC UPDATED'],['books',book._id,'/api/public/resolve?'+new URLSearchParams({path:state.urls.book,lang:'en'}),marker+' BOOK UPDATED'],['resources',resource._id,'/api/public/resolve?'+new URLSearchParams({path:state.urls.resources,lang:'en'}),marker+' RESOURCE UPDATED'],['videos',video._id,'/api/public/resolve?'+new URLSearchParams({path:state.urls.topic,lang:'en'}),marker+' VIDEO UPDATED'],['media',media._id,'/api/public/resolve?'+new URLSearchParams({path:state.urls.topic,lang:'en'}),marker+' MEDIA UPDATED'],['sections',section._id,'/api/public/home?lang=en',marker+' SECTION UPDATED'],['announcements',announcement._id,'/api/public/site?lang=en',marker+' ANNOUNCEMENT UPDATED'],['templates',template._id,'/api/public/resolve?'+new URLSearchParams({path:state.urls.question,lang:'en'}),marker+' TEMPLATE UPDATED'],['relatedcontents',related._id,'/api/public/resolve?'+new URLSearchParams({path:state.urls.question,lang:'en'}),marker+' RELATED UPDATED'],['academicsessions',session._id,'/api/public/site?lang=en',marker],['sitesettings',settings._id,'/api/public/site?lang=en',marker+' SETTINGS UPDATED'],['navigations',null,'/api/public/site?lang=en',marker+' NAVIGATION UPDATED'],['seosettings',seo._id,'/api/public/site?lang=en',marker+' SEO UPDATED']];
  for(const[collection,id,url,value]of checks){const body=await api('GET',url);assert.ok(JSON.stringify(body).includes(value),collection+' public synchronization');if(id){const doc=await db.collection(collection).findOne({_id:oid(id)});assert.ok(JSON.stringify(doc).includes(value),collection+' database readback')}state.checks.push({collection,id,url,value,publicReadback:true,databaseReadback:Boolean(id)});await save()}
  state.readyForBrowserAt=new Date().toISOString();await save();
 }
 await api('POST','/api/auth/logout',{});console.log(JSON.stringify({action,marker,checks:state.checks.length,urls:state.urls,advertising:state.advertising,cleanedAt:state.cleanedAt}));
}catch(e){state.error=e.stack;await save();console.error(e.stack);process.exitCode=1}finally{await mongoose.disconnect()}
