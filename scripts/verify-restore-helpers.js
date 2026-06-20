/**
 * Sanity checks for restore helpers.
 * Run: node scripts/verify-restore-helpers.js
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  detectDatabaseBackupFormat,
  evaluateRestoreSuccess
} = require('../utils/restore');

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    passed += 1;
    console.log(`  OK: ${label}`);
  } else {
    failed += 1;
    console.error(`  FAIL: ${label}`);
  }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-restore-test-'));

const jsonDb = path.join(tmp, 'json-db');
fs.mkdirSync(jsonDb);
fs.writeFileSync(path.join(jsonDb, 'users.json'), '[]');
assert('detect JSON backup', detectDatabaseBackupFormat(jsonDb) === 'json');

const dumpDb = path.join(tmp, 'dump-db', 'hr-erp');
fs.mkdirSync(dumpDb, { recursive: true });
fs.writeFileSync(path.join(dumpDb, 'users.bson.gz'), Buffer.from('x'));
assert('detect mongodump backup', detectDatabaseBackupFormat(path.join(tmp, 'dump-db')) === 'mongodump');

assert('database restore success', evaluateRestoreSuccess({ database: { success: true } }, 'database'));
assert('database restore failure', !evaluateRestoreSuccess({ database: { success: false } }, 'database'));
assert('full requires db+files', evaluateRestoreSuccess({
  database: { success: true },
  files: { success: true }
}, 'full'));
assert('full fails if files fail', !evaluateRestoreSuccess({
  database: { success: true },
  files: { success: false }
}, 'full'));

console.log(`\nResults: ${passed} passed, ${failed} failed`);
try {
  fs.rmSync(tmp, { recursive: true, force: true });
} catch (_) {}

process.exit(failed > 0 ? 1 : 0);
