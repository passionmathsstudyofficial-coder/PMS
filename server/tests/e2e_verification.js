// API end-to-end workflows use disposable fixtures. Never connect this runner to production.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const uri = process.env.TEST_MONGODB_URI || '';
const database = uri.split('?')[0].split('/').at(-1);
if (!database || !/^pms_(?:test|audit|e2e)[_a-z0-9-]*$/i.test(database)) {
  console.error('Set TEST_MONGODB_URI to an explicitly named disposable pms_test/pms_audit/pms_e2e database.');
  process.exit(1);
}
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', 'tests/auth.test.js', 'tests/audit.test.js', 'tests/content.test.js', 'tests/documents.test.js', 'tests/language.test.js'], { cwd: fileURLToPath(new URL('..', import.meta.url)), env: process.env, stdio: 'inherit' });
process.exit(result.status ?? 1);
