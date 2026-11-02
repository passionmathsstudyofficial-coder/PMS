import { createAdmin, login, startServer, stopServer } from './helpers.js';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import request from 'supertest';
import { zipSync, strToU8 } from 'fflate';
import CFB from 'cfb';
import { Resource, Page } from '../src/models/index.js';

let app, owner;
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');
const docx = zipSync({
  '[Content_Types].xml': strToU8('<Types><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
  'word/document.xml': strToU8('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>English हिंदी</w:t></w:r></w:p></w:body></w:document>'),
});
const ole = CFB.utils.cfb_new();
const word = Buffer.alloc(32); word.writeUInt16LE(0xa5ec);
CFB.utils.cfb_add(ole, 'WordDocument', word);
CFB.utils.cfb_add(ole, '0Table', Buffer.alloc(32));
const doc = CFB.write(ole, { type: 'buffer' });

before(async () => {
 ({app} = await startServer());
 await createAdmin({email:'documents@test.local'});
 owner = await login(app, 'documents@test.local');
});
after(stopServer);

test('PDF, DOC and DOCX persist as published resource attachments and remain downloadable after reload', async () => {
 for (const [extension, bytes, mime] of [['pdf', pdf, 'application/pdf'], ['doc', doc, 'application/msword'], ['docx', docx, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']]) {
  const upload = await owner.post('/api/media/upload').field('kind','pdf').attach('files', Buffer.from(bytes), {filename:`Study हिंदी.${extension}`,contentType:mime});
  assert.equal(upload.status,201, JSON.stringify(upload.body));
  const media = upload.body.items[0];
  assert.equal(media.format,extension); assert.equal(media.mimeType,mime);
  const resource = await owner.post('/api/resources').send({title:{en:`English ${extension}`,hi:`हिंदी ${extension}`},file:media._id,status:'published'});
  assert.equal(resource.status,201,JSON.stringify(resource.body));
  const persisted = await Resource.findById(resource.body._id).lean();
  assert.equal(String(persisted.file),media._id);
  const publicList = await request(app).get('/api/resources');
  const student = publicList.body.items.find(item=>item._id===resource.body._id);
  assert.equal(student.file.url,media.url);
  const file = await request(app).get(student.file.url);
  assert.equal(file.status,200); assert.match(file.headers['content-type'],new RegExp(mime.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.equal(file.headers['x-content-type-options'],'nosniff');
  assert.match(file.headers['content-disposition'], extension === 'pdf' ? /^inline/ : /^attachment/);
  const download = await request(app).get(`${media.url}?download=1`);
  assert.equal(download.status,200); assert.match(download.headers['content-disposition'],/^attachment/);
  assert.equal((await request(createAppForRestart()).get(media.url)).status,200);
  assert.equal(student.fileType,extension);
  const usage = await owner.get(`/api/media/${media._id}/usage`);
  assert.ok(usage.body.items.some(item=>item.type==='Resource'));
  assert.equal((await owner.del(`/api/media/${media._id}`)).status,409);
 }
});
import { createApp as createAppForRestart } from '../src/app.js';

test('published page preserves file links, Hindi, colors and equations through save/reopen/student resolve', async () => {
 const upload = await owner.post('/api/media/upload').attach('files',pdf,'instructions.pdf');
 const url=upload.body.items[0].url;
 const content={en:`<h2>Instructions</h2><p><strong><span style="color:#2563eb">English</span></strong> <span data-type="math" class="math-inline" data-latex="x^2"></span></p><p><a href="${url}">Open PDF</a></p>`,hi:`<p><span style="color:#dc2626">हिंदी निर्देश</span></p><p><a href="${url}">पीडीएफ</a></p>`};
 const created=await owner.post('/api/pages').send({title:{en:'Instructions',hi:'निर्देश'},slug:'document-instructions',content,status:'published'});
 assert.equal(created.status,201,JSON.stringify(created.body));
 const read=await owner.get(`/api/pages/${created.body._id}?scope=admin`);
 assert.match(read.body.content.en,/color:#2563eb/);
 const student=await request(app).get('/api/public/resolve?path=/document-instructions');
 assert.equal(student.status,200,JSON.stringify(student.body));
 assert.match(JSON.stringify(student.body),/color:#2563eb/); assert.ok(JSON.stringify(student.body).includes(url));
 assert.ok(!JSON.stringify(student.body).includes('हिंदी निर्देश'));
 const hindi=await request(app).get('/api/public/resolve?path=/document-instructions&lang=hi');
 assert.ok(JSON.stringify(hindi.body).includes('हिंदी निर्देश'));
 assert.equal(hindi.body.data.page.content.en,undefined);
 assert.match(JSON.stringify(student.body),/data-latex/);
 assert.equal((await owner.del(`/api/media/${upload.body.items[0]._id}`)).status,409,'embedded document is protected from accidental deletion');
});

test('unassigned legacy language values remain intact privately and never leak through public reads',async()=>{
 const created=await owner.post('/api/pages').send({title:{en:'Legacy'},slug:'legacy-language',content:{mixed:'<p>हिंदी original text</p>'},languageMode:'mixed',status:'published'});
 assert.equal(created.status,201,JSON.stringify(created.body));
 assert.equal(created.body.content.hi,'');
 assert.equal(created.body.content.mixed,'<p>हिंदी original text</p>');
 assert.equal(created.body.languageMode,'auto');
 const raw=await Page.findById(created.body._id).lean();
 assert.equal(raw.content.mixed,'<p>हिंदी original text</p>');
 await Page.collection.updateOne({_id:raw._id},{$set:{languageMode:'mixed',content:{mixed:'<p>Legacy English</p>'}}});
 const read=await request(app).get('/api/public/resolve?path=/legacy-language');
 assert.equal(read.status,200); assert.ok(!JSON.stringify(read.body).includes('Legacy English'));
 assert.equal(read.body.data.page.content._translationMissing,true);
 assert.equal(read.body.data.page.content.en,'');
});

test('rejects extension/MIME mismatches, non-Word archives, macros, active PDFs and anonymous upload',async()=>{
 const fixtures=[['fake.docx',pdf,'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],['fake.pdf',pdf,'image/png'],['fake.docx',zipSync({'other.txt':strToU8('not Word')}),'application/octet-stream'],['active.pdf',Buffer.from(pdf.toString().replace('/Type /Catalog','/Type /Catalog /JavaScript (alert(1))')),'application/pdf'],['macro.docx',zipSync({'word/vbaProject.bin':strToU8('macro')}),'application/octet-stream']];
 for(const [filename,buffer,contentType] of fixtures) assert.equal((await owner.post('/api/media/upload').attach('files',Buffer.from(buffer),{filename,contentType})).status,400,filename);
 assert.equal((await request(app).post('/api/media/upload').attach('files',pdf,'x.pdf')).status,401);
 const draft=await owner.post('/api/resources').send({title:{en:'Private draft'},status:'draft'});
 assert.equal((await request(app).get(`/api/resources/${draft.body._id}`)).status,404);
 assert.equal((await request(app).get('/api/media')).status,401);
 const upload=await owner.post('/api/media/upload').attach('files',pdf,'unpublished.pdf');
 assert.equal((await request(app).get(upload.body.items[0].url)).status,404);
 assert.equal((await owner.get(upload.body.items[0].url)).status,200);
});

test('chapter and exercise PDFs are populated and publication of their parents controls document access', async()=>{
 const uploaded=await owner.post('/api/media/upload').attach('files',pdf,'chapter.pdf');const media=uploaded.body.items[0];
 const subject=await owner.post('/api/subjects').send({name:{en:'Maths'},slug:'maths',isPublic:true,status:'published'});
 const cls=await owner.post('/api/classes').send({number:8,name:{en:'Class 8'},subjects:[subject.body._id],status:'published'});
 const chapter=await owner.post('/api/chapters').send({class:cls.body._id,subject:subject.body._id,number:2,title:{en:'Chapter'},pdfFile:media._id,status:'published'});
 const exercise=await owner.post('/api/exercises').send({chapter:chapter.body._id,number:'2.1',pdfFile:media._id,status:'published'});
 const chapterRead=await request(app).get('/api/public/resolve?path=/class-8/maths/adhyay-2');
 assert.equal(chapterRead.status,200); assert.equal(chapterRead.body.data.chapter.pdfFile.url,media.url);
 const exerciseRead=await request(app).get('/api/public/resolve?path=/class-8/maths/adhyay-2/prashnavali-2-1');
 assert.equal(exerciseRead.status,200);assert.equal(exerciseRead.body.data.exercise.pdfFile.url,media.url);
 assert.equal((await request(app).get(media.url)).status,200);
 await owner.put(`/api/classes/${cls.body._id}`).send({status:'draft'});
 assert.equal((await request(app).get(media.url)).status,404,'hidden parent must prevent access despite a published exercise');
 assert.equal((await owner.get(media.url)).status,200,'staff can preview drafts');
});

test('legacy embedded local URLs resolve to the protected endpoint without changing stored text',async()=>{
 const uploaded=await owner.post('/api/media/upload').attach('files',pdf,'legacy.pdf');const media=uploaded.body.items[0];
 const {Media}=await import('../src/models/index.js');const raw=await Media.findById(media._id).lean();
 const html=`<p><a href="${raw.url}">Legacy PDF</a></p>`;
 const page=await owner.post('/api/pages').send({title:{en:'Old links'},slug:'legacy-doc-links',content:{en:html},status:'published'});
 assert.equal(page.status,201);
 assert.equal((await Page.findById(page.body._id).lean()).content.en,html);
 const student=await request(app).get('/api/public/resolve?path=/legacy-doc-links');
 assert.ok(JSON.stringify(student.body).includes(media.url));
 const alias=await request(app).get(raw.url);assert.equal(alias.status,307);assert.equal(alias.headers.location,media.url);
 assert.equal((await request(app).get(media.url)).status,200);
 await owner.put(`/api/pages/${page.body._id}`).send({status:'draft'});
 assert.equal((await request(app).get(media.url)).status,404);
});
