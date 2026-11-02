// Localized presentation of server errors; raw API payloads and content remain unchanged.
import { getUiLanguage, hasUiTranslation, translateUi } from './uiLanguage.js';
const rules = [
  [/^(.+): invalid or unsafe document contents$/, 'errors.rule0'],
  [/^(.+): extension does not match a supported file's contents$/, 'errors.rule1'],
  [/^(.+): MIME type does not match file contents$/, 'errors.rule2'],
  [/^(.+): invalid PDF or unsupported active content$/, 'errors.rule3'],
  [/^(.+): only PNG, JPG, JPEG, WEBP, GIF, SVG images, PDF and Word documents are allowed$/, 'errors.rule4'],
  [/^(.+): only MP4, WEBM, MOV, M4V and OGV video files are allowed$/, 'errors.rule5'],
  [/^(.+): SVG could not be sanitized safely$/, 'errors.rule6'],
  [/^File too large \(max (.+) MB\)$/, 'errors.rule7'],
  [/^Too many failed attempts\. This account is locked for (\d+) more minute\(s\)\.$/, 'errors.rule8'],
  [/^This (?:file|video) is used in (\d+) place\(s\)\. Remove it there first, or confirm force delete\.$/, 'errors.rule9'],
  [/^Password must (.+)$/, 'errors.rule10'],
  [/^New password must (.+)$/, 'errors.rule11'],
  [/^(.+) not found$/, 'errors.rule12'],
  [/^Duplicate value: (.+)$/, 'errors.rule13'],
];
const statusCodes = new Set([400,401,403,404,409,413,423,429,500]);
export function presentApiError(error, fallback='Something went wrong') {
 const raw=error?.response?.data?.error;const payload=raw&&typeof raw==='object'?raw:{};
 const message=payload.message||error?.userMessage||error?.message||fallback;
 const language=getUiLanguage();
 if(hasUiTranslation(message))return translateUi(message);
 if(language==='en')return message.replace('अध्याय','Chapter').replace('प्रश्नावली','Exercise');
 for(const [pattern,format]of rules){const match=String(message).match(pattern);if(match)return translateUi(format, language, Object.fromEntries(match.slice(1).map((value,i)=>['v'+i,value])));}
 // Unknown server diagnostics are not leaked as English prose in Hindi UI. Keep the actionable status and field names.
 const status=error?.response?.status||error?.status||500;
 const base=translateUi('errors.status'+(statusCodes.has(status)?status:500));
 const fields=Object.keys(payload.details||error?.details||{}).filter(key=>!/^\d+$/.test(key)).slice(0,3).map(key=>{const [field,...parts]=key.split('.');return translateUi(field.charAt(0).toUpperCase()+field.slice(1))+(parts.length ? ` (${parts.join('.')})` : '');});
 return fields.length?`${base} (${fields.join(', ')})`:base;
}


export const apiErrorRules=rules;

