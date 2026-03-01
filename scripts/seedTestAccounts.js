/**
 * Seed Test Accounts for Local Development
 * ========================================
 * Creates employee, manager, and admin test accounts for testing the app
 * with the local backend (e.g. START_ANDROID_DEV.bat).
 *
 * Run this ONCE when setting up local testing. Uses local MongoDB by default.
 *
 * Usage:
 *   node scripts/seedTestAccounts.js
 *
 * Test credentials (all use password: Test123!):
 *   Employee:  employee@test.local  / Test123!
 *   Manager:   manager@test.local   / Test123!
 *   Admin:     admin@test.local     / Test123!
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const User = require('../models/User');

const TEST_PASSWORD = 'Test123!';

const TEST_ACCOUNTS = [
  {
    email: 'employee@test.local',
    name: 'Test Employee',
    role: 'employee',
    department: 'IT',
    managedDepartments: [],
    employeeCode: 'EMP001',
  },
  {
    email: 'manager@test.local',
    name: 'Test Manager',
    role: 'manager',
    department: 'IT',
    managedDepartments: ['IT'],
    employeeCode: 'MGR001',
  },
  {
    email: 'admin@test.local',
    name: 'Test Admin',
    role: 'admin',
    department: 'Human Resources',
    managedDepartments: [],
    employeeCode: 'ADM001',
  },
];

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-erp';
  try {
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

async function seedTestAccounts() {
  try {
    await connectDB();

    console.log('\n🌱 Seed Test Accounts for Local Development');
    console.log('=============================================\n');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, salt);

    for (const account of TEST_ACCOUNTS) {
      let user = await User.findOne({ email: account.email });
      if (user) {
        user.password = hashedPassword;
        user.role = account.role;
        user.department = account.department;
        user.managedDepartments = account.managedDepartments;
        user.status = 'active';
        user.employeeCode = account.employeeCode;
        await user.save();
        console.log(`   Updated: ${account.email} (${account.role})`);
      } else {
        user = new User({
          ...account,
          password: hashedPassword,
          status: 'active',
          vacationDaysLeft: 21,
          excuseRequestsLeft: 2,
        });
        await user.save();
        console.log(`   Created: ${account.email} (${account.role})`);
      }
    }

    console.log('\n✅ Test accounts ready!');
    console.log('─────────────────────────────────────');
    console.log('   Email              | Role    | Password');
    console.log('   -------------------|---------|----------');
    console.log('   employee@test.local| employee| Test123!');
    console.log('   manager@test.local | manager | Test123!');
    console.log('   admin@test.local   | admin   | Test123!');
    console.log('─────────────────────────────────────');
    console.log('\nUse these to log in from the app (emulator or web).\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error seeding accounts:', err.message);
    process.exit(1);
  }
}

seedTestAccounts();
