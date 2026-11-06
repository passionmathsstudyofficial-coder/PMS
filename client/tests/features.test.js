import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import { sanitizeRichText } from '../../server/src/lib/sanitize.js';
import { mapLegacyLanguages } from '../../shared/languages.js';
import { resolveMediaUrl, documentType, imageUrl } from '../src/lib/media.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>',{url:'https://pms.example'});
for(const key of ['window','document','DOMParser','NodeFilter','Node','Element','HTMLElement','HTMLFormElement','HTMLInputElement','DocumentFragment','CustomEvent','Event','MutationObserver','getComputedStyle','localStorage']) globalThis[key]=dom.window[key];
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const vite=await createServer({root:path.resolve(import.meta.dirname,'..'),configFile:path.resolve(import.meta.dirname,'../vite.config.js'),server:{middlewareMode:true},appType:'custom'});
after(async()=>{await vite.close();dom.window.close();});

test('exercise video switches language, resets playback and never falls back to legacy or the other language', async()=>{
 const {LanguageProvider}=await vite.ssrLoadModule('/src/lib/i18n.jsx');
 const {setUiLanguage}=await vite.ssrLoadModule('/src/lib/uiLanguage.js');
 const {BilingualYouTubeEmbed}=await vite.ssrLoadModule('/src/components/content/BilingualYouTubeEmbed.jsx');
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 const exercise={introVideo:{youtubeId:'legacy12345'},introVideoEn:{youtubeId:'abcdefghijk'},introVideoHi:{youtubeId:'12345678901'}};
 const render=async()=>act(async()=>root.render(React.createElement(LanguageProvider,null,React.createElement(BilingualYouTubeEmbed,{exercise}))));
 await act(async()=>setUiLanguage('en'));await render();
 assert.match(host.querySelector('img').src,/abcdefghijk/);
 await act(async()=>host.querySelector('button').click());
 assert.match(host.querySelector('iframe').src,/youtube-nocookie.com\/embed\/abcdefghijk/);
 await act(async()=>setUiLanguage('hi'));
 assert.equal(host.querySelector('iframe'),null);assert.match(host.querySelector('img').src,/12345678901/);
 exercise.introVideoHi=null;await render();
 assert.match(host.textContent,/वीडियो हिंदी में उपलब्ध नहीं है/);assert.equal(host.querySelector('img,iframe'),null);
 await act(async()=>setUiLanguage('en'));assert.match(host.querySelector('img').src,/abcdefghijk/);
 exercise.introVideoEn={youtubeId:'javascript:bad'};await render();
 assert.match(host.textContent,/Video not available in English/);assert.equal(host.querySelector('img,iframe'),null);
 await act(async()=>root.unmount());host.remove();
});

test('selected English/Hindi text color survives serialization, server sanitizer and editor reopen',()=>{
 for(const text of ['English words','हिंदी निर्देश']){
  const editor=new Editor({extensions:[StarterKit,TextStyle,Color],content:`<p><strong>${text}</strong> unchanged</p>`});
  editor.commands.setTextSelection({from:1,to:text.length+1}); editor.commands.setColor('#ab12cd');
  const saved=sanitizeRichText(editor.getHTML());
  const reopened=new Editor({extensions:[StarterKit,TextStyle,Color],content:saved});
  const root=document.createElement('div');root.innerHTML=reopened.getHTML();
  assert.equal(root.querySelector('span').style.color,'rgb(171, 18, 205)');
  assert.equal(root.querySelector('strong').textContent,text);
  assert.ok(root.textContent.endsWith(' unchanged'));
  assert.equal(root.querySelector('span').textContent,text);
  editor.destroy();reopened.destroy();
 }
 assert.equal(sanitizeRichText('<span style="color:expression(alert(1));background:url(javascript:x)" onclick="x()">unsafe</span>'),'<span>unsafe</span>');
});

