// Run from client with PMS_PLAYWRIGHT_MODULE pointing to playwright/index.mjs.
// Public APIs are fixtures: this checks UI/routes, not production content availability.
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PMS_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PMS_PLAYWRIGHT_MODULE).href : 'playwright');
const output = process.env.PMS_AUDIT_OUTPUT || path.resolve('../test-results/navigation');
await mkdir(output,{recursive:true});
const label=en=>({en,hi:en==='Mathematics'?'गणित':en});
const site={settings:{header:{},whatsappBanner:{enabled:true,url:'https://example.org/whatsapp'}},navigation:{header:[
 {_id:'home',label:label('Home'),url:'/',type:'link'},
 {_id:'maths',label:label('Mathematics'),type:'classes',children:[]},
 {_id:'references',label:label('Reference Books'),type:'reference-books',url:'/reference-solutions'},
 {_id:'questions',label:label('Important Questions'),type:'dropdown',children:[]},
 {_id:'notes',label:label('Notes'),type:'dropdown',children:[]},
 {_id:'about',label:label('About Us'),type:'link',url:'/about-us'},
]}};
const books={'rs-aggarwal':'R.S. Aggarwal Solutions','rd-sharma':'R.D. Sharma Solutions','kc-sinha':'K.C. Sinha Solutions','ml-aggarwal':'M.L. Aggarwal Solutions'};
const server=await createServer({root:process.cwd(),server:{port:5187,strictPort:true}});
await server.listen();
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const results=[];
try {
 const widths=(process.env.PMS_AUDIT_WIDTHS||'320,375,430,768,1366,1920').split(',').map(Number);
 const outcomes = await Promise.allSettled(widths.map(async width=>{
  const mobile=width<1024;
  const context=await browser.newContext({viewport:{width,height:mobile?640:900},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage();page.setDefaultTimeout(10000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await context.route('https://example.org/**',route=>route.fulfill({body:'External link fixture'}));
  await page.route('**/api/**',async route=>{
   const url=new URL(route.request().url());let body={};
   if(url.pathname.endsWith('/public/site'))body=site;
   else if(url.pathname.endsWith('/public/revision'))body={revision:'audit'};
   else if(url.pathname.endsWith('/public/home'))body={sections:[]};
   else if(url.pathname.endsWith('/public/resolve'))body={type:'page',data:{page:{title:label('Navigation audit'),content:{en:'<p>Navigation destination fixture</p>'}}},breadcrumbs:[]};
   else if(url.pathname.endsWith('/public/suggest'))body={results:[{type:'page',id:'result',title:label('Search Result'),url:'/about-us'}]};
   else if(url.pathname.endsWith('/public/search'))body={results:[],total:0};
   await route.fulfill({json:body});
  });
  const pause=()=>page.waitForTimeout(250);
  const header=page.locator('header[data-purpose="pms-header-container"]');
  const dialog=page.getByRole('dialog');
  const activate=locator=>mobile?locator.tap():locator.click();
  async function scope(){
   if(!mobile)return header.locator('nav[aria-label]');
   if(await dialog.isVisible() && await dialog.getAttribute('data-state')==='closed') await dialog.waitFor({state:'hidden'});
   if(!await dialog.isVisible())await header.locator('button').filter({has:page.locator('svg.lucide-menu')}).tap();
   await dialog.waitFor();return dialog;
  }
  async function openCategory(name){
   const root=await scope();const button=root.getByRole('button',{name,exact:name!=='Reference Books'});
   if(await button.getAttribute('aria-expanded')!=='true')await activate(button);
   await pause();assert.equal(await button.getAttribute('aria-expanded'),'true',`${width}: ${name} opens`);
   return {root,button};
  }
  const go=async href=>page.waitForURL(url=>url.pathname+url.search===href,{waitUntil:'domcontentloaded'});
  let destinations=0;
  try{
   await page.goto('http://localhost:5187/',{waitUntil:'domcontentloaded'});await header.waitFor();
   for(const [name,count]of[['Mathematics',7],['Important Questions',5],['Notes',6]]){
    console.log('Checking',width,name);
    let {root,button}=await openCategory(name);
    const panel=mobile?page.locator(`[id="${await button.getAttribute('aria-controls')}"]`):root.locator('[role="menu"]');
    await panel.waitFor({state:'visible'});assert.equal(await panel.locator('a').count(),count);
    if(name==='Mathematics')assert.deepEqual(await panel.locator('a').allTextContents(),[12,11,10,9,8,7,6].map(n=>`Class ${n} Maths`));
    const hrefs=await panel.locator('a').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
    assert.equal(new Set(hrefs).size,count);await activate(button);assert.equal(await button.getAttribute('aria-expanded'),'false');
    await page.mouse.move(0,630);
    for(const href of hrefs){
     ({root,button}=await openCategory(name));await activate(root.locator(`a[href="${href}"]`).last());await go(href);
     if(mobile)await dialog.waitFor({state:'hidden'});
     ({root,button}=await openCategory(name));
     const active=root.locator('a[aria-current="page"]');assert.equal(await active.count(),1);assert.equal(await active.getAttribute('href'),href);destinations++;
    }
    await page.reload({waitUntil:'domcontentloaded'});({root}=await openCategory(name));assert.equal(await root.locator('a[aria-current="page"]').getAttribute('href'),hrefs.at(-1));
   }
   if(mobile){
    const {root,button}=await openCategory('Mathematics');await activate(root.getByRole('button',{name:'Notes',exact:true}));assert.equal(await button.getAttribute('aria-expanded'),'false');
   }
   for(const[slug,title]of Object.entries(books)){
    console.log('Checking book',width,slug);
    let {root}=await openCategory('Reference Books');
    const toggle=mobile?root.getByRole('button',{name:title,exact:true}):null;
    if(mobile){if(await toggle.getAttribute('aria-expanded')!=='true')await activate(toggle);await pause();}
    else await header.locator(`a[href="/reference-solutions/${slug}"]`).hover();
    const bookRoot=mobile?root:header;
    const hrefs=await bookRoot.locator(`a[href^="/reference-solutions/${slug}"]`).evaluateAll(links=>links.map(link=>link.getAttribute('href')));
    assert.equal(hrefs.length,8);
    for(const href of hrefs){
     await activate(bookRoot.locator(`a[href="${href}"]`));await go(href);if(mobile)await dialog.waitFor({state:'hidden'});
     ({root}=await openCategory('Reference Books'));
     if(mobile){if(await toggle.getAttribute('aria-expanded')!=='true')await activate(toggle);await pause();}
     else await header.locator(`a[href="/reference-solutions/${slug}"]`).hover();
     destinations++;
    }
    if(mobile){await activate(toggle);assert.equal(await toggle.getAttribute('aria-expanded'),'false');}
   }
   // Capture actual geometry: Class 6 must be above Reference Books in flow.
   if(mobile){
    const {root}=await openCategory('Mathematics');const last=root.getByRole('link',{name:'Class 6 Maths',exact:true});await last.scrollIntoViewIfNeeded();
    const a=await last.boundingBox(),b=await root.getByRole('button',{name:/Reference Books/}).boundingBox();assert.ok(a&&b&&b.y>=a.y+a.height);
   }
   await pause();await page.screenshot({path:path.join(output,`navigation-${width}.png`)});
   let controls=mobile?await scope():header;
   if(mobile){
    const popupPromise=context.waitForEvent('page');await activate(controls.locator('a[href="https://example.org/whatsapp"]'));const popup=await popupPromise;
    await popup.waitForURL('https://example.org/whatsapp');await popup.close();
   }
   await activate(controls.getByRole('button',{name:'Switch to dark theme'}));assert.ok(await page.locator('html').evaluate(el=>el.classList.contains('dark')));
   await activate(controls.locator('button').filter({hasText:/^हिंदी$/}));assert.equal(await page.locator('html').getAttribute('lang'),'hi');await pause();
   controls=mobile?await scope():header;
   await activate(controls.locator('button').filter({hasText:/^ENG$/}));await pause();controls=mobile?await scope():header;
   assert.equal(await page.locator('html').getAttribute('lang'),'en');await activate(controls.getByRole('button',{name:'Switch to light theme'}));
   if(!mobile){await page.mouse.move(0,630);await pause();await header.getByRole('button',{name:/Search/}).click();}
   const searchRoot=dialog;await searchRoot.getByRole('combobox').fill('maths');await searchRoot.getByRole('combobox').press('Enter');
   await go('/search?q=maths');await dialog.waitFor({state:'hidden'});
   // Search suggestions must also navigate and dismiss in one tap.
   if(mobile)await scope();else await header.getByRole('button',{name:/Search/}).click();
   await dialog.getByRole('combobox').fill('maths');await activate(dialog.getByRole('option').getByRole('button'));
   await go('/about-us');await dialog.waitFor({state:'hidden'});
   let root=await scope();await activate(root.getByRole('link',{name:'Home',exact:true}));await go('/');if(mobile)await dialog.waitFor({state:'hidden'});
   root=await scope();await activate(root.getByRole('link',{name:'About Us',exact:true}));await go('/about-us');if(mobile)await dialog.waitFor({state:'hidden'});
   if(mobile)root=await scope();else root=header;
   await activate(root.locator('a[aria-label$="– Home"]'));await go('/');if(mobile)await dialog.waitFor({state:'hidden'});
   if(mobile){await scope();await activate(dialog.getByRole('button',{name:'Close menu'}));await dialog.waitFor({state:'hidden'});await scope();await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});}
   assert.deepEqual(errors,[]);results.push({width,destinations,passed:true});
   await writeFile(path.join(output,`results-${width}.json`),JSON.stringify(results.at(-1),null,2));console.log('PASSED',width,destinations);
  }catch(error){await page.screenshot({path:path.join(output,`failure-${width}.png`)});console.error('FAILED',width,error);throw error;}
  finally{await context.close();}
 }));
 if (outcomes.some(outcome=>outcome.status==='rejected')) throw new AggregateError(outcomes.filter(outcome=>outcome.status==='rejected').map(outcome=>outcome.reason), 'Navigation audit failed');
 await writeFile(path.join(output,'results.json'),JSON.stringify({note:'Chromium UI tests with mocked public APIs; production content not validated.',results:results.sort((a,b)=>a.width-b.width)},null,2));
}finally{await browser.close();await server.close();}
