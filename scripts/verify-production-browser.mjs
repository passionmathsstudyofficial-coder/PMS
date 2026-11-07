// User-authorized automated tests use new, anonymous Playwright browser contexts.
// Does not attach to or control any existing native browser window.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(path.resolve('test-results/browser-runtime/node_modules/playwright/index.mjs')).href);
const base = 'https://passionmathstudy.in';
const run = process.env.PMS_VERIFY_RUN;
assert.ok(run?.startsWith('pms-verify-'));
const marker = `${run} UPDATED`;
const book = '/reference-solutions/mathematics-for-class-10-by-r-d-sharma';
const chapter = `${book}/class-10/${run}`;
const question = `${chapter}/${run}/${run}`;
const output = path.resolve('docs/verification/production-2026-11-07');
await fs.mkdir(output, {recursive:true});
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const checks = []; const errors=[];
async function ready(page,url,phrase) {
  const response = await page.goto(base+url,{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200,url);
  await page.locator('main').waitFor({state:'visible'});
  if(phrase) await page.getByText(phrase,{exact:false}).first().waitFor({state:'visible'});
  checks.push({url:await page.url(),status:response.status(),phrase,phase:'initial',at:new Date().toISOString()});
}
async function image(page,name){await page.screenshot({path:path.join(output,name),fullPage:false});}
try {
 const first=await browser.newContext({viewport:{width:1366,height:900},locale:'en-IN'});
 const page=await first.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 await ready(page,'/','NCERT Mathematics for Classes 6 to 12');
 const header=page.locator('header[data-purpose="pms-header-container"]');
 await header.getByRole('button',{name:'Reference Books',exact:true}).click();
 const bookLink=header.locator(`a[href="${book}"]`);await bookLink.hover();
 const classLink=header.locator(`a[href="${book}/class-10"]`);await classLink.waitFor({state:'visible'});
 const referenceLinks=await header.locator('a[href^="/reference-solutions/"]').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
 assert.ok(referenceLinks.length>=2);assert.ok(referenceLinks.every(link=>link===book||link===`${book}/class-10`));
 await image(page,'reference-menu.png');
 await classLink.click();await page.waitForURL(url=>url.pathname===`${book}/class-10`);
 await page.getByText(`${marker} CHAPTER`,{exact:false}).first().waitFor();
 checks.push({url:await page.url(),phase:'real nested menu click',referenceLinks});
 await ready(page,'/reference-solutions/ncert/class-6','NCERT Class 6 Mathematics');
 assert.equal(new URL(page.url()).pathname,'/class-6/maths');await image(page,'ncert-class-6.png');
 for(const [url,phrase,name] of [
  [`/${run}`,`${marker} PAGE`,'published-page.png'],
  [chapter,`${marker} CHAPTER`,'published-chapter.png'],
  [question,`${marker} QUESTION`,'published-question.png'],
  [`/class-10/maths/notes/${run}`,`${marker} NOTE`,'published-note.png'],
  ['/class-10/maths/important-questions',`${marker} IMPORTANT`,'published-important.png'],
 ]) {
  await ready(page,url,phrase);
  if(url===question){await page.locator('[role="math"][aria-label="x=7"]').waitFor({state:'visible'});assert.ok(await page.locator('.katex').count());}
  if(url===`/${run}`)assert.ok(await page.locator('.katex').count());
  await image(page,name);
  const response=await page.reload({waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
  await page.getByText(phrase,{exact:false}).first().waitFor({state:'visible'});
  checks.push({url:await page.url(),phase:'browser refresh',phrase,status:response.status()});
 }
 await first.close();
 // A separate context starts with no cookies/localStorage/query cache from the first.
 const fresh=await browser.newContext({viewport:{width:1366,height:900},locale:'en-IN'});
 assert.deepEqual(await fresh.cookies(),[]);
 const reopened=await fresh.newPage();reopened.setDefaultTimeout(20000);reopened.on('pageerror',e=>errors.push(e.message));
 for(const [url,phrase]of [[`/${run}`,`${marker} PAGE`],[question,`${marker} QUESTION`],[`/class-10/maths/notes/${run}`,`${marker} NOTE`],['/class-10/maths/important-questions',`${marker} IMPORTANT`]]){
  await ready(reopened,url,phrase);checks.at(-1).phase='fresh anonymous browser context';
 }
 await image(reopened,'fresh-session-important.png');await fresh.close();
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'en-IN'});
 const touch=await mobile.newPage();touch.setDefaultTimeout(20000);touch.on('pageerror',e=>errors.push(e.message));
 await ready(touch,'/','NCERT Mathematics for Classes 6 to 12');
 const mobileHeader=touch.locator('header[data-purpose="pms-header-container"]');
 await mobileHeader.locator('button').filter({has:touch.locator('svg.lucide-menu')}).tap();
 const dialog=touch.getByRole('dialog');await dialog.waitFor({state:'visible'});
 await dialog.getByRole('button',{name:/Reference Books/}).tap();
 await dialog.getByRole('button',{name:'Mathematics for Class 10 by R.D. Sharma',exact:true}).tap();
 const mobileClass=dialog.locator(`a[href="${book}/class-10"]`);await mobileClass.waitFor({state:'visible'});
 await image(touch,'mobile-reference-menu.png');await mobileClass.tap();
 await touch.waitForURL(url=>url.pathname===`${book}/class-10`);
 await touch.getByText(`${marker} CHAPTER`,{exact:false}).first().waitFor({state:'visible'});
 checks.push({url:await touch.url(),phase:'mobile touch nested-menu navigation'});
 await mobile.close();assert.deepEqual(errors,[]);
 const result={passed:true,finishedAt:new Date().toISOString(),run,checks,errors,screenshots:await fs.readdir(output),note:'Actual production HTTPS pages, installed Chrome in headless mode; independent anonymous browser contexts, reloads and mobile touch.'};
 await fs.writeFile(path.join(output,'browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({passed:true,checks:checks.length,output}));
}catch(error){await fs.writeFile(path.join(output,'browser-failure.json'),JSON.stringify({error:error.message,checks,errors},null,2));throw error;}
finally{await browser.close();}
