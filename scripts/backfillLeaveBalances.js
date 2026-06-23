/**
 * One-time backfill for 15/6 leave split migration.
 * - SystemSettings: 21 annual → 15, missing casual → 6
 * - Users: casualDaysLeft → 6 when field is missing
 * Does NOT change existing user vacationDaysLeft (HR must adjust 21→15 manually).
 *
 * Run: node scripts/backfillLeaveBalances.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');
const { invalidateSystemSettingsCache } = require('../utils/getSystemSettings');

async function main() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGO_URI or MONGODB_URI required');
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const settings = await SystemSettings.getOrCreate();
    const beforeAnnual = settings.annualVacationDays;
    const beforeCasual = settings.casualVacationDays;
    const migrated = SystemSettings.applyLeaveQuotaMigration(settings);
    if (migrated) {
        await settings.save();
        invalidateSystemSettingsCache();
        console.log(
            `SystemSettings: updated quotas (annual ${beforeAnnual} → ${settings.annualVacationDays}, casual ${beforeCasual ?? 'missing'} → ${settings.casualVacationDays})`
        );
    } else {
        console.log(`SystemSettings: already at annual=${settings.annualVacationDays}, casual=${settings.casualVacationDays}`);
    }

    const userResult = await User.updateMany(
        { casualDaysLeft: { $exists: false } },
        { $set: { casualDaysLeft: 6 } }
    );
    console.log(`Users: backfilled casualDaysLeft for ${userResult.modifiedCount} user(s)`);

    const missingCount = await User.countDocuments({ casualDaysLeft: { $exists: false } });
    console.log(`Users still missing casualDaysLeft: ${missingCount}`);
    console.log('Note: user vacationDaysLeft was NOT modified. Adjust per employee via Super Admin if HR approves 21→15.');

    await mongoose.disconnect();
    console.log('Done.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
