import test from 'node:test';
import assert from 'node:assert/strict';
import { activeNavigationItem, isPathActive } from '../src/lib/navigationActive.js';
import { navigationChildren, studyNavigationItem } from '../src/lib/studyNavigation.js';

test('study menu destinations select exactly one item across all menus', () => {
  const menus = ['Important Questions', 'Notes'].map(en => studyNavigationItem({ label: { en } }).children);
  const items = menus.flat();
  assert.equal(new Set(items.map(item => item.url)).size, items.length);
  assert.equal(new Set(items.map(item => item._id)).size, items.length);
  for (const item of items) {
    assert.equal(items.filter(candidate => isPathActive(candidate.url, item.url)).length, 1);
    assert.equal(activeNavigationItem(items, item.url), item);
  }
  assert.equal(activeNavigationItem(items, '/'), undefined);
});

test('route matching respects boundaries, query, anchors and deepest destination', () => {
  const items = [{ url: '/maths' }, { url: '/maths/notes' }, { url: '/maths/notes' }];
  assert.equal(activeNavigationItem(items, '/maths/notes/chapter-1'), items[1]);
  assert.equal(isPathActive('/maths', '/maths-extra'), false);
  assert.equal(isPathActive('/#classes', '/'), false);
  assert.equal(isPathActive('/notes', '/notes?view=formulas'), false);
  assert.equal(isPathActive('/notes/', '/notes'), true);
});

test('empty CMS Mathematics dropdown resolves the same seven classes as desktop', () => {
  const item = { type: 'classes', label: { en: 'Mathematics' }, children: [] };
  assert.deepEqual(navigationChildren(item).map(child => child.url), [12,11,10,9,8,7,6].map(number => `/class-${number}/maths`));
  const configured = [{ url: '/custom-maths', label: { en: 'Custom Maths' } }];
  assert.deepEqual(navigationChildren({ ...item, children: configured }), configured);
  assert.deepEqual(navigationChildren({ ...item, children: [{ ...configured[0], isVisible: false }] }), []);
  assert.deepEqual(navigationChildren(item, [{ number: 6 }, { number: 12, url: '/custom-12' }]).map(child => child.url), ['/custom-12', '/class-6/maths']);
});

test('study normalization preserves additional configured categories and hidden choices', () => {
  const item = studyNavigationItem({ label: { en: 'Notes' }, children: [{ label: { en: 'NCERT Chapter-wise Notes' }, isVisible: false }, { label: { en: 'Custom Notes' }, url: '/custom-notes' }] });
  assert.equal(item.children[0].isVisible, false);
  assert.equal(item.children.at(-1).url, '/custom-notes');
});

test('shared resolver retains desktop fallbacks for other configured notes menus', () => {
  assert.equal(navigationChildren({ label: { en: 'Revision Notes' }, type: 'dropdown' })[0].url, '/class-12/maths/notes');
});
