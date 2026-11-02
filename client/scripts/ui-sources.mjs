import fs from 'node:fs';
import path from 'node:path';
import {parse} from '@babel/parser';
import traverseModule from '@babel/traverse';
const traverse=traverseModule.default;
export const displayKeys=new Set(['label','title','description','hint','placeholder','aria-label','ariaLabel','confirmLabel','header','createLabel','emptyTitle','emptyDescription','loadingLabel','tooltip','subtitle','aria','singular','plural','group','desc','badge','alt','backLabel','reorderDisabledReason','rowLabel','emptyLabel','cell','addLabel','labelOf','sub']);
export function filesIn(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?filesIn(path.join(dir,entry.name)):/\.[jt]sx?$/.test(entry.name)?[path.join(dir,entry.name)]:[]);}
export function inspectFile(file){
 const source=fs.readFileSync(file,'utf8');const ast=parse(source,{sourceType:'module',plugins:['jsx']});const found=[];
 const add=(node,kind,text)=>{if(!text.trim()||!/[A-Za-z\u0900-\u097f]/.test(text))return;found.push({file:file.replaceAll('\\','/'),line:node.loc.start.line,start:node.start,end:node.end,kind,text:text.trim(),raw:source.slice(node.start,node.end)});};
 function output(p){if(!p||!p.node)return;if(p.isStringLiteral())add(p.node,'expression',p.node.value);else if(p.isTemplateLiteral())add(p.node,'template',p.node.quasis.map((q,i)=>q.value.cooked+(i<p.node.expressions.length?`{v${i}}`:'')).join(''));else if(p.isConditionalExpression()){output(p.get('consequent'));output(p.get('alternate'));}else if(p.isLogicalExpression())output(p.get('right'));else if(p.isArrowFunctionExpression()&&!p.get('body').isBlockStatement())output(p.get('body'));}
 traverse(ast,{
  JSXText(p){if(p.findParent(q=>q.isJSXElement()&&['code','pre','style','script'].includes(q.node.openingElement.name.name)))return;add(p.node,'jsx',p.node.value.replace(/\s+/g,' '));},
  JSXAttribute(p){if(!displayKeys.has(p.node.name.name))return;const value=p.get('value');if(value.isStringLiteral())add(value.node,'attribute',value.node.value);else if(value.isJSXExpressionContainer())output(value.get('expression'));},
  JSXExpressionContainer(p){if(p.parentPath.isJSXAttribute())return;output(p.get('expression'));},
  AssignmentPattern(p){if(displayKeys.has(p.node.left.name))output(p.get('right'));},
  VariableDeclarator(p){if(['defaultTitle','defaultHighlight','defaultSuffix','defaultDescription'].includes(p.node.id.name))output(p.get('init'));},
  ObjectProperty(p){const key=p.node.key.name||p.node.key.value;if(file.endsWith('DefaultHomeContent.jsx')&&key==='topics'&&p.get('value').isArrayExpression()){for(const item of p.get('value.elements'))output(item);return;}if((!displayKeys.has(key)&&!(file.endsWith('DefaultHomeContent.jsx')&&['q','a','titleHi','titleEn'].includes(key)))||p.findParent(q=>q.isObjectProperty()&&['en','hi','content','defaults','seo'].includes(q.node.key.name)))return;output(p.get('value'));},
  CallExpression(p){const c=p.node.callee;if(c.type==='MemberExpression'&&c.object.name==='toast')output(p.get('arguments')[0]);}
 });
 const unique=[...new Map(found.map(item=>[item.start,item])).values()];return {source,ast,found:unique};
}
