/**
 * One-time migration: rename department "Service" → "Administration"
 * and update managedDepartments arrays that reference "Service".
 *
 * Usage: node scripts/rename-service-department.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const User = require('../models/User');

async function main() {
    await connectDB();

    const deptResult = await User.updateMany(
        { department: 'Service' },
        { $set: { department: 'Administration' } }
    );

    const managedResult = await User.updateMany(
        { managedDepartments: 'Service' },
        { $set: { 'managedDepartments.$[elem]': 'Administration' } },
        { arrayFilters: [{ elem: 'Service' }] }
    );

    console.log(`Updated ${deptResult.modifiedCount} user(s) department Service → Administration`);
    console.log(`Updated ${managedResult.modifiedCount} user(s) managedDepartments Service → Administration`);
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