test('legacy copy stays unassigned and verbatim without concatenating authored language fields',()=>{
 for(const [text,target] of [['<p>हिंदी English</p>','hi'],['<p>Original English</p>','en']]){
  const original={languageMode:'mixed',content:{mixed:text},blocks:[{type:'mixedText',content:{mixed:text}}]};
  const mapped=mapLegacyLanguages(original);
  assert.equal(mapped.content[target],undefined);assert.equal(mapped.content.mixed,text);
  assert.equal(mapped.languageMode,'auto');assert.equal(mapped.blocks[0].type,'text');
  assert.deepEqual(mapLegacyLanguages(mapped),mapped);assert.equal(original.content[target],undefined);
 }
 const original={hi:'Hindi',en:'English',mixed:'Legacy'};
 assert.deepEqual(mapLegacyLanguages(original),original);
 assert.deepEqual(original,{hi:'Hindi',en:'English',mixed:'Legacy'});
});

test('production media URLs use configured API origin, preserve existing cloud URLs and reject dangerous schemes',()=>{
 assert.equal(resolveMediaUrl('/uploads/2026/10/a.pdf','https://api.pms.example/api'),'https://api.pms.example/uploads/2026/10/a.pdf');
 assert.equal(resolveMediaUrl('/uploads/a.docx','/api'),'/uploads/a.docx');
 assert.equal(resolveMediaUrl('https://res.cloudinary.com/demo/raw/upload/v1/a.pdf'),'https://res.cloudinary.com/demo/raw/upload/v1/a.pdf');
 for(const url of ['javascript:alert(1)','data:text/html,x','file:///secret','//evil.example'])assert.equal(resolveMediaUrl(url),'');
 assert.equal(documentType('https://cdn.example/a.DOCX?token=abc'),'docx');
 assert.equal(imageUrl({url:'https://res.cloudinary.com/demo/raw/upload/a.pdf',format:'pdf',provider:'cloudinary'},320),'https://res.cloudinary.com/demo/raw/upload/a.pdf');
});

test('actual student rich renderer preserves colors, math and embedded document links with API URL resolution',async()=>{
 const {RichContent}=await vite.ssrLoadModule('/src/components/content/RichContent.jsx');
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 const html=sanitizeRichText('<h2>Instructions</h2><p><span style="color:#2563eb">हिंदी English</span> <span data-type="math" data-latex="x^2" class="math-inline"></span></p><a href="/uploads/guide.pdf">Open PDF</a><script>alert(1)</script>');
 await act(async()=>root.render(React.createElement(RichContent,{html})));
 assert.equal(host.querySelector('span[style]').style.color,'rgb(37, 99, 235)');
 assert.ok(host.querySelector('.katex'));assert.equal(host.querySelector('script'),null);
 assert.equal(host.querySelector('a').getAttribute('href'),'/uploads/guide.pdf');assert.ok(host.querySelector('a.document-link'));
 await act(async()=>root.unmount());host.remove();
});

test('language selectors render only Hindi and English, and student document cards offer PDF/Word actions',async()=>{
 const {LanguageSwitcher}=await vite.ssrLoadModule('/src/components/site/LanguageSwitcher.jsx');
 const {RichL10nField}=await vite.ssrLoadModule('/src/admin/components/fields/RichL10nField.jsx');
 const {DocumentAttachment}=await vite.ssrLoadModule('/src/components/content/DocumentAttachment.jsx');
 const root=document.createElement('div');root.innerHTML=renderToStaticMarkup(React.createElement(LanguageSwitcher));
 assert.equal(root.querySelectorAll('button').length,2);assert.doesNotMatch(root.textContent,/Mixed|Hinglish/);
 root.innerHTML=renderToStaticMarkup(React.createElement(RichL10nField,{value:{mixed:'हिंदी'},onChange:()=>{}}));
 assert.equal(root.querySelectorAll('[role="tab"]').length,2);assert.doesNotMatch(root.textContent,/Mixed|Hinglish/);
 for(const format of ['pdf','doc','docx']){
  root.innerHTML=renderToStaticMarkup(React.createElement(DocumentAttachment,{media:{format,url:`/uploads/guide.${format}`,originalName:`guide.${format}`}}));
  assert.equal(root.querySelectorAll('a').length,2);assert.ok(root.textContent.includes(`guide.${format}`));assert.equal(root.querySelectorAll('button').length,format==='pdf'?1:0);
 }
});

