/**
 * ZKTeco System User Creation Script
 * ==================================
 * Creates a dedicated system user for ZKTeco ADMS attendance imports.
 * This user is used as uploadedBy when attendance records are pushed from devices.
 *
 * Run this ONCE before enabling ZKTeco. Add the printed ID to your .env:
 *   ZKTECO_SYSTEM_USER_ID=<printed_id>
 *
 * Usage:
 *   node scripts/createZktecoSystemUser.js
 *
 * Requires: MONGODB_URI (or uses default mongodb://localhost:27017/hr-erp)
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const connectDB = require('../config/db');

const ZKTECO_EMAIL = 'zkteco-system@internal.hrerp';
const ZKTECO_NAME = 'ZKTeco System';
const ZKTECO_DEPARTMENT = 'System';
const ZKTECO_ROLE = 'admin';

async function main() {
    await connectDB();

    let user = await User.findOne({ email: ZKTECO_EMAIL });
    if (user) {
        console.log('\n✅ ZKTeco system user already exists.');
        console.log(`   ID: ${user._id}`);
        console.log('\n📋 Add to your .env file:');
        console.log(`   ZKTECO_SYSTEM_USER_ID=${user._id}`);
        console.log('');
        process.exit(0);
        return;
    }

    const password = require('crypto').randomBytes(32).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = await User.create({
        name: ZKTECO_NAME,
        email: ZKTECO_EMAIL,
        password: hashedPassword,
        department: ZKTECO_DEPARTMENT,
        role: ZKTECO_ROLE,
        status: 'active',
        employeeCode: null
    });

    console.log('\n✅ ZKTeco system user created successfully.');
    console.log(`   ID: ${user._id}`);
    console.log('\n📋 Add to your .env file:');
    console.log(`   ZKTECO_SYSTEM_USER_ID=${user._id}`);
    console.log('\n⚠️  This user is for system use only. Do not use for login.');
    console.log('');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
