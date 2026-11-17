import { createAdmin, login, startServer, stopServer } from './helpers.js';
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { env } from '../src/config/env.js';
import { createApp } from '../src/app.js';
import { Page } from '../src/models/index.js';

let app, owner, directory;
before(async () => {
  await startServer();
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pms-preview-html-'));
  fs.writeFileSync(path.join(directory, 'index.html'), '<html lang="en"><head><!--app-head--></head><body><div id="root"></div></body></html>');
  env.CLIENT_DIST_DIR = directory;
  app = createApp();
  await createAdmin({ email: 'preview-html@test.local' });
  owner = await login(app, 'preview-html@test.local');
});
after(async () => {
  await stopServer();
  fs.rmSync(directory, { recursive: true, force: true });
});

test('authenticated draft HTML supports direct navigation and refresh without public cache leakage', async () => {
  await Page.create({ slug: 'private-preview', title: { en: 'Draft', hi: 'मसौदा' }, status: 'draft' });
  for (let refresh = 0; refresh < 2; refresh++) {
    const response = await owner.get('/private-preview?preview=1&lang=hi');
    assert.equal(response.status, 200);
    assert.match(response.headers['cache-control'], /no-store/);
    assert.match(response.headers['x-robots-tag'], /noindex/);
    assert.match(response.text, /lang="hi"/);
  }
  assert.equal((await request(app).get('/private-preview?preview=1')).status, 404);
  assert.equal((await owner.get('/private-preview')).status, 404);
  assert.equal((await Page.findOne({ slug: 'private-preview' })).status, 'draft');
});
