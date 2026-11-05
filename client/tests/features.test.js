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
for(const key of ['window','document','DOMParser','NodeFilter','Node','Element','HTMLElement','MutationObserver','getComputedStyle','localStorage']) globalThis[key]=dom.window[key];
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
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
  client.setQueryData(['site','en'],{settings:{header:{showLoginButton:enabled,loginUrl:'/login?source=header',loginLabel:{en:'Student sign in'},showSearch:false,showThemeSwitch:false,showLanguageSwitch:false,showClassPills:false}},navigation:{header:[{_id:'a',type:'link',url:'/audit-page',label:{en:'Audit navigation'}}]},navigationConfigured:{header:true},terms:{}});
  host.innerHTML=renderToStaticMarkup(React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,null,React.createElement(SiteProvider,null,React.createElement(Header)))));
  assert.equal(Boolean(host.querySelector('a[href="/login?source=header"]')),enabled);
  assert.ok(host.querySelector('a[href="/audit-page"]'));assert.equal(host.querySelector('input'),null);
  assert.doesNotMatch(host.textContent,/View in Hindi/);client.clear();
 }
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
