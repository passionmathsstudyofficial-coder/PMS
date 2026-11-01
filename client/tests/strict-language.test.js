import {test} from 'node:test';
import assert from 'node:assert/strict';
import { localizedValue,projectLanguage,mergeLanguageFields,translationStatus } from '../../shared/localization.js';
import { languageUrl } from '../../shared/languageUrl.js';
test('strict selection never falls back to the other language or unassigned legacy text',()=>{
 for(const language of ['en','hi']){
  const other=language==='en'?'hi':'en';
  assert.equal(localizedValue({[other]:other==='hi'?'मूल पाठ':'Original text'},language),'');
  assert.equal(localizedValue({mixed:'<p>पुराना Legacy</p>'},language),'');
 }
 assert.equal(localizedValue({en:'English',hi:'हिंदी'},'en'),'English');
 assert.equal(localizedValue({en:'English',hi:'हिंदी'},'hi'),'हिंदी');
 assert.equal(localizedValue({en:'गलत भाषा'},'en'),'');
});
test('language projection strips opposite slots and mixed indexes without mutating the source',()=>{
 const source={title:{en:'Title',hi:'शीर्षक'},nested:[{content:{hi:'पाठ'},searchText:'दोनों both'}],seo:{translations:{en:{title:'English SEO'},hi:{title:'हिंदी खोज'}}}};
 const snapshot=JSON.stringify(source),en=projectLanguage(source,'en');
 assert.equal(en.title.hi,undefined);assert.equal(en.nested[0].content._translationMissing,true);
 assert.equal(en.seo.translations.hi,undefined);assert.equal(en.nested[0].searchText,undefined);
 assert.equal(JSON.stringify(source),snapshot);assert.deepEqual(projectLanguage(en,'en'),en);
 assert.equal(projectLanguage({key:'chapter',en:'Chapter',hi:'अध्याय'},'hi').key,'chapter');
});
test('partial nested updates preserve sibling language, math, legacy slots and array identities',()=>{
 const equation=String.raw`<p><span style="color:#2563eb">हिंदी</span> $\int x^2 dx$ <img src="/diagram.svg"></p>`;
 const original={title:{en:'Old',hi:'पुराना',mixed:'Legacy'},blocks:[{_id:'a',content:{en:'Old answer',hi:equation}}]};
 const updated=mergeLanguageFields(original,{title:{en:'New'},blocks:[{_id:'a',content:{en:'New answer'}}]});
 assert.equal(updated.title.hi,'पुराना');assert.equal(updated.title.mixed,'Legacy');assert.equal(updated.blocks[0].content.hi,equation);assert.equal(original.title.en,'Old');
});
test('mathematical markup remains byte-for-byte unchanged in either selected slot',()=>{
 const math=String.raw`<table><tr><td><span data-type="math" data-latex="\frac{1}{2}+\int_0^1 x^2 dx"></span></td></tr></table>`;
 for(const language of ['en','hi']) assert.equal(localizedValue({[language]:math},language),math);
 assert.deepEqual(translationStatus({en:'English',hi:''}),{en:true,hi:false});
 assert.equal(languageUrl('/class-10/maths?foo=1','hi'),'/class-10/maths?foo=1&lang=hi');
 assert.equal(languageUrl('/class-10/maths?lang=hi','en'),'/class-10/maths');
});


test('Drive preview/download URLs share one safe normalizer',async()=>{
 const {driveDocument,normalizeDocumentUrl}=await import('../../shared/documents.js');
 const value='https://drive.google.com/file/d/Study_FILE-12345/view?usp=sharing';
 const drive=driveDocument(value);assert.equal(drive.preview,'https://drive.google.com/file/d/Study_FILE-12345/preview');
 assert.equal(drive.download,'https://drive.google.com/uc?export=download&id=Study_FILE-12345');
 assert.equal(normalizeDocumentUrl(value),drive.open);
 assert.equal(driveDocument('https://drive.google.com.evil.example/file/d/Study_FILE-12345/view'),null);
 assert.throws(()=>normalizeDocumentUrl('javascript:alert(1)'));
});
