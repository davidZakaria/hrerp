/**
 * Fix Script: Manually Deduct Vacation Days for Already-Approved Unpaid Excuses
 * 
 * This script finds all approved unpaid excuse forms and deducts 0.5 vacation days
 * for each one that hasn't been properly deducted.
 * 
 * Run this ONCE to fix existing approved forms, then restart the backend.
 */

const mongoose = require('mongoose');
const User = require('./models/User');
const Form = require('./models/Form');
require('dotenv').config();

async function fixUnpaidExcuseDeductions() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hr-erp', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Connected to MongoDB');
        console.log('🔍 Searching for approved unpaid excuse forms...\n');
        
        // Find all approved unpaid excuse forms
        const approvedUnpaidExcuses = await Form.find({
            type: 'excuse',
            excuseType: 'unpaid',
            status: 'approved'
        }).populate('user', 'name email vacationDaysLeft');
        
        console.log(`Found ${approvedUnpaidExcuses.length} approved unpaid excuse forms\n`);
        
        if (approvedUnpaidExcuses.length === 0) {
            console.log('✅ No forms to process. Exiting...');
            process.exit(0);
        }
        
        // Track what we're doing
        let processedCount = 0;
        let skippedCount = 0;
        const updates = [];
        
        for (const form of approvedUnpaidExcuses) {
            const user = await User.findById(form.user._id);
            
            console.log(`\n📋 Form ID: ${form._id}`);
            console.log(`   Employee: ${user.name} (${user.email})`);
            console.log(`   Excuse Date: ${form.excuseDate.toLocaleDateString()}`);
            console.log(`   Approved: ${form.managerApprovedAt ? form.managerApprovedAt.toLocaleDateString() : 'Unknown'}`);
            console.log(`   Current Vacation Balance: ${user.vacationDaysLeft} days`);
            
            // Check if user has enough vacation days
            if (user.vacationDaysLeft < 0.5) {
                console.log(`   ⚠️  SKIPPED: Insufficient balance (need 0.5, has ${user.vacationDaysLeft})`);
                skippedCount++;
                continue;
            }
            
            // Deduct 0.5 days
            const oldBalance = user.vacationDaysLeft;
            user.vacationDaysLeft = Math.max(0, user.vacationDaysLeft - 0.5);
            await user.save();
            
            console.log(`   ✅ DEDUCTED: ${oldBalance} → ${user.vacationDaysLeft} days`);
            
            updates.push({
                formId: form._id,
                employee: user.name,
                oldBalance,
                newBalance: user.vacationDaysLeft
            });
            
            processedCount++;
        }
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Forms Found: ${approvedUnpaidExcuses.length}`);
        console.log(`Successfully Processed: ${processedCount}`);
        console.log(`Skipped: ${skippedCount}`);
        
        if (updates.length > 0) {
            console.log('\n📝 Detailed Updates:');
            updates.forEach((update, index) => {
                console.log(`${index + 1}. ${update.employee}: ${update.oldBalance} → ${update.newBalance} days`);
            });
        }
        
        console.log('\n✅ Fix script completed successfully!');
        console.log('💡 Remember to RESTART the backend server to load the new deduction code.');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error running fix script:', error);
        process.exit(1);
    }
}

// Run the script
fixUnpaidExcuseDeductions();

