/**
 * Fix leave balances after 15/6 quota migration.
 * - Cap vacationDaysLeft at 15 when above 15
 * - Set casualDaysLeft to 6 for every user
 *
 * Run from repo root: node scripts/fix-leave-balances.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGO_URI or MONGODB_URI required in .env');
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const overAnnualBefore = await User.countDocuments({ vacationDaysLeft: { $gt: 15 } });
    console.log(`Users with vacationDaysLeft > 15: ${overAnnualBefore}`);

    const capResult = await User.updateMany(
        { vacationDaysLeft: { $gt: 15 } },
        { $set: { vacationDaysLeft: 15 } }
    );
    console.log(`Capped vacationDaysLeft to 15 for ${capResult.modifiedCount} user(s)`);

    const casualResult = await User.updateMany(
        {},
        { $set: { casualDaysLeft: 6 } }
    );
    console.log(`Set casualDaysLeft to 6 for ${casualResult.modifiedCount} user(s)`);

    const stillOver = await User.countDocuments({ vacationDaysLeft: { $gt: 15 } });
    const notSixCasual = await User.countDocuments({ casualDaysLeft: { $ne: 6 } });
    console.log(`Remaining vacationDaysLeft > 15: ${stillOver}`);
    console.log(`Remaining casualDaysLeft != 6: ${notSixCasual}`);

    await mongoose.disconnect();
    console.log('Done.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
