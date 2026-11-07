import assert from 'node:assert/strict';
import {test} from 'node:test';
import {bookCoverUrl} from '../src/lib/media.js';
import {permittedImageUrl} from '../../shared/mediaPolicy.js';

test('uploaded book covers take precedence over legacy external URLs',()=>{
 assert.equal(bookCoverUrl({coverImage:{url:'/uploads/current-cover.png'},coverUrl:'https://ncert.nic.in/textbook/pdf/jemh1cc.jpg'}),'/uploads/current-cover.png');
 assert.equal(bookCoverUrl({coverImage:{url:'https://res.cloudinary.com/pms/image/upload/v2/cover.png'},coverUrl:'/uploads/old.png'}),'https://res.cloudinary.com/pms/image/upload/v2/cover.png');
});
test('unsupported or unsafe covers use the existing placeholder without making blocked image requests',()=>{
 for(const coverUrl of ['https://ncert.nic.in/textbook/pdf/jemh1cc.jpg','https://images-na.ssl-images-amazon.com/cover.jpg','javascript:alert(1)','//external.example/cover.jpg','/\\external.example/cover.jpg','https://user:password@passionmathstudy.in/cover.png'])assert.equal(bookCoverUrl({coverUrl},'https://passionmathstudy.in'),'');
 assert.equal(bookCoverUrl({coverUrl:'https://passionmathstudy.in/uploads/cover.png'},'https://passionmathstudy.in'),'https://passionmathstudy.in/uploads/cover.png');
 assert.equal(permittedImageUrl('https://res.cloudinary.com.evil.example/image.png'),'');
});
