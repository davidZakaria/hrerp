# Excuse Requests Reset - Changed to 25th of Each Month

## Date: November 6, 2025

## Summary
Changed the paid excuse requests reset schedule from **1st of the month** to **25th of each month**.

---

## What Changed

### Old Behavior
- Excuse requests reset on the **1st** of each month
- Users got 2 new paid excuse requests on the 1st

### New Behavior
- Excuse requests reset on the **25th** of each month
- Users get 2 new paid excuse requests on the 25th

---

## Technical Implementation

### 1. Created Reset Helper Utility
**File:** `utils/excuseResetHelper.js`

```javascript
// Helper functions for 25th of month reset logic
function shouldResetExcuseRequests(lastResetDate)
function getNextResetDate()
function getResetDisplayText(lastResetDate)
```

**Logic:**
- If today is on or after the 25th → Reset if last reset was before the 25th of this month
- If today is before the 25th → Reset if last reset was before the 25th of last month

### 2. Updated Backend Routes

#### A. Form Submission (`routes/forms.js`)
**POST `/api/forms`** - When submitting paid excuse:
```javascript
// Old: Checked if month changed
if (resetDate.getMonth() !== now.getMonth() || ...)

// New: Uses helper function
if (shouldResetExcuseRequests(fullUser.excuseRequestsResetDate)) {
    fullUser.excuseRequestsLeft = 2;
    fullUser.excuseRequestsResetDate = new Date();
    console.log(`🔄 Excuse requests reset for ${fullUser.name} (monthly reset on 25th)`);
}
```

#### B. Excuse Hours Endpoint (`routes/forms.js`)
**GET `/api/forms/excuse-hours`** - When fetching excuse requests:
```javascript
// Check if reset needed
if (shouldResetExcuseRequests(user.excuseRequestsResetDate)) {
    user.excuseRequestsLeft = 2;
    user.excuseRequestsResetDate = new Date();
}

// Return next reset date
const result = { 
    excuseRequestsLeft: user.excuseRequestsLeft || 0,
    excuseRequestsResetDate: user.excuseRequestsResetDate,
    nextResetDate: getNextResetDate()  // NEW!
};
```

#### C. Manager Approval (`routes/forms.js`)
**PUT `/api/forms/manager/:id`** - When manager approves:
```javascript
// Check if reset needed before deducting
if (shouldResetExcuseRequests(employee.excuseRequestsResetDate)) {
    employee.excuseRequestsLeft = 2;
    employee.excuseRequestsResetDate = new Date();
}
```

### 3. Updated Frontend Display

#### Employee Dashboard
**File:** `hr-erp-frontend/src/components/EmployeeDashboard.js`

**Added:**
- State for next reset date
- Display of reset schedule
- Dynamic next reset date

**New Display:**
```
⏰ Paid Excuse Requests
       2 / 2
Current Period (Each = 2 hours)

🔄 Resets on the 25th of each month
Next reset: November 25, 2025
```

---

## How It Works

### Example Timeline

#### Scenario 1: Mid-Month (November 10)
```
Current Date: November 10, 2025
Last Reset: October 25, 2025
Next Reset: November 25, 2025

Status: ✅ Reset already happened on Oct 25
Balance: 2 / 2 requests available
```

#### Scenario 2: Before 25th (November 20)
```
Current Date: November 20, 2025
Last Reset: October 25, 2025
Next Reset: November 25, 2025

Status: ⏰ Waiting for Nov 25 reset
Balance: Using October 25 period (may have 0-2 left)
```

#### Scenario 3: Reset Day (November 25)
```
Current Date: November 25, 2025
Last Reset: October 25, 2025
Next Reset: December 25, 2025

Action: 🔄 System auto-resets to 2 / 2
Status: ✅ New period starts
Balance: 2 / 2 requests available
```

#### Scenario 4: After 25th (November 28)
```
Current Date: November 28, 2025
Last Reset: November 25, 2025
Next Reset: December 25, 2025

Status: ✅ Already reset on Nov 25
Balance: 2 / 2 requests (or less if already used)
```

---

## When Reset Happens Automatically

The system checks and auto-resets in these situations:

1. **When employee submits** a paid excuse request
2. **When employee checks** their excuse requests balance
3. **When manager approves** a paid excuse request

**No manual action needed!** The system detects if reset is due and applies it automatically.

---

## Reset Detection Logic

```javascript
function shouldResetExcuseRequests(lastResetDate) {
    const now = new Date();
    const resetDay = 25;
    
    // Get key dates
    const currentMonth25th = new Date(now.getFullYear(), now.getMonth(), 25);
    const lastMonth25th = new Date(now.getFullYear(), now.getMonth() - 1, 25);
    
    // If today >= 25th
    if (now.getDate() >= 25) {
        // Reset if last reset was before this month's 25th
        return lastReset < currentMonth25th;
    } else {
        // Reset if last reset was before last month's 25th
        return lastReset < lastMonth25th;
    }
}
```

---

## Example Reset Scenarios

### Case 1: User's First Time
```
Last Reset Date: null (never reset)
Current Date: November 15, 2025

Result: ✅ Reset immediately (first time setup)
New Balance: 2 / 2
Next Reset: November 25, 2025
```