test('one language preference updates interface and educational content together',async()=>{
 const {LanguageProvider,useLang,useL10n}=await vite.ssrLoadModule('/src/lib/i18n.jsx');
 const {setUiLanguage}=await vite.ssrLoadModule('/src/lib/uiLanguage.js');
 const {useUiTranslation}=await vite.ssrLoadModule('/src/lib/useUiTranslation.jsx');
 function Probe(){const {lang}=useLang();const t=useUiTranslation();const content=useL10n();return React.createElement('div',{'data-language':lang},React.createElement('button',null,t('common.save')),React.createElement('p',null,content({hi:'हिंदी मूल पाठ',en:'Original English'})));}
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 await act(async()=>{setUiLanguage('en');root.render(React.createElement(LanguageProvider,{defaultLang:'hi'},React.createElement(Probe)));});
 assert.equal(host.querySelector('button').textContent,'Save');assert.equal(host.querySelector('p').textContent,'Original English');
 await act(async()=>setUiLanguage('hi'));
 assert.equal(host.querySelector('button').textContent,'सहेजें');assert.equal(host.querySelector('p').textContent,'हिंदी मूल पाठ');
 assert.equal(localStorage.getItem('pms-lang'),'hi');assert.equal(document.documentElement.lang,'hi');
 await act(async()=>{setUiLanguage('en');root.unmount();});host.remove();
});


test('admin language preference stays independent from the student preference',async()=>{
 const {syncLanguageScope,setUiLanguage,getUiLanguage}=await vite.ssrLoadModule('/src/lib/uiLanguage.js');
 syncLanguageScope('/');setUiLanguage('hi');
 syncLanguageScope('/pms-control-room/header');setUiLanguage('en');
 assert.equal(localStorage.getItem('pms-lang'),'hi');assert.equal(localStorage.getItem('pms-admin-lang'),'en');
 syncLanguageScope('/class-10/maths');assert.equal(getUiLanguage(),'hi');
 syncLanguageScope('/pms-control-room/header');assert.equal(getUiLanguage(),'en');
 syncLanguageScope('/');setUiLanguage('en');
});

test('actual header renders configured login link and toggles without changing its design',async()=>{
 const {Header}=await vite.ssrLoadModule('/src/components/site/Header.jsx');
 const {SiteProvider}=await vite.ssrLoadModule('/src/lib/site.jsx');
 const {QueryClient,QueryClientProvider}=await import('@tanstack/react-query');
 const {MemoryRouter}=await import('react-router');
 const host=document.createElement('div');
 for(const enabled of [true,false]){
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
  client.setQueryData(['site','en'],{settings:{header:{showLoginButton:enabled,loginUrl:'/login?source=header',loginLabel:{en:'Student sign in'},showSearch:false,showThemeSwitch:false,showLanguageSwitch:false,showClassPills:false}},navigation:{header:[{_id:'a',type:'link',url:'/audit-page',label:{en:'Audit navigation'}}]},navigationConfigured:{header:true},terms:{}});
  host.innerHTML=renderToStaticMarkup(React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,null,React.createElement(SiteProvider,null,React.createElement(Header)))));
  assert.equal(Boolean(host.querySelector('a[href="/login?source=header"]')),enabled);
  assert.ok(host.querySelector('a[href="/audit-page"]'));assert.equal(host.querySelector('input'),null);
  assert.doesNotMatch(host.textContent,/View in Hindi/);client.clear();
 }
});

