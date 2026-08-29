/**
 * Pre-deploy: count legacy form statuses in MongoDB.
 * Usage: node scripts/check-form-statuses.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Form = require('../models/Form');

const LEGACY = ['manager_approved', 'manager_rejected', 'manager_submitted'];

async function main() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-erp';
    await mongoose.connect(uri);
    console.log('Connected:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

    const rows = await Form.aggregate([
        { $match: { status: { $in: LEGACY } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]);

    if (rows.length === 0) {
        console.log('\nOK: No legacy statuses found. Safe to deploy enum change.');
    } else {
        console.log('\nLegacy status counts (run migrate-form-statuses.js before deploy):');
        rows.forEach((r) => console.log(`  ${r._id}: ${r.count}`));
        const total = rows.reduce((s, r) => s + r.count, 0);
        console.log(`  TOTAL: ${total}`);
    }

    const allStatuses = await Form.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]);
    console.log('\nAll form statuses:');
    allStatuses.forEach((r) => console.log(`  ${r._id}: ${r.count}`));

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
