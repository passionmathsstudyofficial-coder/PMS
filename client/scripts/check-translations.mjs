import fs from 'node:fs';
import path from 'node:path';
import {parse}from '@babel/parser';
import traverseModule from '@babel/traverse';
import {fileURLToPath}from 'node:url';
import {filesIn,inspectFile}from './ui-sources.mjs';
import {hasUiTranslation}from '../src/lib/uiLanguage.js';
import {application}from '../src/lib/translations/application.js';
import {remaining}from '../src/lib/translations/remaining.js';
import {hi,keys}from '../src/lib/translations/hi.js';
const traverse=traverseModule.default;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const exceptions=JSON.parse(fs.readFileSync(path.join(root,'client/src/lib/translations/exceptions.json')));
const backlog=JSON.parse(fs.readFileSync(path.join(root,'docs/interface-translation-backlog.json')));
const reports={rawInterfaceText:[],unresolvedKeys:[],invalidEntries:[],dynamicBypasses:[],intentional:[]};
for(const [source,entry]of Object.entries({...remaining,...application})){
 if(!entry.en?.trim()||!entry.hi?.trim())reports.invalidEntries.push({source,reason:'Both languages are required'});
 if(/[\u0900-\u097f]/.test(entry.en))reports.invalidEntries.push({source,reason:'Hindi in English interface copy'});
 const slots=text=>[...text.matchAll(/\{(v\d+)\}/g)].map(m=>m[1]).sort().join(',');
 if(slots(entry.en)!==slots(entry.hi))reports.invalidEntries.push({source,reason:'Interpolation placeholders differ'});
}
const translatedKey=source=>hasUiTranslation(source)||typeof source.split('.').reduce((v,k)=>v?.[k],keys)==='string';
for(const file of filesIn(path.join(root,'client/src'))){
 if(file.includes(path.sep+'translations'+path.sep)||/uiLanguage|useUiTranslation|apiErrorLanguage/.test(file))continue;
 const {source,ast,found}=inspectFile(file);const relative=path.relative(root,file).replaceAll('\\','/');
 for(const item of found){
  const reason=exceptions[item.text]||(relative.endsWith('/LanguageSwitcher.jsx')&&item.text==='हिंदी'?'Native-language label for the Hindi selector':null);
  if(reason)reports.intentional.push({file:relative,line:item.line,text:item.text,reason});
  else reports.rawInterfaceText.push({...item,file:relative,raw:undefined,start:undefined,end:undefined});
 }
 traverse(ast,{
  CallExpression(p){const n=p.node;
   if(['uiText','translateUi'].includes(n.callee.name)&&n.arguments[0]?.type==='StringLiteral'&&!translatedKey(n.arguments[0].value)&&!exceptions[n.arguments[0].value])reports.unresolvedKeys.push({file:relative,line:n.loc.start.line,key:n.arguments[0].value});
   if(n.callee.type==='MemberExpression'&&n.callee.object.name==='toast'&&n.arguments[0]?.type==='TemplateLiteral'){
    const literal=n.arguments[0].quasis.map(q=>q.value.cooked).join('').trim();
    // Empty/punctuation-only templates contain data; they do not require a prose translation.
    if(/[A-Za-z\u0900-\u097f]/.test(literal))reports.dynamicBypasses.push({file:relative,line:n.loc.start.line,reason:'Toast template bypasses uiTemplate'});
   }
  },
  TaggedTemplateExpression(p){if(p.node.tag.name!=='uiTemplate')return;const n=p.node.quasi,key=n.quasis.map((q,i)=>q.value.cooked+(i<n.expressions.length?`{v${i}}`:'')).join('').trim();if(!translatedKey(key)&&!exceptions[key])reports.unresolvedKeys.push({file:relative,line:n.loc.start.line,key});},
 });
}
for(const entry of backlog)if(entry.status==='translated'?(!entry.en||!entry.hi):entry.status!=='intentional'||!entry.reason)reports.invalidEntries.push({source:entry.source,reason:'Backlog entry lacks a resolution'});
const unresolved=reports.rawInterfaceText.length+reports.unresolvedKeys.length+reports.invalidEntries.length+reports.dynamicBypasses.length;
const report={...reports,summary:{backlog:backlog.length,backlogTranslated:backlog.filter(e=>e.status==='translated').length,backlogIntentional:backlog.filter(e=>e.status==='intentional').length,applicationEntries:Object.keys(application).length,remainingEntries:Object.keys(remaining).length,legacyEntries:Object.keys(hi).length,unresolved,scannedFiles:filesIn(path.join(root,'client/src')).length,scope:'AST audit of JSX text, UI attributes/metadata, conditional labels, UI templates and toasts. Data-driven interface values additionally require browser verification.'}};
fs.writeFileSync(path.join(root,'docs/translation-coverage.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary,null,2));
if(unresolved){console.log(JSON.stringify({raw:reports.rawInterfaceText,keys:reports.unresolvedKeys,invalid:reports.invalidEntries,dynamic:reports.dynamicBypasses},null,2));process.exitCode=1;}