test('footer includes five requested columns and preserves additional published resources',async()=>{
 const {Footer}=await vite.ssrLoadModule('/src/components/site/Footer.jsx');
 const {ReferenceBooksDropdown}=await vite.ssrLoadModule('/src/components/site/ReferenceBooksDropdown.jsx');
 const {SiteProvider}=await vite.ssrLoadModule('/src/lib/site.jsx');
 const {QueryClient,QueryClientProvider}=await import('@tanstack/react-query');
 const {MemoryRouter}=await import('react-router');
 for(const books of [[],[{slug:'audit-only',title:{en:'Only published book'},availableClasses:[10]}]]){
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
  client.setQueryData(['site','en'],{settings:{whatsappBanner:{enabled:false}},navigation:{footer:[],footerBottom:[]},navigationConfigured:{footer:true,footerBottom:true},referenceBooks:books,terms:{}});
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  await act(async()=>root.render(React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,null,React.createElement(SiteProvider,null,React.createElement(Footer),React.createElement(ReferenceBooksDropdown,{label:'Audit books'}))))));
  const button=host.querySelector('button');await act(async()=>button.click());
  assert.ok(host.querySelector('footer a[href="/privacy-policy"]'));
 assert.equal(host.querySelectorAll('footer a[href="/privacy-policy"]').length,2);
 assert.equal(host.querySelectorAll('footer h2').length,5);
 assert.equal(host.querySelector('footer a[href*="state-board"]'),null);
 assert.ok(host.querySelector('footer a[href="#footer-disclaimer"]'));
  assert.equal(host.querySelectorAll('footer a[href*="rs-aggarwal/class-"]').length,7);
  assert.equal(host.querySelectorAll('footer a[href*="rd-sharma/class-"]').length,7);
  assert.equal(host.textContent.includes('Only published book'),books.length>0);
  await act(async()=>root.unmount());host.remove();client.clear();
 }
});

test('advertisement iframe reloads when the saved code revision changes',async()=>{
 const {AdSlot}=await vite.ssrLoadModule('/src/components/site/AdSlot.jsx');
 const {SiteProvider}=await vite.ssrLoadModule('/src/lib/site.jsx');
 const {QueryClient,QueryClientProvider}=await import('@tanstack/react-query');
 const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
 const host=document.createElement('div');
 const sources=[];
 for(const updatedAt of ['2026-11-05T10:00:00Z','2026-11-05T10:01:00Z']){
  client.setQueryData(['site','en'],{settings:{ads:{enabled:true}},adSlots:[{_id:'audit-ad',name:'Audit ad',placement:'belowHeader',updatedAt}]});
  host.innerHTML=renderToStaticMarkup(React.createElement(QueryClientProvider,{client},React.createElement(SiteProvider,null,React.createElement(AdSlot,{placement:'belowHeader',pageType:'home'}))));
  const frame=host.querySelector('iframe');assert.ok(frame);sources.push(frame.getAttribute('src'));
  assert.match(frame.getAttribute('src'),/public\/ad-frame\/audit-ad\?v=/);
 }
 assert.notEqual(sources[0],sources[1]);client.clear();
});

test('editor hook evaluates lazy defaults once and tracks real initial values',async()=>{
 const {useEditorForm}=await vite.ssrLoadModule('/src/admin/lib/useEditorForm.jsx');
 const {QueryClient,QueryClientProvider}=await import('@tanstack/react-query');
 const {MemoryRouter}=await import('react-router');
 let calls=0,editor;
 function Probe(){editor=useEditorForm({resource:'books',id:'new',basePath:'/books',defaults:()=>{calls++;return {title:{en:'New book'},availableClasses:[10],status:'draft'};}});return React.createElement('p',null,editor.form.title.en);}
 const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 await act(async()=>root.render(React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,null,React.createElement(Probe)))));
 assert.equal(host.textContent,'New book');assert.equal(editor.dirty,false);assert.equal(calls,1);
 await act(async()=>editor.set('title',{en:'Edited book'}));
 assert.equal(host.textContent,'Edited book');assert.equal(editor.dirty,true);assert.equal(calls,1);
 await act(async()=>root.unmount());host.remove();client.clear();
});

