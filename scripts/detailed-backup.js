#!/usr/bin/env node
/**
 * Detailed backup: full DB + files backup plus change-report.md/json
 * showing git/file changes and data deltas vs the previous backup.
 *
 * Usage:
 *   node scripts/detailed-backup.js
 *   node scripts/detailed-backup.js --encrypt
 *   node scripts/detailed-backup.js --report-only   # skip mongodump, report only
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const fs = require('fs');
const { createBackup, BACKUP_CONFIG } = require('../utils/backup');
const { generateChangeReport } = require('../utils/changeReport');

async function main() {
  const args = process.argv.slice(2);
  const encrypt = args.includes('--encrypt');
  const reportOnly = args.includes('--report-only');

  console.log('\n' + '='.repeat(60));
  console.log('HR-ERP DETAILED BACKUP + CHANGE REPORT');
  console.log('='.repeat(60));

  let backupId;
  let backupPath;
  const { getPreviousBackupBaseline } = require('../utils/changeReport');
  const baselineBeforeBackup = getPreviousBackupBaseline();

  if (reportOnly) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    backupId = `report-only-${stamp}`;
    backupPath = path.join(BACKUP_CONFIG.backupDir, backupId);
    fs.mkdirSync(backupPath, { recursive: true });
    console.log('Mode: report-only (no database/files dump)\n');
  } else {
    const result = await createBackup({
      encryptionKey: encrypt ? process.env.BACKUP_ENCRYPTION_KEY : null,
      performedBy: 'CLI-detailed-backup'
    });

    if (!result.success) {
      console.error('Backup failed:', result.error);
      process.exit(1);
    }

    backupId = result.backupId;
    backupPath = result.path;
  }

  console.log('\nGenerating detailed change report...');
  const changeResult = await generateChangeReport(backupId, backupPath, {
    baseline: baselineBeforeBackup
  });

  // Attach to manifest when full backup was taken
  const manifestPath = path.join(backupPath, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.changeReport = {
      json: 'change-report.json',
      markdown: 'change-report.md',
      generatedAt: changeResult.report.generatedAt
    };
    manifest.git = changeResult.gitForManifest;
    manifest.dataSnapshot = changeResult.dataSnapshotForManifest;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  } else if (reportOnly) {
    fs.writeFileSync(
      path.join(backupPath, 'manifest.json'),
      JSON.stringify({
        backupId,
        createdAt: new Date().toISOString(),
        reportOnly: true,
        changeReport: {
          json: 'change-report.json',
          markdown: 'change-report.md',
          generatedAt: changeResult.report.generatedAt
        },
        git: changeResult.gitForManifest,
        dataSnapshot: changeResult.dataSnapshotForManifest
      }, null, 2)
    );
  }

  console.log('\n' + '='.repeat(60));
  console.log('DETAILED BACKUP COMPLETE');
  console.log('='.repeat(60));
  console.log(`Backup folder: ${backupPath}`);
  console.log(`Change report: ${changeResult.mdPath}`);
  console.log(`JSON report:   ${changeResult.jsonPath}`);
  console.log('');

  const summary = changeResult.report;
  console.log('Summary:');
  console.log(`  Git commit: ${summary.git.shortCommit} (${summary.git.branch})`);
  if (summary.previousBackup) {
    console.log(`  Since backup: ${summary.previousBackup.id}`);
    console.log(`  New commits: ${summary.gitChanges?.commitCount ?? 0}`);
    console.log(`  Files changed: ${summary.gitChanges.filesChanged.length}`);
  }
  if (summary.dataSnapshot?.collectionCounts) {
    console.log(`  DB collections: ${Object.keys(summary.dataSnapshot.collectionCounts).length}`);
    console.log(`  Negative vacation users: ${(summary.dataSnapshot.negativeVacationUsers || []).length}`);
  }
  if (summary.git.uncommitted.count) {
    console.log(`  ⚠ Uncommitted files: ${summary.git.uncommitted.count}`);
  }
  console.log('='.repeat(60) + '\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Detailed backup failed:', err);
  process.exit(1);
});
