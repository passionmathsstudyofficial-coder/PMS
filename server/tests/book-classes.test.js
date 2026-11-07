import { createAdmin, login, startServer, stopServer } from './helpers.js';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { Book, BookClass, ClassLevel, Chapter, Subject } from '../src/models/index.js';
import { ensureBookClasses } from '../src/services/bookClasses.js';
let app, owner, a, b, subject;
before(async()=>{
 ({app}=await startServer()); await createAdmin({email:'book-classes@test.local'}); owner=await login(app,'book-classes@test.local');
 subject=await Subject.create({name:{en:'Mathematics'},slug:'maths',isPublic:true,status:'published'});
 for(let number=6;number<=12;number++) await ClassLevel.create({number,name:{en:`Class ${number}`},slug:`class-${number}`,subjects:[subject._id],status:'published'});
 a=await Book.create({title:{en:'A'},slug:'a',category:'reference',status:'published'});
 b=await Book.create({title:{en:'B'},slug:'b',category:'reference',status:'published'});
});
after(stopServer);
test('seven independent records per book; insert-only repair is idempotent and creates no textbook content',async()=>{
 assert.equal(await BookClass.countDocuments({book:a._id}),7); assert.equal(await BookClass.countDocuments({book:b._id}),7);
 const entry=await BookClass.findOne({book:a._id}); await BookClass.updateOne({_id:entry._id},{$set:{'name.en':'Preserved',status:'draft'}});
 await ensureBookClasses(a); await ensureBookClasses(a);
 assert.equal(await BookClass.countDocuments({book:a._id}),7); assert.equal((await BookClass.findById(entry._id)).name.en,'Preserved');
 assert.equal((await BookClass.findById(entry._id)).status,'draft'); assert.equal(await Chapter.countDocuments(),0);
 await owner.patch(`/api/book-classes/${entry._id}/status`).send({status:'published'}).expect(200);
});
test('admin edit persists, public resolver uses custom slug/SEO and publication is independent across books',async()=>{
 const cls=await ClassLevel.findOne({number:6}); const entry=await BookClass.findOne({book:a._id,class:cls._id});
 await owner.put(`/api/book-classes/${entry._id}`).send({name:{en:'A six'},description:{en:'Saved class description'},slug:'six',seo:{title:'A six SEO'}}).expect(200);
 assert.equal((await BookClass.findById(entry._id)).slug,'six');
 const resolve=path=>request(app).get('/api/public/resolve').query({path,lang:'en'});
 const publicPage=await resolve('/reference-solutions/a/six'); assert.equal(publicPage.status,200); assert.equal(publicPage.body.data.class.description.en,'Saved class description'); assert.equal(publicPage.body.seo.title,'A six SEO');
 assert.equal((await resolve('/reference-solutions/b/class-6')).status,200);
 await owner.patch(`/api/book-classes/${entry._id}/status`).send({status:'draft'}).expect(200);
 assert.equal((await resolve('/reference-solutions/a/six')).status,404);
 assert.equal((await resolve('/reference-solutions/b/class-6')).status,200);
 await owner.patch(`/api/book-classes/${entry._id}/status`).send({status:'published'}).expect(200);
 await owner.put(`/api/book-classes/${entry._id}`).send({isVisible:false}).expect(200);
 assert.equal((await resolve('/reference-solutions/a/six')).status,404);
 await owner.put(`/api/book-classes/${entry._id}`).send({isVisible:true}).expect(200);
 assert.equal((await resolve('/reference-solutions/a/six')).status,200);
});
test('duplicate ownership is rejected and classes with content cannot be deleted',async()=>{
 const cls=await ClassLevel.findOne({number:7});const entry=await BookClass.findOne({book:a._id,class:cls._id});
 const duplicate=await owner.post('/api/book-classes').send({book:a._id,class:cls._id,slug:'another'});assert.equal(duplicate.status,409);
 await Chapter.create({book:a._id,class:cls._id,subject:subject._id,number:1,title:{en:'Existing chapter'},slug:'existing',status:'published'});
 await owner.del(`/api/book-classes/${entry._id}`).expect(409);
 await request(app).put(`/api/book-classes/${entry._id}`).send({name:{en:'unauthorized'}}).expect(401);
});

test('hidden memberships hide nested chapter APIs and additional classes get canonical slugs',async()=>{
 const cls=await ClassLevel.findOne({number:7});const entry=await BookClass.findOne({book:a._id,class:cls._id});
 await owner.put(`/api/book-classes/${entry._id}`).send({isVisible:false}).expect(200);
 for(const url of [`/api/books/${a._id}/chapters`,`/api/classes/${cls._id}/chapters`,`/api/chapters?book=${a._id}`]){
  const response=await request(app).get(url);assert.equal(response.status,200);assert.equal(response.body.items.length,0);
 }
 await owner.put(`/api/book-classes/${entry._id}`).send({isVisible:true}).expect(200);
 const extra=await ClassLevel.create({number:13,name:{en:'Class 13'},slug:'class-13',status:'published'});
 const created=await owner.post('/api/book-classes').send({book:a._id,class:extra._id,name:{en:'Additional class'},status:'published'});
 assert.equal(created.status,201);assert.equal(created.body.slug,'class-13');
});