test('book editor handles an uncached pending document and new book defaults without crashing',async()=>{
 const {BookEditor}=await vite.ssrLoadModule('/src/admin/pages/BooksPage.jsx');
 const {AdminAuthProvider}=await vite.ssrLoadModule('/src/admin/lib/auth.jsx');
 const {ConfirmProvider}=await vite.ssrLoadModule('/src/admin/components/ConfirmDialog.jsx');
 const {api}=await vite.ssrLoadModule('/src/lib/api.js');
 const {QueryClient,QueryClientProvider}=await import('@tanstack/react-query');
 const {createMemoryRouter,RouterProvider}=await import('react-router');
 const original=api.defaults.adapter;
 const pending=[];
 api.defaults.adapter=async config=>config.url.includes('uncached-book')?new Promise(resolve=>pending.push(()=>resolve({data:{_id:'uncached-book',title:{en:'Loaded book'},author:'Audit',availableClasses:[10],status:'draft'},status:200,statusText:'OK',headers:{},config}))):({data:{items:[],total:0},status:200,statusText:'OK',headers:{},config});
 try{
  for(const id of ['new','uncached-book']){
   const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
   client.setQueryData(['admin-me'],{admin:{name:'Audit Owner',role:'superadmin'},permissions:['content:read','content:write','content:publish','content:delete']});
   if(id!=='new') client.setQueryDefaults(['admin','books','item',id],{queryFn:()=>new Promise(()=>{})});
   const host=document.createElement('div');document.body.append(host);const errors=[];const root=createRoot(host,{onUncaughtError:error=>errors.push(error)});
   const router=createMemoryRouter([{path:'*',element:React.createElement(AdminAuthProvider,null,React.createElement(ConfirmProvider,null,React.createElement(BookEditor,{id})))}]);
   await act(async()=>root.render(React.createElement(QueryClientProvider,{client},React.createElement(RouterProvider,{router}))));
   assert.deepEqual(errors,[]);
   if(id==='new'){
    assert.ok(host.textContent.includes('New Reference Book'));
    assert.ok(host.textContent.includes('Draft'));
    assert.ok(host.querySelector('input[id]'));
    assert.ok(host.textContent.includes('SEO title'));
   }else {assert.equal(host.querySelector('h1'),null);await act(async()=>pending.splice(0).forEach(resolve=>resolve()));}
   await act(async()=>root.unmount());host.remove();router.dispose();client.clear();
  }
 }finally{api.defaults.adapter=original;}
});

test('announcement editor waits for data and uses visibility scheduling instead of unsupported publish actions',async()=>{
 const {AnnouncementEditor}=await vite.ssrLoadModule('/src/admin/pages/AnnouncementsPage.jsx');
 const {AdminAuthProvider}=await vite.ssrLoadModule('/src/admin/lib/auth.jsx');
 const {ConfirmProvider}=await vite.ssrLoadModule('/src/admin/components/ConfirmDialog.jsx');
 const {QueryClient,QueryClientProvider}=await import('@tanstack/react-query');
 const {createMemoryRouter,RouterProvider}=await import('react-router');
 const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
 client.setQueryData(['admin-me'],{admin:{name:'Audit Owner'},permissions:['content:write','content:publish']});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 const router=createMemoryRouter([{path:'*',element:React.createElement(AdminAuthProvider,null,React.createElement(ConfirmProvider,null,React.createElement(AnnouncementEditor,{id:'new'})))}]);
 await act(async()=>root.render(React.createElement(QueryClientProvider,{client},React.createElement(RouterProvider,{router}))));
 assert.ok(host.textContent.includes('New Announcement'));
 assert.ok(host.textContent.includes('Starts at'));assert.ok(host.textContent.includes('Ends at'));
 assert.equal([...host.querySelectorAll('button')].some(button=>['Publish','Save draft','Unpublish'].includes(button.textContent.trim())),false);
 await act(async()=>root.unmount());host.remove();router.dispose();client.clear();
});

test('mobile navigation is an accessible modal and Escape closes it',async()=>{
 const {MobileMenu}=await vite.ssrLoadModule('/src/components/site/MobileMenu.jsx');
 const {QueryClient,QueryClientProvider}=await import('@tanstack/react-query');
 const {MemoryRouter}=await import('react-router');
 const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 let closes=0;
 function Probe(){const [open,setOpen]=React.useState(true);return React.createElement(React.Fragment,null,React.createElement('p',null,open?'drawer-open':'drawer-closed'),React.createElement(MobileMenu,{open,onClose:()=>{closes++;setOpen(false);}}));}
 await act(async()=>root.render(React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,null,React.createElement(Probe)))));
 try{
  const dialog=document.querySelector('[role="dialog"]');assert.ok(dialog);assert.equal(dialog.getAttribute('aria-modal'),'true');
  await act(async()=>document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  assert.equal(closes,1);assert.ok(host.textContent.includes('drawer-closed'));
 }finally{await act(async()=>root.unmount());host.remove();client.clear();}
});


