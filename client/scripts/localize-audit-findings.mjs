// One-time source migration: wrap only the AST-identified display strings.
import fs from 'node:fs';
import path from 'node:path';
import traverseModule from '@babel/traverse';
import { inspectFile } from './ui-sources.mjs';
const traverse=traverseModule.default;
const root=path.resolve('..');
const report=JSON.parse(fs.readFileSync(path.join(root,'docs/translation-coverage.json'),'utf8'));
const files=[...new Set(report.rawInterfaceText.map(item=>item.file))];
const exceptions=JSON.parse(fs.readFileSync('src/lib/translations/exceptions.json','utf8'));
function jsxText(raw) {
 const lines=raw.split(/\r\n|\n|\r/);let last=0;
 lines.forEach((line,index)=>{if(/[^ \t]/.test(line))last=index;});
 return lines.map((line,index)=>{let text=line.replace(/\t/g,' ');if(index!==0)text=text.replace(/^ +/,'');if(index!==lines.length-1)text=text.replace(/ +$/,'');return text&&index!==last?text+' ':text;}).join('');
}
let changed=0;
for(const relative of files){
 const file=path.join(root,relative);const {source,ast,found}=inspectFile(file);
 const wanted=found.filter(item=>!exceptions[item.text]);const replacements=[];const needed=new Set();const moduleProperties=new Map();let bindings;
 traverse(ast,{
  Program(p){bindings=p.scope.bindings;},
  ObjectProperty(p){if(p.findParent(parent=>parent.isFunction()))return;moduleProperties.set(p.node.value.start,p.node);},
 });
 for(const item of wanted){
  const raw=source.slice(item.start,item.end);const template=item.kind==='template';const fn=template?'uiTemplate':'uiText';needed.add(fn);
  let value=template?`${fn}${raw}`:`${fn}(${item.kind==='jsx'?JSON.stringify(jsxText(raw)):raw})`;
  let start=item.start,end=item.end;
  const property=moduleProperties.get(start);
  if(property){start=property.start;end=property.end;value=`get ${source.slice(property.key.start,property.key.end)}() { return ${value}; }`;}
  else if(item.kind==='jsx'||item.kind==='attribute')value=`{${value}}`;
  replacements.push({start,end,value});
 }
 if(!replacements.length)continue;
 let result=source;for(const item of replacements.sort((a,b)=>b.start-a.start)){result=result.slice(0,item.start)+item.value+result.slice(item.end);}
 const imports=[...needed].filter(name=>!bindings[name]);if(imports.length)result=`import { ${imports.join(', ')} } from '@/lib/uiLanguage.js';\n`+result;
 fs.writeFileSync(file,result);changed+=replacements.length;
}
console.log(JSON.stringify({files:files.length,wrapped:changed}));
