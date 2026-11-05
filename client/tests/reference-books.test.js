import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getReferenceBooks, referenceBookUrl } from '../src/lib/referenceBooks.js';

test('footer and navbar share live reference books, titles and canonical routes', () => {
  const books = ['rs-aggarwal','rd-sharma','ml-aggarwal','kc-sinha','mathematics-for-class-10-by-r-d-sharma'].map(slug => ({slug, title:{en:slug},availableClasses:[10]}));
  const result = getReferenceBooks({referenceBooks:[...books, {...books[0],title:{en:'Updated title'}}, {slug:'private',isVisible:false}]});
  assert.equal(result.length,5);
  assert.equal(result[0].title.en,'Updated title');
  assert.deepEqual(result.map(referenceBookUrl),books.map(book=>`/reference-solutions/${book.slug}`));
  assert.deepEqual(result[4].availableClasses,[10]);
});

test('explicit empty reference list never restores hidden books', () => {
  assert.deepEqual(getReferenceBooks({referenceBooks:[]}),[]);
  assert.equal(getReferenceBooks({}).length,4);
});
