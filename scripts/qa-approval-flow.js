/**
 * QA smoke test for 1-step approval (requires local MongoDB + running server on PORT).
 * Usage: node scripts/qa-approval-flow.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Form = require('../models/Form');

async function main() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hr-erp');

    const employee = await User.findOne({ role: 'employee', status: 'active' });
    const manager = await User.findOne({ role: 'manager', status: 'active' });

    console.log('Employee:', employee?.email, 'balance:', employee?.vacationDaysLeft);
    console.log('Manager:', manager?.email);

    const legacy = await Form.countDocuments({
        status: { $in: ['manager_approved', 'manager_rejected', 'manager_submitted'] }
    });
    console.log('Legacy status forms:', legacy, legacy === 0 ? 'OK' : 'RUN MIGRATION');

    const enumOk = ['pending', 'approved', 'rejected'];
    const bad = await Form.find({ status: { $nin: enumOk } }).limit(5).select('status');
    console.log('Non-enum statuses:', bad.length ? bad : 'none OK');

    const schemaPaths = Form.schema.path('status').enumValues;
    console.log('Form.status enum:', schemaPaths.join(', '));

    await mongoose.disconnect();
    console.log('QA smoke checks complete');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
