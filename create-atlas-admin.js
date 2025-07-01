const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./models/User');

async function createAtlasSuperAdmin() {
  try {
    console.log('🔍 Creating super admin user in Atlas database...\n');
    
    // Connect to Atlas
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to Atlas');
    console.log('📊 Database:', mongoose.connection.name);
    console.log('🌐 Host:', mongoose.connection.host);
    
    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      console.log('⚠️  Super admin already exists:');
      console.log('   Email:', existingSuperAdmin.email);
      console.log('   Name:', existingSuperAdmin.name);
      await mongoose.connection.close();
      return;
    }

    // Check if user with this email exists
    let user = await User.findOne({ email: 'davidsamii97@gmail.com' });
    if (user) {
      console.log('⚠️  User with this email already exists:');
      console.log('   Email:', user.email);
      console.log('   Role:', user.role);
      await mongoose.connection.close();
      return;
    }

    // Create new super admin user
    console.log('🔧 Creating super admin user...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('d01858971234', salt);

    user = new User({
      name: 'David Sami',
      email: 'davidsamii97@gmail.com',
      password: hashedPassword,
      role: 'super_admin',
      department: 'Administration',
      status: 'active',
      vacationDaysLeft: 21
    });

    await user.save();
    console.log('✅ Super admin created successfully in Atlas!');
    console.log('   📧 Email: davidsamii97@gmail.com');
    console.log('   🔑 Password: d01858971234');
    console.log('   👤 Name: David Sami');
    console.log('   🛡️  Role: super_admin');
    
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    await mongoose.connection.close();
  }
}

createAtlasSuperAdmin(); 