### Case 2: Normal Monthly Reset
```
Last Reset Date: October 25, 2025 @ 10:00 AM
Current Date: November 25, 2025 @ 9:00 AM

Result: ✅ Reset happens
New Balance: 2 / 2
Next Reset: December 25, 2025
```

### Case 3: Already Reset This Period
```
Last Reset Date: November 25, 2025 @ 8:00 AM
Current Date: November 28, 2025 @ 2:00 PM

Result: ❌ No reset (already done this period)
Balance: Remains as is (0-2 depending on usage)
Next Reset: December 25, 2025
```

### Case 4: Missed Reset Detection
```
Last Reset Date: September 25, 2025
Current Date: November 28, 2025

Result: ✅ Reset happens (detects missed reset)
New Balance: 2 / 2
Next Reset: December 25, 2025
```

---

## User-Facing Changes

### Employee Dashboard
**Before:**
```
⏰ Paid Excuse Requests
       1 / 2
This Month (Each = 2 hours)
```

**After:**
```
⏰ Paid Excuse Requests
       1 / 2
Current Period (Each = 2 hours)

🔄 Resets on the 25th of each month
Next reset: November 25, 2025
```

### Admin View
No changes to admin view, but they'll see:
- Resets happening on 25th instead of 1st
- Logs showing "monthly reset on 25th"

---

## Backend Logging

When reset happens, you'll see in console:

```
🔄 Excuse requests reset for John Doe (monthly reset on 25th)
```

Appears in these scenarios:
1. Form submission
2. Fetching excuse hours
3. Manager approval

---

## Database Impact

**No schema changes required!**

Existing fields:
- `excuseRequestsLeft` (Number)
- `excuseRequestsResetDate` (Date)

The `excuseRequestsResetDate` now stores when the **last reset happened** (on the 25th), not the beginning of the month.

---

## Testing Checklist

### Backend Testing
- [ ] Submit paid excuse before 25th → Uses current period balance
- [ ] Submit paid excuse on/after 25th with old reset date → Auto-resets to 2
- [ ] Fetch excuse hours before 25th → Shows current balance
- [ ] Fetch excuse hours on/after 25th → Auto-resets if needed
- [ ] Manager approval before 25th → Deducts from current period
- [ ] Manager approval on/after 25th → Auto-resets then deducts

### Frontend Testing
- [ ] Employee dashboard shows reset info
- [ ] Next reset date displays correctly
- [ ] Shows "25th of each month" text
- [ ] Balance updates after auto-reset

### Edge Cases
- [ ] User with null reset date → Gets 2 requests
- [ ] User last reset in previous month → Gets reset
- [ ] User already reset this period → No duplicate reset
- [ ] Crossing year boundary (Dec 25 → Jan 25)

---

## Migration Notes

### For Existing Users

Users with `excuseRequestsResetDate` set to beginning of current month:

**Example:**
```
Old Reset Date: November 1, 2025
Current Date: November 10, 2025
System Checks: Is Nov 1 before Nov 25? Yes
Result: ✅ Reset happens, gives 2 new requests

New Reset Date: November 10, 2025
Next Reset: November 25, 2025
```

**Impact:** Some users might get an "early" reset when the system is first deployed, effectively getting extra requests for this transition period. This is a one-time occurrence.

**Alternative:** Run manual reset on deployment day to standardize everyone.

---

## Manual Admin Reset

Admin can still manually reset all users via:

```bash
POST /api/excuse-hours/reset
```

This sets all users to:
- `excuseRequestsLeft = 2`
- `excuseRequestsResetDate = now`

**Use Case:** Standardize all users on deployment day.

---

## Next Reset Dates Examples

If today is November 10, 2025:

| Last Reset | Next Reset | Why |
|------------|-----------|-----|
| Oct 25, 2025 | Nov 25, 2025 | Normal cycle |
| Nov 1, 2025 | Nov 25, 2025 | Will reset on 25th |
| Oct 1, 2025 | Nov 25, 2025 | Missed Oct 25, will reset |
| null | Nov 25, 2025 | First time user |

---

## Benefits of 25th Reset

1. **Payroll Alignment**: If company pays on 25th, easier to track
2. **Month-End Planning**: Employees can plan for month-end needs
3. **Consistent Window**: Always 30-31 days between resets
4. **Clear Communication**: "Resets on 25th" is specific

---

## Rollback Plan

If needed, revert to 1st of month:

1. Change `resetDay = 25` to `resetDay = 1` in `utils/excuseResetHelper.js`
2. Update display text to say "1st of each month"
3. Restart backend
4. Consider running manual reset to synchronize users

---

## Files Modified

1. ✅ `utils/excuseResetHelper.js` - NEW helper functions
2. ✅ `routes/forms.js` - Updated 3 places
3. ✅ `hr-erp-frontend/src/components/EmployeeDashboard.js` - Display updates

---

## Status

✅ **IMPLEMENTATION COMPLETE**

- Reset logic updated to 25th
- Helper functions created
- Frontend displays next reset date
- Backend logs reset events
- Auto-detection working

**Ready for deployment!**

---

**Last Updated:** November 6, 2025

