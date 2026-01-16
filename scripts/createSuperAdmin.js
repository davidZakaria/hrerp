/**
 * Super Admin Creation Script (Production)
 * =========================================
 * This script creates the ONLY super admin account for the HR-ERP system.
 * Uses environment variables for MongoDB connection.
 * Run this ONCE after deployment.
 * 
 * Usage: node scripts/createSuperAdmin.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import the User model
const User = require('../models/User');

// Super Admin Credentials
const SUPER_ADMIN_CONFIG = {
    name: 'David Sami',
    email: 'davidsamii97@gmail.com',
    department: 'Administration'
};

// Connect to MongoDB
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-erp';
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB Connected');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    }
};

async function createSuperAdmin() {
    try {
        await connectDB();

        console.log('\n🔐 Super Admin Creation Script (Production)');
        console.log('=============================================\n');

        // SECURITY CHECK 1: Check if ANY super admin already exists
        const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
        if (existingSuperAdmin) {
            console.log('⚠️  A super admin account already exists!');
            console.log(`   Email: ${existingSuperAdmin.email}`);
            console.log('\n❌ Only ONE super admin is allowed in the system.');
            console.log('   If you need to reset, contact database administrator.\n');
            process.exit(0);
        }

        // SECURITY CHECK 2: Check if user with this email exists
        let user = await User.findOne({ email: SUPER_ADMIN_CONFIG.email });
        if (user) {
            // Upgrade existing user to super admin
            user.role = 'super_admin';
            user.status = 'active';
            
            // Update password with secure hash
            const salt = await bcrypt.genSalt(12);
            user.password = await bcrypt.hash('David01858971234M$.P@$$w0rd824600', salt);
            
            await user.save();
            
            console.log('✅ Existing user upgraded to Super Admin!');
            console.log(`   Name: ${user.name}`);
            console.log(`   Email: ${user.email}`);
            console.log('\n🔒 Password has been securely updated.');
            console.log('\n⚠️  IMPORTANT: Delete this script after deployment!\n');
            process.exit(0);
        }

        // Create new super admin user with secure password hash
        const salt = await bcrypt.genSalt(12); // 12 rounds for extra security
        const hashedPassword = await bcrypt.hash('David01858971234M$.P@$$w0rd824600', salt);

        user = new User({
            name: SUPER_ADMIN_CONFIG.name,
            email: SUPER_ADMIN_CONFIG.email,
            password: hashedPassword,
            role: 'super_admin',
            department: SUPER_ADMIN_CONFIG.department,
            status: 'active',
            vacationDaysLeft: 21,
            excuseRequestsLeft: 2
        });

        await user.save();

        console.log('✅ Super Admin created successfully!');
        console.log('─────────────────────────────────────');
        console.log(`   Name:       ${SUPER_ADMIN_CONFIG.name}`);
        console.log(`   Email:      ${SUPER_ADMIN_CONFIG.email}`);
        console.log(`   Role:       super_admin`);
        console.log(`   Department: ${SUPER_ADMIN_CONFIG.department}`);
        console.log('─────────────────────────────────────');
        console.log('\n🔒 Password is securely hashed in database.');
        console.log('\n⚠️  SECURITY REMINDERS:');
        console.log('   1. DELETE this script after running it');
        console.log('   2. Never share your credentials');
        console.log('   3. Change password from the dashboard if needed\n');

        process.exit(0);
    } catch (err) {
        console.error('\n❌ Error creating super admin:', err.message);
        process.exit(1);
    }
}

// Run the script
createSuperAdmin();
