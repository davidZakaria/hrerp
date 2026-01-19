/**
 * Super Admin Creation Script (Production)
 * =========================================
 * This script creates the ONLY super admin account for the HR-ERP system.
 * Uses environment variables for all configuration.
 * Run this ONCE after deployment.
 * 
 * Required Environment Variables:
 *   MONGODB_URI    - MongoDB connection string
 *   ADMIN_NAME     - Super admin's full name
 *   ADMIN_EMAIL    - Super admin's email address
 *   ADMIN_PASSWORD - Super admin's password
 * 
 * Optional Environment Variables:
 *   ADMIN_DEPARTMENT - Department (defaults to "Administration")
 * 
 * Usage (Windows PowerShell):
 *   $env:MONGODB_URI="mongodb://your-server/hr-erp"
 *   $env:ADMIN_NAME="Your Name"
 *   $env:ADMIN_EMAIL="your@email.com"
 *   $env:ADMIN_PASSWORD="YourSecurePassword"
 *   node scripts/createSuperAdmin.js
 * 
 * Usage (Linux/Mac):
 *   MONGODB_URI=mongodb://your-server/hr-erp \
 *   ADMIN_NAME="Your Name" \
 *   ADMIN_EMAIL="your@email.com" \
 *   ADMIN_PASSWORD="YourSecurePassword" \
 *   node scripts/createSuperAdmin.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables from .env file (if exists)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import the User model
const User = require('../models/User');

// Validate required environment variables
function validateEnvironment() {
    const required = ['ADMIN_NAME', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error('\n❌ Missing required environment variables:');
        missing.forEach(key => console.error(`   - ${key}`));
        console.error('\n📋 Required variables:');
        console.error('   ADMIN_NAME     - Super admin\'s full name');
        console.error('   ADMIN_EMAIL    - Super admin\'s email address');
        console.error('   ADMIN_PASSWORD - Super admin\'s password');
        console.error('\n📋 Optional variables:');
        console.error('   MONGODB_URI      - MongoDB connection (default: mongodb://localhost:27017/hr-erp)');
        console.error('   ADMIN_DEPARTMENT - Department (default: Administration)');
        console.error('\n💡 Example (PowerShell):');
        console.error('   $env:ADMIN_NAME="John Doe"');
        console.error('   $env:ADMIN_EMAIL="john@example.com"');
        console.error('   $env:ADMIN_PASSWORD="SecurePass123"');
        console.error('   node scripts/createSuperAdmin.js\n');
        process.exit(1);
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(process.env.ADMIN_EMAIL)) {
        console.error('\n❌ Invalid email format:', process.env.ADMIN_EMAIL);
        process.exit(1);
    }
    
    // Validate password strength (minimum 8 characters)
    if (process.env.ADMIN_PASSWORD.length < 8) {
        console.error('\n❌ Password must be at least 8 characters long');
        process.exit(1);
    }
}

// Get configuration from environment variables
function getConfig() {
    return {
        name: process.env.ADMIN_NAME,
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        department: process.env.ADMIN_DEPARTMENT || 'Administration'
    };
}

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
        // Validate environment variables first
        validateEnvironment();
        
        const config = getConfig();
        
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
        let user = await User.findOne({ email: config.email });
        if (user) {
            // Upgrade existing user to super admin
            user.role = 'super_admin';
            user.status = 'active';
            
            // Update password with secure hash
            const salt = await bcrypt.genSalt(12);
            user.password = await bcrypt.hash(config.password, salt);
            
            await user.save();
            
            console.log('✅ Existing user upgraded to Super Admin!');
            console.log(`   Name: ${user.name}`);
            console.log(`   Email: ${user.email}`);
            console.log('\n🔒 Password has been securely updated.');
            process.exit(0);
        }

        // Create new super admin user with secure password hash
        const salt = await bcrypt.genSalt(12); // 12 rounds for extra security
        const hashedPassword = await bcrypt.hash(config.password, salt);

        user = new User({
            name: config.name,
            email: config.email,
            password: hashedPassword,
            role: 'super_admin',
            department: config.department,
            status: 'active',
            vacationDaysLeft: 21,
            excuseRequestsLeft: 2
        });

        await user.save();

        console.log('✅ Super Admin created successfully!');
        console.log('─────────────────────────────────────');
        console.log(`   Name:       ${config.name}`);
        console.log(`   Email:      ${config.email}`);
        console.log(`   Role:       super_admin`);
        console.log(`   Department: ${config.department}`);
        console.log('─────────────────────────────────────');
        console.log('\n🔒 Password is securely hashed in database.');
        console.log('\n✅ Super admin account is ready to use!\n');

        process.exit(0);
    } catch (err) {
        console.error('\n❌ Error creating super admin:', err.message);
        process.exit(1);
    }
}

// Run the script
createSuperAdmin();