test('homepage hero supplies complete English lessons with missing CMS translations and preserves Hindi', async()=>{
 globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{};
 window.matchMedia=()=>({matches:true,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
 const {HeroSection}=await vite.ssrLoadModule('/src/components/home/HeroSection.jsx');
 const {gsap,ScrollTrigger}=await vite.ssrLoadModule('/src/lib/motion.js');
 after(()=>{ScrollTrigger.disable();gsap.ticker.sleep();});
 const {LanguageProvider}=await vite.ssrLoadModule('/src/lib/i18n.jsx');
 const {setUiLanguage}=await vite.ssrLoadModule('/src/lib/uiLanguage.js');
 const {MemoryRouter}=await import('react-router');
 const section={_id:'hero',title:{hi:'NCERT गणित हल'},description:{hi:'मूल हिंदी विवरण'},badge:{_translationMissing:true},buttons:[{_id:'choose',label:{_translationMissing:true},url:'#classes'}],config:{searchPlaceholder:{_translationMissing:true},searchButtonLabel:{_translationMissing:true},popularLabel:{_translationMissing:true}}};
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 await act(async()=>{setUiLanguage('en');root.render(React.createElement(MemoryRouter,null,React.createElement(LanguageProvider,null,React.createElement(HeroSection,{section}))));});
 for(const text of ['NCERT Mathematics for Classes 6 to 12','Simple, accurate','Learn mathematics with step-by-step explanations','Example Question','Euclid','Live Geometry Diagram Simulation','Choose your class']) assert.ok(host.textContent.includes(text),text);
 assert.doesNotMatch(host.textContent,/Content not available|[\u0900-\u097f]/);
 assert.ok(host.querySelector('.katex'));assert.equal(host.querySelector('.katex-error'),null);
 assert.equal(host.querySelector('input[type="search"]').placeholder,'e.g. Class 10 Ex 5.2, Triangle, Formula...');
 for(const lang of ['hi','en','hi','en']){
  await act(async()=>setUiLanguage(lang));
  assert.ok(host.textContent.includes(lang==='hi'?'यूक्लिड की 5वीं':'Euclid'));
  assert.doesNotMatch(host.textContent,/Content not available/);
  assert.ok(host.querySelector('.katex'));
 }
 await act(async()=>root.unmount());host.remove();
});


test('study dropdowns show requested destinations and support exclusive opening, keyboard and dismissal', async()=>{
 const {MainNavbar}=await vite.ssrLoadModule('/src/components/site/MainNavbar.jsx');
 const {SiteProvider}=await vite.ssrLoadModule('/src/lib/site.jsx');
 const {QueryClient,QueryClientProvider}=await import('@tanstack/react-query');
 const {MemoryRouter}=await import('react-router');
 const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
 client.setQueryData(['site','en'],{settings:{header:{showSearch:false,showThemeSwitch:false,showLanguageSwitch:false}},navigation:{header:[
  {label:{en:'Important Questions'},type:'dropdown',url:'/study-materials/important-questions'},
  {label:{en:'Notes'},type:'dropdown',url:'/study-materials/ncert-notes'},
 ]},referenceBooks:[],terms:{}});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 await act(async()=>root.render(React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,null,React.createElement(SiteProvider,null,React.createElement(MainNavbar))))));
 const button=label=>[...host.querySelectorAll('button')].find(el=>el.textContent===label);
 await act(async()=>button('Important Questions').click());
 assert.equal(host.querySelectorAll('[role="menuitem"]').length,5);
 assert.equal(host.querySelector('[role="menuitem"]').getAttribute('href'),'/study-materials/cbse-sample-papers?view=pyq');
 await act(async()=>button('Notes').click());
 assert.equal(button('Important Questions').getAttribute('aria-expanded'),'false');
 assert.equal(host.querySelectorAll('[role="menuitem"]').length,6);
 assert.match(host.textContent,/RS Aggarwal Formulas & Notes/);
 await act(async()=>host.querySelector('[role="menuitem"]').focus());
 await act(async()=>document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true})));
 assert.equal(document.activeElement.textContent,'All Maths Formula Sheets');
 await act(async()=>document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
 assert.equal(host.querySelector('[role="menu"]'),null);
 assert.equal(document.activeElement,button('Notes'));
 await act(async()=>button('Notes').click());
 await act(async()=>document.body.dispatchEvent(new window.MouseEvent('mousedown',{bubbles:true})));
 assert.equal(host.querySelector('[role="menu"]'),null);
 await act(async()=>button('Notes').click());
 await act(async()=>host.querySelector('[role="menuitem"]').click());
 assert.equal(host.querySelector('[role="menu"]'),null);
 await act(async()=>button('Notes').click());
 assert.equal(host.querySelectorAll('[role="menuitem"][aria-current="page"]').length,1);
 assert.equal(host.querySelector('[aria-current="page"]').textContent,'NCERT Chapter-wise Notes');
 await act(async()=>[...host.querySelectorAll('[role="menuitem"]')].find(el=>el.textContent==='All Maths Formula Sheets').click());
 await act(async()=>button('Notes').click());
 assert.equal(host.querySelectorAll('[role="menuitem"][aria-current="page"]').length,1);
 assert.equal(host.querySelector('[aria-current="page"]').textContent,'All Maths Formula Sheets');
 await act(async()=>root.unmount());host.remove();client.clear();
});


