# Fix Vacation Day Deduction Issue - Step by Step

## Problem
You submitted an unpaid excuse request that was approved by the manager, but your vacation days weren't deducted (still showing 19.0 instead of 18.5).

## Why This Happened
The deduction code was added AFTER your form was already approved, so the deduction didn't happen automatically.

---

## Solution: 2 Steps

### Step 1: Restart Backend Server ⚠️ IMPORTANT

The new deduction code needs the backend to be restarted to take effect.

**In your backend terminal (where Node.js is running):**

```bash
# Stop the server (Ctrl+C or Cmd+C)

# Then restart it
npm start
# or
node server.js
```

**You should see in the console:**
```
Server started on port 5000
MongoDB connected successfully
```

---

### Step 2: Run Fix Script for Already-Approved Forms

This will manually deduct 0.5 days for your already-approved unpaid excuse.

**In a new terminal, in the project root directory:**

```bash
node fix-unpaid-excuse-deductions.js
```

**Expected Output:**
```
✅ Connected to MongoDB
🔍 Searching for approved unpaid excuse forms...

Found 1 approved unpaid excuse forms

📋 Form ID: [your-form-id]
   Employee: [Your Name]
   Excuse Date: 11/6/2025
   Approved: 11/6/2025
   Current Vacation Balance: 19.0 days
   ✅ DEDUCTED: 19.0 → 18.5 days

==========================================================
📊 SUMMARY
==========================================================
Total Forms Found: 1
Successfully Processed: 1
Skipped: 0

📝 Detailed Updates:
1. [Your Name]: 19.0 → 18.5 days

✅ Fix script completed successfully!
💡 Remember to RESTART the backend server to load the new deduction code.
```

---

## Step 3: Verify the Fix

1. **Go to your Employee Dashboard**
2. **Refresh the page** (F5 or Ctrl+R / Cmd+R)
3. **Check vacation days** - should now show **18.5** ✅

---

## For Future Unpaid Excuses

After completing Step 1 (restarting backend), all **NEW** unpaid excuse approvals will automatically deduct 0.5 vacation days. No manual fix needed!

**Test it:**
1. Submit a new unpaid excuse (balance should still be 19.0 while pending)
2. Manager approves it
3. Refresh your dashboard → balance updates to 18.5 automatically ✅

---

## What the Logs Will Show

After restarting the backend, when a manager approves an unpaid excuse, you'll see in the **backend console**:

```
📋 Processing excuse form approval:
   Form ID: [form-id]
   Employee: [Name]
   Excuse Type: unpaid
   Employee vacation balance: 19.0

🔍 Processing unpaid excuse for user [Name], current balance: 19.0
✅ Unpaid excuse approved - Deducted 0.5 days from [Name]
   Old balance: 19.0, New balance: 18.5
```

If you see **"⚠️ WARNING: Excuse form has unknown excuseType"** → the form doesn't have excuseType saved properly (shouldn't happen with new forms).

---

## Troubleshooting

### Issue: Fix script shows 0 forms
**Solution:** Your form might not have `excuseType` field. Check in MongoDB:

```bash
# Connect to MongoDB
mongosh

# Use your database
use hr-erp

# Check the form
db.forms.find({ type: 'excuse', status: 'approved' }).pretty()

# Look for excuseType field - should be 'unpaid'
```

If `excuseType` is missing or wrong, update it:
```javascript
db.forms.updateOne(
  { _id: ObjectId('your-form-id') },
  { $set: { excuseType: 'unpaid' } }
)
```

Then run the fix script again.

### Issue: Script says "Insufficient balance"
If script says employee has less than 0.5 days:
- Check if other forms were already processed
- Verify the actual balance in the database
- The script won't deduct if balance < 0.5 (safety check)

### Issue: Backend won't restart
```bash
# Find and kill the process
# On Windows:
netstat -ano | findstr :5000
taskkill /PID [process-id] /F

# On Mac/Linux:
lsof -ti:5000 | xargs kill -9

# Then start again
npm start
```

---

## Quick Commands Reference

```bash
# 1. Stop backend (in backend terminal)
Ctrl+C (or Cmd+C)

# 2. Start backend
npm start

# 3. Run fix script (in new terminal)
node fix-unpaid-excuse-deductions.js

# 4. Check backend logs
# Watch the console when manager approves a form

# 5. Verify database directly (optional)
mongosh
use hr-erp
db.users.findOne({ email: 'your-email@example.com' }, { vacationDaysLeft: 1, name: 1 })
```

---

## Expected Results

**After completing all steps:**

✅ Your existing approved unpaid excuse: 19.0 → 18.5 days (fixed by script)

✅ Future unpaid excuses: Automatically deduct 0.5 days on manager approval

✅ Employee Dashboard shows: 18.5 days (with decimal)

✅ Backend logs show deduction messages

✅ All dashboards display decimal places (18.5, not 18)

---

## Need Help?

If the fix script doesn't work:
1. Check the backend console for errors
2. Verify MongoDB is running
3. Check that MONGO_URI is correct in .env file
4. Make sure you're in the project root directory when running the script

**Script is safe:** 
- Only deducts 0.5 days per approved unpaid excuse
- Won't deduct if balance < 0.5
- Won't process the same form twice
- Provides detailed summary of what it did

---

**Last Updated:** November 6, 2025

