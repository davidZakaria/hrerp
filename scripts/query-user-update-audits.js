/**
 * Query Audit collection for user/backup-related events (investigation helper).
 *
 * Helps correlate manager scope loss with admin updates or backup restores.
 *
 * Usage:
 *   node scripts/query-user-update-audits.js
 *   node scripts/query-user-update-audits.js --since=2026-04-25 --limit=100
 *
 * Env:
 *   MONGODB_URI (required)
 *   AUDIT_SINCE ISO date (optional, overrides --since)
 */

const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Audit = require('../models/Audit');

function parseArgs() {
  const args = process.argv.slice(2);
  let since = process.env.AUDIT_SINCE || null;
  let limit = 100;
  for (const a of args) {
    if (a.startsWith('--since=')) since = a.slice('--since='.length);
    if (a.startsWith('--limit=')) limit = Math.min(500, Math.max(1, parseInt(a.slice('--limit='.length), 10) || 100));
  }
  return { since, limit };
}

function pickUserUpdateFields(doc) {
  const d = doc.details || {};
  const ov = doc.oldValues || {};
  const nv = doc.newValues || {};
  return {
    _id: doc._id,
    timestamp: doc.timestamp,
    performedBy: doc.performedBy,
    targetUser: doc.targetUser,
    description: doc.description,
    severity: doc.severity,
    detailsManagedDepartments: d.managedDepartments,
    detailsRole: d.role,
    oldValues: Object.keys(ov).length ? ov : undefined,
    newValues: Object.keys(nv).length ? nv : undefined
  };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  const { since, limit } = parseArgs();
  const sinceDate = since ? new Date(since) : null;
  if (since && Number.isNaN(sinceDate.getTime())) {
    console.error('Invalid --since date:', since);
    process.exit(1);
  }

  await mongoose.connect(uri);
  try {
    const timeFilter = sinceDate ? { timestamp: { $gte: sinceDate } } : {};

    const userUpdated = await Audit.find({ action: 'USER_UPDATED', ...timeFilter })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    const backups = await Audit.find({
      action: {
        $in: [
          'BACKUP_RESTORED',
          'AUTOMATED_BACKUP_COMPLETED',
          'AUTOMATED_BACKUP_FAILED',
          'BACKUP_IMPORTED'
        ]
      },
      ...timeFilter
    })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    const scopeRelated = userUpdated.filter((a) => {
      const hasMd =
        (a.details &&
          a.details.managedDepartments !== undefined &&
          Array.isArray(a.details.managedDepartments)) ||
        (a.newValues && a.newValues.managedDepartments !== undefined) ||
        (a.oldValues && a.oldValues.managedDepartments !== undefined);
      const hasRole =
        (a.newValues && a.newValues.role !== undefined) ||
        (a.oldValues && a.oldValues.role !== undefined);
      return hasMd || hasRole;
    });

    console.log(
      JSON.stringify(
        {
          note: 'Compare timestamps with SSL or deploy window. BACKUP_RESTORED + USER_UPDATED may explain manager scope loss. Verify MONGODB_URI / hosting env after changes.',
          query: { since: sinceDate ? sinceDate.toISOString() : null, userUpdatedLimit: limit },
          backupEventsSample: backups.map((b) => ({
            action: b.action,
            timestamp: b.timestamp,
            description: b.description,
            severity: b.severity,
            details: b.details
          })),
          userUpdatesScopeRelated: scopeRelated.map(pickUserUpdateFields),
          userUpdatesRecent: userUpdated.slice(0, 30).map(pickUserUpdateFields)
        },
        null,
        2
      )
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
