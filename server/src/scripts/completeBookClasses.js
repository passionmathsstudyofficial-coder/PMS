import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { Book, BookClass, ClassLevel, Chapter } from '../models/index.js';
import { ensureBookClasses } from '../services/bookClasses.js';
import { createBackup, verifyBackup } from '../services/backup.js';
import fs from 'node:fs/promises';
const apply = process.argv.includes('--apply');
try {
 await connectDB(env.MONGODB_URI);
 const mongoose = (await import('mongoose')).default;
 if (mongoose.connection.name !== 'test') throw new Error('Production migration requires the existing database named test. No changes made.');
 if (apply) {
   const backup = await createBackup({type:'manual'});
   const check = await verifyBackup(backup);
   if (!check.ok) throw new Error('Backup verification failed; migration stopped.');
   console.log(JSON.stringify({backup:backup.filename,verified:check.ok}));
   await BookClass.createIndexes();
 }
 const originalIds = new Set((await BookClass.find().select('_id').lean()).map(row=>String(row._id)));
 let books = await Book.find({category:'reference'});
 const required = [
   ['rs-aggarwal','R.S. Aggarwal'], ['rd-sharma','R.D. Sharma'],
   ['kc-sinha-maths','K.C. Sinha Mathematics'],
   ['ml-aggarwal','M.L. Aggarwal'],
 ];
 const missingBooks=[];
 for (const [slug,title] of required) {
   const existing=await Book.findOne({$or:[{slug},{'title.en':title}]});
   if (existing && existing.category !== 'reference') throw new Error(`Book ${title} needs manual relationship review.`);
   if (!existing) {
     missingBooks.push(title);
     if (apply) books.push(await Book.create({title:{en:title},slug,category:'reference',status:'published',isVisible:true}));
   }
 }
 const report=[];
 for (const book of books) {
   const before = await BookClass.find({book:book._id}).lean();
   if (apply) await ensureBookClasses(book, { createClasses: true });
   for (let number=6;number<=12;number++) {
     const cls=await ClassLevel.findOne({number}).lean();
     const entry=cls && await BookClass.findOne({book:book._id,class:cls._id}).lean();
     report.push({book:book.title.en,bookId:String(book._id),number,origin:entry && originalIds.has(String(entry._id))?'existing':'missing/new on apply',recordId:entry?String(entry._id):null,verified:!!entry,status:entry?.status||'missing',visible:entry?.isVisible,url:entry?`/reference-solutions/${book.slug}/${entry.slug}`:null,chapters:cls?await Chapter.countDocuments({book:book._id,class:cls._id}):0});
   }
 }
 const output={mode:apply?'applied':'read-only',database:mongoose.connection.name,missingBooks,rows:report};
 if (process.env.BOOK_CLASS_REPORT) await fs.writeFile(process.env.BOOK_CLASS_REPORT,JSON.stringify(output,null,2),{flag:'wx'});
 console.log(JSON.stringify(output,null,2));
} catch(error) { console.error(error.message);process.exitCode=1; } finally { await disconnectDB(); }
