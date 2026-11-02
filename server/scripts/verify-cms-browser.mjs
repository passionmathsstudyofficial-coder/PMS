import path from 'node:path';
import express from 'express';
process.env.TEST_MONGODB_URI=`mongodb://127.0.0.1:27017/pms_test_${process.pid}`;
const h=await import('../tests/helpers.js');await h.startServer();
const {env}=await import('../src/config/env.js');env.CLIENT_DIST_DIR=path.resolve('client/dist');
const {createApp}=await import('../src/app.js');const app=createApp();
await h.createAdmin({email:'cms-browser@test.local'});const owner=await h.login(app,'cms-browser@test.local');
async function create(resource,data){const r=await owner.post(`/api/${resource}`).send(data);if(r.status!==201)throw new Error(JSON.stringify(r.body));return r.body;}
const subject=await create('subjects',{name:{en:'Mathematics',hi:'गणित'},slug:'maths',isPublic:true,status:'published'});
const cls=await create('classes',{number:12,name:{en:'Class 12',hi:'कक्षा 12'},subjects:[subject._id],status:'published'});
const ch=await create('chapters',{class:cls._id,subject:subject._id,number:2,title:{en:'Math verification',hi:'गणित जाँच'},status:'published'});
const image=await owner.post('/api/media/upload').field('altEn','PMS diagram').attach('files',path.resolve('client/public/brand/pms-logo.png'));if(image.status!==201)throw new Error('Upload failed');
const equation=String.raw`\frac{3}{4}x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`;
const ex=await create('exercises',{chapter:ch._id,number:'2.1',title:{en:'Formula verification',hi:'सूत्र जाँच'},status:'published',description:{en:`<h2>Fractions and roots</h2><p>Inline <span data-type="math" class="math-inline" data-latex="x_i^2+\\alpha"></span> in a sentence.</p><p>&lt;span class="math-display" data-latex="${equation}$" data-type="math"&gt;&lt;/span&gt;</p>`},instructions:{en:`<p>Study the diagram and solve.</p><figure data-image="" data-align="center" style="width:320px"><img src="${image.body.items[0].url}" alt="PMS diagram"><figcaption>Responsive image</figcaption></figure>`},notes:{en:'<p>Matrix</p><p><span class="math-display" data-type="math" data-latex="\\begin{bmatrix}a &amp; b \\\\ c &amp; d\\end{bmatrix}"></span></p>'}});
const host=express();host.get('/__verify/mobile',(req,res)=>res.type('html').send('<!doctype html><html><head><title>CMS mobile verification</title><style>body{margin:0;background:#eee;font:16px sans-serif}h1{font-size:18px;text-align:center}iframe{display:block;width:390px;height:844px;border:1px solid #888;margin:auto;background:white}</style></head><body><h1>Student page at 390px viewport width</h1><iframe title="Student mobile viewport" src="/class-12/maths/adhyay-2/prashnavali-2-1?lang=en"></iframe></body></html>'));host.use(app);
const server=host.listen(5103,'127.0.0.1',()=>console.log(`CMS verification ready http://127.0.0.1:5103 ; exercise ${ex._id}`));
process.on('SIGINT',()=>server.close(async()=>{await h.stopServer();process.exit(0);}));
