import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {startServer,stopServer,createAdmin,login} from './helpers.js';
import {createLanguageFixture} from './language-fixture.js';
import {Page,Question} from '../src/models/index.js';
import {env} from '../src/config/env.js';
import {renderAppHtml} from '../src/services/seoHtml.js';
let app,owner,fixture;
before(async()=>{({app}=await startServer());await createAdmin({email:'strict@test.local'});owner=await login(app,'strict@test.local');fixture=await createLanguageFixture(owner);});
after(stopServer);
const resolve=(path,lang)=>request(app).get('/api/public/resolve').query({path,lang});
test('every class 6–12 and both subjects return only the requested localized slots',async()=>{
 for(const cls of fixture.classes)for(const subject of fixture.subjects)for(const lang of ['en','hi']){
  const result=await resolve(`/${cls.slug}/${subject.slug}`,lang);assert.equal(result.status,200,JSON.stringify(result.body));
  const other=lang==='en'?'hi':'en';assert.equal(result.body.data.class.name[other],undefined);assert.ok(result.body.data.class.name[lang]);
  for(const chapter of result.body.data.chapters)assert.equal(chapter.title[other],undefined);
 }
});
test('language validation, cache isolation and missing translation responses are strict',async()=>{
 for(const lang of ['fr','mixed','en-US']) assert.equal((await resolve('/language-proof',lang)).status,400);
 for(const lang of ['en','hi','en']){
  const response=await resolve('/language-proof',lang);assert.equal(response.headers['content-language'],lang);
  assert.equal(response.body.data.page.content[lang],lang==='en'?'<p>English page body</p>':'<p>हिंदी पृष्ठ की सामग्री</p>');
  assert.equal(response.body.data.page.content[lang==='en'?'hi':'en'],undefined);
 }
 const missing=await resolve('/missing-english','en');assert.equal(missing.body.data.page.content.en,'');assert.equal(missing.body.data.page.content._translationMissing,true);assert.doesNotMatch(JSON.stringify(missing.body),/केवल हिंदी/);
});
test('partial English and Hindi saves preserve the sibling language and solution mathematics',async()=>{
 const original=await owner.get('/api/questions/'+fixture.question._id);
 const block=original.body.solution.blocks[0],math=original.body.solution.blocks[1].latex;
 const english=await owner.put('/api/questions/'+fixture.question._id).send({text:{en:'<p>Updated English question</p>'},solution:{blocks:original.body.solution.blocks.map((row,index)=>index===0?{_id:row._id,type:row.type,content:{en:'<p>Updated English solution</p>'}}:row)}});
 assert.equal(english.status,200,JSON.stringify(english.body));assert.equal(english.body.text.hi,original.body.text.hi);assert.equal(english.body.solution.blocks[0].content.hi,block.content.hi);assert.equal(english.body.solution.blocks[1].latex,math);
 const hindi=await owner.put('/api/questions/'+fixture.question._id).send({text:{hi:'<p>बदला हुआ हिंदी प्रश्न</p>'}});assert.equal(hindi.status,200);assert.equal(hindi.body.text.en,'<p>Updated English question</p>');
});
test('search and suggestions query only the requested language and never return combined snippets',async()=>{
 const en=await request(app).get('/api/public/search').query({lang:'en',q:'English'});assert.equal(en.status,200);assert.ok(en.body.total>0);for(const row of en.body.results){assert.equal(row.title.hi,undefined);assert.doesNotMatch(row.snippet||'',/[\u0900-\u097f]/);}
 const hi=await request(app).get('/api/public/suggest').query({lang:'hi',q:'हिंदी'});assert.equal(hi.status,200);assert.ok(hi.body.total>0);for(const row of hi.body.results){assert.equal(row.title.en,undefined);assert.doesNotMatch(row.snippet||'',/English/);}
 const absent=await request(app).get('/api/public/search').query({lang:'en',q:'केवल'});assert.equal(absent.body.total,0);
});
test('per-language SEO updates preserve siblings and emit language-specific canonicals',async()=>{
 const id=fixture.page._id;
 await owner.put('/api/pages/'+id).send({seo:{translations:{en:{title:'English SEO title',description:'English SEO description'},hi:{title:'हिंदी खोज शीर्षक',description:'हिंदी खोज विवरण'}}}});
 const saved=await owner.put('/api/pages/'+id).send({seo:{translations:{en:{title:'Updated English SEO'}}}});assert.equal(saved.status,200);assert.equal(saved.body.seo.translations.hi.title,'हिंदी खोज शीर्षक');assert.equal(saved.body.seo.translations.en.description,'English SEO description');
 const en=await resolve('/language-proof','en'),hi=await resolve('/language-proof','hi');assert.equal(en.body.seo.title,'Updated English SEO');assert.equal(hi.body.seo.title,'हिंदी खोज शीर्षक');assert.equal(hi.body.seo.canonical,'/language-proof?lang=hi');assert.equal(en.body.seo.translations.hi,undefined);
});
test('draft, edit, publish, archive and delete preserve language ownership and visibility',async()=>{
 const draft=await fixture.create('pages',{slug:'crud-language',status:'draft',title:{en:'Draft English'},content:{en:'<p>English draft</p>'}});
 assert.equal((await resolve('/crud-language','en')).status,404);
 const edited=await owner.put('/api/pages/'+draft._id).send({title:{hi:'हिंदी मसौदा'},content:{hi:'<p>हिंदी मसौदे की सामग्री</p>'}});assert.equal(edited.body.title.en,'Draft English');
 assert.equal((await owner.patch('/api/pages/'+draft._id+'/status').send({status:'published'})).status,200);
 assert.equal((await resolve('/crud-language','hi')).body.data.page.content.en,undefined);
 await owner.patch('/api/pages/'+draft._id+'/status').send({status:'archived'});assert.equal((await resolve('/crud-language','en')).status,404);
 assert.equal((await owner.del('/api/pages/'+draft._id)).status,200);assert.equal(await Page.findById(draft._id),null);
});
test('server HTML emits one language, matching metadata, canonicals and hreflang alternates',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'pms-seo-language-'));
 const previous=env.CLIENT_DIST_DIR;
 try{
  env.CLIENT_DIST_DIR=directory;
  await fs.writeFile(path.join(directory,'index.html'),'<!doctype html><html lang="en"><head><!--app-head--></head><body><div id="root"></div></body></html>');
  for(const lang of ['en','hi']){
   let html='';const headers={};
   const response={set(key,value){headers[key]=value;return this;},get(key){return headers[key];},vary(){return this;},status(){return this;},type(){return this;},send(value){html=value;return this;}};
   await renderAppHtml({path:'/language-proof',query:{lang},cookies:{}},response);
   assert.match(html,new RegExp('<html lang="'+lang+'">'));assert.match(html,/hreflang="en"/);assert.match(html,/hreflang="hi"/);assert.equal(headers['Content-Language'],lang);
   if(lang==='en'){assert.match(html,/Updated English SEO/);assert.doesNotMatch(html,/[\u0900-\u097f]/);}else{assert.match(html,/हिंदी खोज शीर्षक/);assert.doesNotMatch(html,/Updated English SEO/);assert.match(html,/language-proof\?lang=hi/);}
  }
 }finally{env.CLIENT_DIST_DIR=previous;await fs.unlink(path.join(directory,'index.html'));await fs.rmdir(directory);}
});
