const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import the User model
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB Connected...'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function createSuperAdmin() {
    try {
        // Check if super admin already exists
        const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
        if (existingSuperAdmin) {
            console.log('Super admin already exists:', existingSuperAdmin.email);
            process.exit(0);
        }

        // Check if user with this email exists
        let user = await User.findOne({ email: 'davidsamii97@gmail.com' });
        if (user) {
            // Update existing user to super admin
            user.role = 'super_admin';
            user.status = 'active';
            await user.save();
            console.log('User updated to super admin successfully!');
            console.log('Email:', user.email);
            console.log('Name:', user.name);
            process.exit(0);
        }

        // Create new super admin user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('d01858971234', salt);

        user = new User({
            name: 'David Sami',
            email: 'davidsamii97@gmail.com',
            password: hashedPassword,
            role: 'super_admin',
            department: 'Administration',
            status: 'active',
            vacationDaysLeft: 21,
            excuseHoursLeft: 2
        });

        await user.save();
        console.log('Super admin created successfully!');
        console.log('Email: davidsamii97@gmail.com');
        console.log('Password: d01858971234');
        console.log('Role: super_admin');
        process.exit(0);
    } catch (err) {
        console.error('Error creating super admin:', err);
        process.exit(1);
    }
}

createSuperAdmin(); 