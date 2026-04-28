/**
 * Sample all managers in MongoDB with managedDepartments and recent
 * modificationHistory entries (role / managedDepartments changes).
 *
 * Use on production (read-only): set MONGODB_URI in .env or env.
 *
 * Usage:
 *   node scripts/inspect-manager-departments.js
 */

const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');

const RELEVANT_FIELDS = new Set(['role', 'managedDepartments']);

function filterHistory(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((e) => e && RELEVANT_FIELDS.has(e.field))
    .map((e) => ({
      field: e.field,
      oldValue: e.oldValue,
      newValue: e.newValue,
      modifiedAt: e.modifiedAt,
      modifiedBy: e.modifiedBy,
      reason: e.reason || null
    }));
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Add it to .env or the environment.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  try {
    const managers = await User.find({ role: 'manager' })
      .select('name email department managedDepartments modificationHistory status')
      .sort({ email: 1 })
      .lean();

    const report = managers.map((m) => {
      const hist = m.modificationHistory || [];
      const lastFive = hist.slice(-5);
      return {
        _id: m._id,
        name: m.name,
        email: m.email,
        status: m.status,
        department: m.department,
        managedDepartments: m.managedDepartments || [],
        managedDepartmentsCount: (m.managedDepartments || []).length,
        recentRelevantHistory: filterHistory(lastFive),
        lastFiveRawHistoryFields: lastFive.map((e) => e && e.field).filter(Boolean)
      };
    });

    const suspicious = report.filter(
      (r) => r.managedDepartmentsCount === 0 || r.status !== 'active'
    );

    console.log(JSON.stringify({ summary: { managerCount: report.length, suspiciousCount: suspicious.length }, managers: report, suspicious }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
