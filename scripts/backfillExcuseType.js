/**
 * One-time: set excuseType on legacy excuse forms where missing/invalid.
 * Usage: node scripts/backfillExcuseType.js
 * Requires MONGO_URI / same env as server (dotenv optional).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Form = require('../models/Form');
const { normalizeExcuseType } = require('../utils/excuseType');

async function run() {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
        console.error('Set MONGO_URI or MONGODB_URI');
        process.exit(1);
    }
    await mongoose.connect(uri);
    const cursor = Form.find({ type: 'excuse' }).cursor();
    let updated = 0;
    for await (const doc of cursor) {
        const next = normalizeExcuseType(doc);
        if (!next) continue;
        if (doc.excuseType === next) continue;
        await Form.updateOne({ _id: doc._id }, { $set: { excuseType: next } });
        updated += 1;
    }
    console.log(`backfillExcuseType: updated ${updated} documents`);
    await mongoose.disconnect();
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
