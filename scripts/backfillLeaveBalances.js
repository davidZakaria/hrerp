/**
 * One-time backfill for 15/6 leave split migration.
 * - Sets casualDaysLeft: 6 for users missing the field
 * - Sets casualVacationDays: 6 on SystemSettings if missing
 * Does NOT change existing vacationDaysLeft (HR must adjust 21→15 manually).
 *
 * Run: node scripts/backfillLeaveBalances.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');

async function main() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGO_URI or MONGODB_URI required');
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const settings = await SystemSettings.getOrCreate();
    if (settings.casualVacationDays == null) {
        settings.casualVacationDays = 6;
        await settings.save();
        console.log('SystemSettings: set casualVacationDays = 6');
    } else {
        console.log(`SystemSettings: casualVacationDays already ${settings.casualVacationDays}`);
    }

    const userResult = await User.updateMany(
        { casualDaysLeft: { $exists: false } },
        { $set: { casualDaysLeft: 6 } }
    );
    console.log(`Users: backfilled casualDaysLeft for ${userResult.modifiedCount} user(s)`);

    const missingCount = await User.countDocuments({ casualDaysLeft: { $exists: false } });
    console.log(`Users still missing casualDaysLeft: ${missingCount}`);
    console.log('Note: vacationDaysLeft was NOT modified. Update annual balances via Super Admin if HR approves 21→15.');

    await mongoose.disconnect();
    console.log('Done.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
