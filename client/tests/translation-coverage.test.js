import assert from 'node:assert/strict';
import { test } from 'node:test';
import { translateUi, setUiLanguage, uiTemplate } from '../src/lib/uiLanguage.js';
import { presentApiError } from '../src/lib/apiErrorLanguage.js';
import { application } from '../src/lib/translations/application.js';
import { remaining } from '../src/lib/translations/remaining.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inspectFile } from '../scripts/ui-sources.mjs';

test('coverage audit catches JSX, accessibility labels, metadata, conditional text and dynamic toasts', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pms-ui-audit-'));
  const file = path.join(dir, 'Probe.jsx');
  try {
    fs.writeFileSync(file, 'const options=[{label:"Example option",hint:"Example hint"}]; function Probe(){toast.success(`Saved ${name}`);return <button aria-label="Example action">Hello {ready?"Ready":"Waiting"}</button>}');
    const candidates = inspectFile(file).found.map(item => item.text);
    for (const text of ['Example option', 'Example hint', 'Saved {v0}', 'Example action', 'Hello', 'Ready', 'Waiting']) assert.ok(candidates.includes(text), text);
  } finally { fs.unlinkSync(file); fs.rmdirSync(dir); }
});

test('reviewed interface copy has both languages and matching variables', () => {
  for (const [source, entry] of Object.entries({ ...remaining, ...application })) {
    assert.ok(entry.en.trim(), source);
    assert.ok(entry.hi.trim(), source);
    assert.doesNotMatch(entry.en, /[\u0900-\u097f]/, source);
    const slots = text => [...text.matchAll(/\{(v\d+)\}/g)].map(m => m[1]).sort();
    assert.deepEqual(slots(entry.en), slots(entry.hi), source);
  }
});
test('dynamic UI messages preserve user data and translate in either direction', () => {
  setUiLanguage('en');
  const english = uiTemplate`New ${'My Hindi नोट्स'}`;
  const hindi = translateUi(english, 'hi');
  assert.equal(hindi, 'नया My Hindi नोट्स');
  assert.equal(translateUi(hindi, 'en'), english);
  assert.equal(translateUi(' · 8 MB per file', 'hi'), ' · प्रति फ़ाइल 8 MB');
});
test('upload errors and unknown validation diagnostics have localized presentation', () => {
  setUiLanguage('hi');
  const payload = { response: { status: 400, data: { error: { message: 'report.pdf: MIME type does not match file contents' } } } };
  assert.equal(presentApiError(payload), 'report.pdf: फ़ाइल का प्रकार उसकी सामग्री से मेल नहीं खाता');
  assert.equal(payload.response.data.error.message, 'report.pdf: MIME type does not match file contents');
  assert.equal(presentApiError({ status: 400, message: 'File too large (max 8 MB)' }), 'फ़ाइल बहुत बड़ी है (अधिकतम 8 एमबी)');
  const unknown = { response: { status: 400, data: { error: { message: 'Unexpected diagnostic', details: { title: 'Unexpected rule' } } } } };
  assert.match(presentApiError(unknown), /शीर्षक/);
  assert.doesNotMatch(presentApiError(unknown), /Unexpected/);
  setUiLanguage('en');
  assert.equal(presentApiError(payload), payload.response.data.error.message);
});
test('legacy bilingual interface fragments have clean English equivalents', () => {
  assert.equal(translateUi('Class 10 · अध्याय 1', 'en'), 'Class 10 · Chapter 1');
  assert.equal(translateUi('Start Learning / सीखें', 'en'), 'Start Learning');
  assert.equal(translateUi('अध्याय (Chapter)', 'en'), 'Chapter');
  assert.equal(translateUi('Class {v0} · अध्याय {v1} · प्रश्नावली {v2}', 'en', { v0: 10, v1: 1, v2: '1.1' }), 'Class 10 · Chapter 1 · Exercise 1.1');
});

test('translated aliases remain in the selected language when shared fields translate them again', () => {
  const source = 'Auto follows the Hindi/English switch. Content is never translated.';
  const hindi = translateUi(source, 'hi');
  assert.match(hindi, /स्वचालित/);
  assert.equal(translateUi(hindi, 'hi'), hindi);
  assert.equal(translateUi(translateUi(source, 'en'), 'hi'), hindi);
});
