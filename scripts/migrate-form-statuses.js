/**
 * One-time migration: legacy 2-step statuses → 1-step statuses.
 * Usage: node scripts/migrate-form-statuses.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Form = require('../models/Form');

async function main() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-erp';
    await mongoose.connect(uri);
    console.log('Connected for migration');

    const r1 = await Form.updateMany(
        { status: 'manager_approved' },
        { $set: { status: 'approved' } }
    );
    console.log('manager_approved → approved:', r1.modifiedCount);

    const r2 = await Form.updateMany(
        { status: 'manager_rejected' },
        { $set: { status: 'rejected' } }
    );
    console.log('manager_rejected → rejected:', r2.modifiedCount);

    const r3 = await Form.updateMany(
        { status: 'manager_submitted' },
        { $set: { status: 'pending' } }
    );
    console.log('manager_submitted → pending:', r3.modifiedCount);

    await mongoose.disconnect();
    console.log('Migration complete.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
