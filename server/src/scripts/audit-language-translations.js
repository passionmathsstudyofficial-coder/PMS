// Read-only editorial inventory. Does not migrate, translate, save or delete records.
import mongoose from 'mongoose';
import {env} from '../config/env.js';
import {isLocalized,translationStatus} from '../../../shared/localization.js';
import * as models from '../models/index.js';
const names=['ClassLevel','Subject','Chapter','Exercise','Question','Solution','Note','Topic','Resource','Book','ImportantQuestion','Page','Section','Announcement','Navigation','SeoSetting','SiteSettings'];
const report={records:0,localizedFields:0,missing:{en:0,hi:0},unassignedLegacy:0,examples:[]};
function inspect(value,path,record){
 if(Array.isArray(value)){value.forEach((item,index)=>inspect(item,`${path}[${index}]`,record));return;}
 if(!value||typeof value!=='object')return;
 if(isLocalized(value)){
  if(!Object.values(value).some(item=>typeof item==='string'&&item.trim()))return;
  report.localizedFields++;const status=translationStatus(value);
  for(const language of ['en','hi'])if(!status[language]){report.missing[language]++;if(report.examples.length<100)report.examples.push({record,path,language});}
  if(value.mixed?.trim())report.unassignedLegacy++;return;
 }
 for(const [key,item]of Object.entries(value))if(!['searchText','__v'].includes(key))inspect(item,path?`${path}.${key}`:key,record);
}
try{
 await mongoose.connect(env.MONGODB_URI,{serverSelectionTimeoutMS:10000});
 for(const name of names){const Model=models[name];if(!Model?.find)continue;for await(const doc of Model.find().lean().cursor()){report.records++;inspect(doc,'',`${name}:${doc._id}`);}}
 console.log(JSON.stringify(report,null,2));
}finally{await mongoose.disconnect();}