test('mobile CMS Mathematics builds missing classes, keeps independent accordion state and navigates once', async()=>{
 const {MobileMenu}=await vite.ssrLoadModule('/src/components/site/MobileMenu.jsx');
 const {SiteProvider}=await vite.ssrLoadModule('/src/lib/site.jsx');
 const {api}=await vite.ssrLoadModule('/src/lib/api.js');
 const {QueryClient,QueryClientProvider}=await import('@tanstack/react-query');
 const {createMemoryRouter,RouterProvider}=await import('react-router');
 const original=api.defaults.adapter;
 api.defaults.adapter=async config=>({data:config.url.includes('revision')?{revision:'test'}:site,status:200,statusText:'OK',headers:{},config});
 const site={navigation:{header:[
  {_id:'math',type:'classes',label:{en:'Mathematics'},children:[]},
  {_id:'notes',type:'dropdown',label:{en:'Notes'},children:[]},
 ]},referenceBooks:[{slug:'custom-book',title:{en:'Configured book'},availableClasses:[10]}]};
 const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
 client.setQueryData(['site','en'],site);
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 let closes=0;
 const router=createMemoryRouter([{path:'*',element:React.createElement(SiteProvider,null,React.createElement(MobileMenu,{open:true,onClose:()=>closes++}))}]);
 try{
  await act(async()=>root.render(React.createElement(QueryClientProvider,{client},React.createElement(RouterProvider,{router}))));
  const dialog=document.querySelector('[role="dialog"]');
  const button=name=>[...dialog.querySelectorAll('button')].find(el=>el.textContent===name);
  await act(async()=>button('Mathematics').click());
  const maths=button('Mathematics');
  const panel=document.getElementById(maths.getAttribute('aria-controls'));
  assert.deepEqual([...panel.querySelectorAll('a')].map(link=>link.textContent),[12,11,10,9,8,7,6].map(n=>`Class ${n} Maths`));
  assert.equal(panel.querySelector('[aria-current="page"]'),null);
  await act(async()=>maths.click()); assert.equal(maths.getAttribute('aria-expanded'),'false');
  await act(async()=>maths.click());
  await act(async()=>button('Notes').click());
  assert.equal(maths.getAttribute('aria-expanded'),'false');
  assert.equal(button('Notes').getAttribute('aria-expanded'),'true');
  await act(async()=>maths.click());
  await act(async()=>dialog.querySelector('a[href="/class-12/maths"]').click());
  assert.equal(router.state.location.pathname,'/class-12/maths'); assert.equal(closes,1);
  assert.equal(maths.getAttribute('aria-expanded'),'false');
  const reference=[...dialog.querySelectorAll('button')].find(el=>el.textContent.includes('Reference Books'));
  await act(async()=>reference.click());
  assert.ok(button('Configured book'));assert.equal(button('R.S. Aggarwal Solutions'),undefined);
 }finally{
  await act(async()=>root.unmount());host.remove();router.dispose();client.clear();api.defaults.adapter=original;
 }
});
