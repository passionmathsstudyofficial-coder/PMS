// User-authorized automated tests, isolated anonymous browser contexts, real production APIs.
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import{pathToFileURL}from'node:url';
const {chromium}=await import(pathToFileURL(path.resolve('test-results/browser-runtime/node_modules/playwright/index.mjs')).href);
const base='https://passionmathstudy.in',out=path.resolve('docs/verification/remaining-2026-11-07');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const evidence={startedAt:new Date().toISOString(),checks:[],errors:[]};
const dataset=JSON.parse(await fs.readFile('content/class6-ganita-prakash-pms-original.json','utf8'));
async function ready(page,url,phrase){const r=await page.goto(base+url,{waitUntil:'domcontentloaded'});assert.equal(r.status(),200,url);await page.locator('main').waitFor();if(phrase)await page.getByText(phrase,{exact:false}).filter({visible:true}).first().waitFor();evidence.checks.push({url:page.url(),status:r.status(),phrase});}
try{
 if(!process.env.PMS_NAV_ONLY){
 const desktop=await browser.newContext({viewport:{width:1366,height:900},locale:'en-IN'});const page=await desktop.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>evidence.errors.push(e.message));
 await ready(page,'/','NCERT Mathematics');
 const rs=page.locator('footer a[href="/class-10/maths/books#book-6ae1e68ff9bcc5e2a6a3cf4f"]');assert.equal(await rs.count(),1);await rs.scrollIntoViewIfNeeded();assert.match(await rs.textContent(),/Book details/);await page.screenshot({path:path.join(out,'footer-corrected.png')});
 await ready(page,'/class-10/maths/books#book-6ae1e68ff9bcc5e2a6a3cf4f');await page.locator('#book-6ae1e68ff9bcc5e2a6a3cf4f').waitFor({state:'visible'});
 await ready(page,'/class-11/maths/adhyay-1/prashnavali-1-1');await page.screenshot({path:path.join(out,'class11-exercise.png')});
 await ready(page,'/class-6/maths','Patterns in Mathematics');assert.equal(await page.getByText('The Other Side of Zero',{exact:false}).count()>0,true);await page.screenshot({path:path.join(out,'class6-ten-chapters.png'),fullPage:true});
 for(const c of dataset.chapters){const slug=c.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');await ready(page,`/class-6/maths/${slug}`,c.title);await page.getByText('Original Passion Maths Study material.',{exact:false}).first().waitFor();
  for(const q of c.questions){await ready(page,`/class-6/maths/${slug}/pms-original-practice-1/pms-question-${q.number}`,q.text);await page.getByText(q.answer,{exact:false}).first().waitFor();}
  await ready(page,`/class-6/maths/notes/ganita-prakash-${slug}-pms-revision`,`${c.title} — PMS Revision Notes`);
 }
 await page.screenshot({path:path.join(out,'class6-worked-note.png'),fullPage:true});
 await ready(page,'/class-6/maths/fractions/pms-original-practice-1/pms-question-1','Calculate 5/12');await page.reload({waitUntil:'domcontentloaded'});await page.getByText('7/12',{exact:false}).first().waitFor();evidence.checks.push({phase:'refresh persistence',url:page.url()});
 await desktop.close();
 const fresh=await browser.newContext({viewport:{width:1366,height:900},locale:'en-IN'});const p=await fresh.newPage();await ready(p,'/class-6/maths/fractions/pms-original-practice-1/pms-question-1','Calculate 5/12');await p.getByText('7/12',{exact:false}).first().waitFor();evidence.checks.push({phase:'new anonymous browser session persistence',url:p.url()});await fresh.close();
 }
 for(const width of [320,375,430,768,1366,1920]){const context=await browser.newContext({viewport:{width,height:900},isMobile:width<768,hasTouch:width<768,locale:'en-IN'});const p=await context.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>evidence.errors.push(e.message));await ready(p,'/','NCERT Mathematics');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`No horizontal overflow at ${width}`);
  const header=p.locator('header[data-purpose="pms-header-container"]');
  if(width<1024){const opener=header.getByRole('button',{name:'Open navigation menu',exact:true});await opener.click();const dialog=p.getByRole('dialog');await dialog.waitFor({state:'visible'});assert.doesNotMatch(await dialog.locator('input[type=search]').getAttribute('placeholder'),/Content not available/);for(let n=0;n<8;n++){await p.keyboard.press('Tab');assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)),'Mobile focus remains inside modal')};await p.screenshot({path:path.join(out,`mobile-menu-${width}.png`)});await p.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await p.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Open navigation menu');assert.ok(await opener.evaluate(el=>el===document.activeElement),'Escape restores opener focus');
  }else{const notes=header.getByRole('button',{name:'Notes',exact:true});await notes.focus();await p.keyboard.press('ArrowDown');assert.equal(await notes.getAttribute('aria-expanded'),'true');assert.ok(await p.locator('[role="menuitem"]:focus').count());await p.keyboard.press('End');await p.keyboard.press('Home');await p.keyboard.press('Escape');assert.equal(await notes.getAttribute('aria-expanded'),'false');assert.ok(await notes.evaluate(el=>el===document.activeElement));
   const ref=header.getByRole('button',{name:'Reference Books',exact:true});await ref.focus();await p.keyboard.press('ArrowDown');await p.waitForFunction(()=>document.activeElement?.matches('[data-reference-book]'));await p.keyboard.press('ArrowRight');await p.waitForFunction(()=>document.activeElement?.getAttribute('href')?.endsWith('/class-10'));await p.keyboard.press('ArrowLeft');await p.waitForFunction(()=>document.activeElement?.matches('[data-reference-book]'));await header.locator('a[href="/reference-solutions/mathematics-for-class-10-by-r-d-sharma"]').waitFor({state:'visible'});await p.keyboard.press('Escape');await p.screenshot({path:path.join(out,`desktop-${width}.png`)});
  }
  evidence.checks.push({phase:'responsive and keyboard',width,noHorizontalOverflow:true});await context.close();
 }
 assert.deepEqual(evidence.errors,[]);evidence.result='PASS';
}catch(e){evidence.result='FAIL';evidence.failure=e.stack;throw e}finally{evidence.finishedAt=new Date().toISOString();await fs.writeFile(path.join(out,process.env.PMS_NAV_ONLY?'navigation-results.json':'browser-results.json'),JSON.stringify(evidence,null,2));await browser.close();console.log(JSON.stringify({result:evidence.result,checks:evidence.checks.length,failure:evidence.failure}));}
