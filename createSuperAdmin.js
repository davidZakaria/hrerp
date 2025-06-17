const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('config');

// Import the User model
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(config.get('mongoURI'), {
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
            console.log('Super admin already exists');
            process.exit(0);
        }

        // Check if user exists
        let user = await User.findOne({ email: 'davidsamii97@gmail.com' });
        if (user) {
            console.log('User already exists');
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
            vacationDaysLeft: 21
        });

        await user.save();
        console.log('Super admin created successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error creating super admin:', err);
        process.exit(1);
    }
}

createSuperAdmin(); 