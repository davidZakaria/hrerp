# Unpaid Excuse Vacation Day Deduction - How It Works

## ⚠️ Important: When Does Deduction Happen?

### **Vacation days are deducted ONLY when the manager APPROVES the form, NOT when you submit it!**

---

## 📋 Complete Flow

### Step 1: Employee Submits Unpaid Excuse
```
Employee Dashboard:
- Select "Excuse" form type
- Choose "📝 Unpaid Excuse"
- Fill in date and time
- Click Submit

Status: pending
Vacation Days: NO CHANGE YET ❌
```

### Step 2: Form Pending Manager Approval
```
Form Status: "pending" (waiting for manager)

Employee sees:
- Form in "My Forms" with status badge
- Vacation days: STILL NO CHANGE ❌

Why? Because manager hasn't approved yet!
```

### Step 3: Manager Approves the Form
```
Manager Dashboard:
- Reviews unpaid excuse request
- Sees: "📝 Unpaid Excuse"
- Clicks "Approve"

✅ AT THIS MOMENT:
- System checks: Does employee have ≥ 0.5 vacation days?
- If YES: Deducts 0.5 days
- If NO: Shows error, cannot approve

Form Status: "approved"
Vacation Days: NOW DEDUCTED! ✅
```

### Step 4: Employee Sees Updated Balance
```
Employee Dashboard refreshes:
- Before: 19.0 days
- After: 18.5 days ✅

The 0.5 deduction is now visible!
```

---

## 🔍 Why This Design?

### Deduction on Approval (Not Submission)
**Reasons:**
1. **Fair to Employees**: If manager rejects, no deduction
2. **Prevents Abuse**: Manager validates before deduction
3. **Consistent with Other Forms**: Vacation forms also deduct on approval
4. **Audit Trail**: Clear record of who approved and when

---

## 📊 Example Scenarios

### Scenario 1: Both Forms Pending
```
Starting Balance: 19.0 days

Day 1: Submit unpaid excuse #1
  Status: pending
  Balance: 19.0 days (no change)

Day 2: Submit unpaid excuse #2
  Status: pending
  Balance: 19.0 days (no change)

Day 3: Manager approves #1
  Status: approved
  Balance: 18.5 days ✅ (deducted)

Day 4: Manager approves #2
  Status: approved
  Balance: 18.0 days ✅ (deducted again)
```

### Scenario 2: One Approved, One Rejected
```
Starting Balance: 19.0 days

Submit unpaid excuse #1
  Status: pending
  Balance: 19.0 days

Manager APPROVES #1
  Status: approved
  Balance: 18.5 days ✅

Submit unpaid excuse #2
  Status: pending
  Balance: 18.5 days (no change)

Manager REJECTS #2
  Status: rejected
  Balance: 18.5 days (no deduction because rejected)
```

### Scenario 3: Insufficient Balance
```
Current Balance: 0.3 days

Submit unpaid excuse
  Status: pending
  Balance: 0.3 days

Manager tries to approve
  ❌ ERROR: "Cannot approve: Employee has insufficient 
            vacation days. Available: 0.3, Required: 0.5"
  
  Status: still pending
  Balance: 0.3 days (no change)
```

---

## 🎯 How to Check Your Balance

### Employee Dashboard
1. Login to your account
2. Top of dashboard shows:
   ```
   Vacation Days
   18.5
   Days Remaining
   💡 Unpaid excuse requests deduct 0.5 days
   ```

3. **Look for decimals!**
   - If you see **18.5** or **19.5**, system is showing half days ✅
   - If you see **18** or **19**, it might be rounding (now fixed)

### After Manager Approval
1. Your pending forms list updates
2. Form status changes to "approved"
3. Vacation days balance decreases by 0.5
4. **Refresh page** if you don't see the update immediately

---

## 🔧 Troubleshooting

### Problem: "I submitted 2 unpaid excuses but vacation days didn't change"

**Check:**
1. ✅ Are the forms **approved** or still **pending**?
   - If pending → No deduction yet
   - If approved → Should be deducted

2. ✅ Did you **refresh** the page after approval?
   - Click browser refresh
   - Or navigate away and back

3. ✅ Are you looking at the **decimal places**?
   - Should show: 18.5 (not 18)
   - All dashboards now show .1 decimal precision

### Problem: "Manager can't approve my unpaid excuse"

**Check:**
1. ✅ Do you have **at least 0.5 vacation days**?
   - If balance < 0.5, approval will fail
   - Error message will show exact available balance

2. ✅ Manager will see error:
   - "Cannot approve: Employee has insufficient vacation days"
   - Shows: Available vs Required

### Problem: "Vacation days show whole numbers only"

**Fixed!** All dashboards now show decimals:
- Employee Dashboard: 18.5 days ✅
- Manager Dashboard: 18.5 days left ✅
- Admin Dashboard: 18.5 days ✅
- Super Admin Dashboard: 18.5 days ✅

---

## 💡 Quick Reference

| Action | Vacation Days Change? |
|--------|----------------------|
| Submit unpaid excuse | ❌ No |
| Form is pending | ❌ No |
| Manager **approves** | ✅ Yes (-0.5) |
| Manager **rejects** | ❌ No |
| Submit paid excuse | ❌ No (uses monthly requests) |

---

## 📞 Testing Steps

### To Verify System is Working:

1. **Check Current Balance**
   - Login as employee
   - Note vacation days (e.g., 19.0)

2. **Submit Unpaid Excuse**
   - Go to form submission
   - Choose excuse type
   - Select "📝 Unpaid Excuse"
   - Submit

3. **Verify Pending Status**
   - Check "My Forms"
   - Status should be "pending"
   - Vacation days: STILL 19.0 (no change) ✅

4. **Manager Approves**
   - Login as manager
   - Find the pending unpaid excuse
   - Click "Approve"

5. **Check Updated Balance**
   - Login back as employee (or refresh page)
   - Vacation days should now be: 18.5 ✅

---

## 🎓 Summary

### Key Points to Remember:

1. **Deduction timing**: On manager approval, NOT submission
2. **Deduction amount**: Exactly 0.5 vacation days
3. **Display format**: Shows decimals (18.5, not 18)
4. **Validation**: Requires ≥ 0.5 days to approve
5. **Rejection**: No deduction if manager rejects

### What You Should See:

- **Before Approval**: Form pending, vacation days unchanged
- **After Approval**: Form approved, vacation days reduced by 0.5
- **In Dashboard**: Numbers like 18.5, 19.5, 17.0 (with decimals)

---

**Last Updated:** November 6, 2025
**System Status:** ✅ Working as designed

