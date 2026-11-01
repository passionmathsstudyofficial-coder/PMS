import fs from 'node:fs';
import { filesIn } from './ui-sources.mjs';
const problems=[];
for(const directory of ['src/pages','src/components/content','src/components/site','src/components/home'])for(const file of filesIn(directory)){
 const source=fs.readFileSync(file,'utf8');
 if(/otherLanguage\s*\(/.test(source))problems.push({file,reason:'Secondary-language rendering is forbidden'});
 if(/\.en\s*\|\|[^\n;]{0,120}\.hi|\.hi\s*\|\|[^\n;]{0,120}\.en/.test(source))problems.push({file,reason:'Cross-language field fallback'});
}
const languageSource=fs.readFileSync('src/lib/i18n.jsx','utf8');
if(/pms-content-lang|setContent\(/.test(languageSource))problems.push({file:'src/lib/i18n.jsx',reason:'Independent public content preference'});
const report={unresolved:problems.length,problems,scope:'Public source guards against cross-language fallback, bilingual secondary headings and a second public language preference. Runtime resolver/API/browser tests verify actual selection.'};
fs.writeFileSync('../docs/language-separation-coverage.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(problems.length)process.exitCode=1;
