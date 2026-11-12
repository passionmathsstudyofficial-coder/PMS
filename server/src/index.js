import { env } from './config/env.js';
import { createReadinessServer } from './services/httpStartup.js';

const { server, markReady, markFailed } = createReadinessServer();
let backupTask, disconnectDB;
// Hostinger requires listen() promptly. Heavy imports and database initialization follow it.
server.listen(env.PORT, env.HOST, () => {
  console.log('[api] HTTP listener bound; initializing application');
});
server.on('error', error => { console.error('[api] listener failed', error); process.exit(1); });

const shutdown = signal => {
  console.log(`[api] ${signal} received, shutting down…`);
  backupTask?.stop();
  server.close(async () => { await disconnectDB?.(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function main() {
  const [database, { createApp }, models, { scheduleBackups }] = await Promise.all([
    import('./config/db.js'), import('./app.js'), import('./models/index.js'), import('./services/backup.js'),
  ]);
  const { connectDB } = database;
  disconnectDB = database.disconnectDB;
  const { SiteSettings, ensureDefaultSessions, ensureDefaultLandingPages, ensureDefaultHomepageSections, ensureDefaultHeaderFooter, initializeStudyCms } = models;
  await connectDB(env.MONGODB_URI);
  await SiteSettings.getSingleton();
  await ensureDefaultSessions();
  await initializeStudyCms();
  await ensureDefaultLandingPages();
  await ensureDefaultHomepageSections();
  await ensureDefaultHeaderFooter();
  console.log(`[db] connected (${env.MONGODB_URI.replace(/\/\/[^@]*@/, '//***@')})`);

  const app = createApp();
  backupTask = scheduleBackups();
  markReady(app);
  console.log(`[api] Passion Maths Study API ready on http://${env.HOST}:${env.PORT} (${env.NODE_ENV})`);
  console.log(`[media] storage provider: ${env.storageProvider}`);
}

main().catch((err) => {
  markFailed(err);
  console.error('[api] failed to start', err);
  server.close(async () => { await disconnectDB?.(); process.exit(1); });
  setTimeout(() => process.exit(1), 2_000).unref();
});
