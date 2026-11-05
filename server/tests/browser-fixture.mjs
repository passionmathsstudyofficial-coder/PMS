// Disposable local fixture for manual browser verification of the built application.
// Never loads server/.env or connects to Atlas. Stop with Ctrl+C to remove the fixture database.
import path from 'node:path';
delete process.env.TEST_MONGODB_URI;
const { startServer, stopServer, createAdmin, login } = await import('./helpers.js');
const { app: setupApp } = await startServer();
const { env } = await import('../src/config/env.js');
env.CLIENT_DIST_DIR = path.resolve(import.meta.dirname, '../..', 'client/dist');
env.clientOrigins = ['http://127.0.0.1:5055'];
const { createApp } = await import('../src/app.js');
await createAdmin({ email: 'browser-audit@test.local', name: 'Browser Audit Owner' });
await createAdmin({ email: 'browser-editor@test.local', name: 'Browser Audit Editor', role: 'editor' });
const owner = await login(setupApp, 'browser-audit@test.local');
const title = { en: 'Browser audit lesson', hi: 'ब्राउज़र जाँच पाठ' };
const create = async (resource, data) => {
  const result = await owner.post(`/api/${resource}`).send(data);
  if (result.status !== 201) throw new Error(`${resource}: ${JSON.stringify(result.body)}`);
  return result.body;
};
const subject = await create('subjects', { name: { en: 'Mathematics', hi: 'गणित' }, slug: 'maths', isPublic: true, status: 'published' });
const cls = await create('classes', { number: 10, name: title, subjects: [subject._id], status: 'published' });
const chapter = await create('chapters', { class: cls._id, subject: subject._id, number: 1, title, status: 'published' });
const exercise = await create('exercises', { chapter: chapter._id, number: '1.1', title, status: 'published' });
await create('questions', { exercise: exercise._id, number: '1', text: { en: '<p>Solve $x+2=5$.</p>', hi: '<p>$x+2=5$ हल करें।</p>' }, status: 'published', solution: { blocks: [{ type: 'formula', latex: 'x=3' }] } });
for (const [resource, data] of Object.entries({
  topics: { class: cls._id, subject: subject._id, chapter: chapter._id, number: 1, title, slug: 'audit-topic' },
  notes: { class: cls._id, subject: subject._id, title, content: title, slug: 'audit-note' },
  'important-questions': { class: cls._id, subject: subject._id, text: title, slug: 'audit-important' },
  resources: { class: cls._id, subject: subject._id, title, fileUrl: 'https://example.com/audit.pdf' },
  books: { title, author: 'Audit Author', slug: 'audit-book', category: 'reference' },
  pages: { title, content: { en: '<p>Original browser audit page content.</p>', hi: '<p>मूल जाँच सामग्री।</p>' }, slug: 'browser-audit-page' },
  sections: { name: 'Browser audit section', type: 'text', title, content: title, page: 'home' },
  announcements: { text: title, badge: title },
  templates: { name: 'Browser audit template', kind: 'solution', blocks: [{ type: 'formula', latex: 'x=3' }] },
  videos: { provider: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title },
})) await create(resource, { ...data, status: 'published' });
await owner.put('/api/site-settings').send({ brand: { name: { en: 'Passion Maths Study', hi: 'पैशन मैथ्स स्टडी' } } });
const server = createApp().listen(5055, '127.0.0.1', () => console.log('Disposable browser fixture: http://127.0.0.1:5055/pms-control-room'));
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  server.closeAllConnections();
  server.close();
  await stopServer();
}
process.on('SIGINT', () => stop().then(() => process.exit(0)));
process.on('SIGTERM', () => stop().then(() => process.exit(0)));
