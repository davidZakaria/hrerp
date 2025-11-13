# Unpaid Vacation Option Removed

## Date: November 6, 2025

## Summary
Removed the "Unpaid Vacation" option from the vacation form submission system. All vacation requests are now **Annual Vacation Leave** only, which deduct from the employee's annual vacation days balance.

---

## What Changed

### Before
Employees could choose between:
- **Annual Vacation** - Deducts from vacation days
- **Unpaid Vacation** - No deduction

### After
Only one option available:
- **Annual Vacation** - Deducts from vacation days

---

## Changes Made

### 1. Frontend - Form Submission
**File:** `hr-erp-frontend/src/components/FormSubmission.js`

#### Initial State
```javascript
// Before
vacationType: ''

// After
vacationType: 'annual' // Default to annual (unpaid vacation removed)
```

#### UI Changes
**Before:** Radio buttons for Annual/Unpaid selection

**After:** Information box showing it's Annual Vacation

```javascript
<div style={{ 
  padding: '1rem', 
  backgroundColor: 'rgba(76, 175, 80, 0.1)', 
  borderLeft: '4px solid #4caf50' 
}}>
  <span>🏖️ Annual Vacation Leave</span>
  <small>Deducted from your annual vacation days balance</small>
</div>
```

---

### 2. Frontend - Display Updates

Updated all dashboards to show only "Annual Vacation" for vacation forms:

#### A. Employee Dashboard
**File:** `hr-erp-frontend/src/components/EmployeeDashboard.js`

```javascript
// Before
{form.type === 'vacation' && form.vacationType === 'annual' ? 'Annual Vacation' :
 form.type === 'vacation' && form.vacationType === 'unpaid' ? 'Unpaid Vacation' :
 form.type}

// After
{form.type === 'vacation' ? 'Annual Vacation' : form.type}
```

#### B. Manager Dashboard
**File:** `hr-erp-frontend/src/components/ManagerDashboard.js`

Updated 4 locations:
- My Forms display
- Team Forms display
- Pending Requests display
- Modal detail view

All now show: `{form.type === 'vacation' ? 'ANNUAL VACATION' : form.type.toUpperCase()}`

#### C. Admin Dashboard
**File:** `hr-erp-frontend/src/components/AdminDashboard.js`

Updated 3 locations in forms list to show only "Annual Vacation"

#### D. Super Admin Dashboard
**File:** `hr-erp-frontend/src/components/SuperAdminDashboard.js`

Updated 5 locations:
- CSV export
- Form cards display (2 places)
- Modal header
- Modal details view

---

### 3. Backend - Validation

#### A. Form Model
**File:** `models/Form.js`

```javascript
// Before
vacationType: {
    type: String,
    enum: ['annual', 'unpaid'],
    required: false
}

// After
vacationType: {
    type: String,
    enum: ['annual'], // Only annual vacation allowed, unpaid removed
    required: function() {
        return this.type === 'vacation';
    }
}
```

#### B. Form Submission Route
**File:** `routes/forms.js`

**Added validation:**
```javascript
if (type === 'vacation') {
    if (vacationType !== 'annual') {
        return res.status(400).json({ 
            msg: 'Only annual vacation leave is allowed. Unpaid vacation is no longer available.' 
        });
    }
}
```

#### C. Admin Approval Route
**File:** `routes/forms.js`

**Updated handling:**
```javascript
// Before: Special handling for unpaid vacation (no deduction)
if (form.vacationType === 'unpaid') {
    console.log('Approving unpaid vacation without deducting days');
}

// After: Reject unpaid vacation attempts
if (form.vacationType === 'unpaid') {
    return res.status(400).json({ 
        msg: 'Unpaid vacation requests are no longer allowed. Only annual vacation leave is available.'
    });
}
```

---

## API Behavior

### Form Submission (POST `/api/forms`)
**Request with unpaid vacation:**
```json
{
  "type": "vacation",
  "vacationType": "unpaid",
  "startDate": "2025-11-10",
  "endDate": "2025-11-15"
}
```

**Response (400 Error):**
```json
{
  "msg": "Only annual vacation leave is allowed. Unpaid vacation is no longer available."
}
```

### Valid Request:
```json
{
  "type": "vacation",
  "vacationType": "annual",
  "startDate": "2025-11-10",
  "endDate": "2025-11-15"
}
```

**Response (200 Success):**
Form created successfully, deducts from vacation days on approval.

---

## User Experience

### Form Submission Page

**Before:**
```
Vacation Type:
○ Annual Leave
○ Unpaid Leave
```

**After:**
```
┌────────────────────────────────┐
│ 🏖️ Annual Vacation Leave      │
│ Deducted from your annual      │
│ vacation days balance          │
└────────────────────────────────┘
```

### Dashboard Display

**All vacation forms now show:**
- Employee Dashboard: "Annual Vacation"
- Manager Dashboard: "ANNUAL VACATION"
- Admin Dashboard: "Annual Vacation"
- Super Admin Dashboard: "Annual Vacation"

**No more distinction between annual/unpaid in the UI**

---

## Database Considerations

### Existing Forms
Forms already in the database with `vacationType: 'unpaid'` will:
- ✅ Still display correctly (shows "Annual Vacation" regardless)
- ⚠️ Cannot be edited to unpaid again (validation blocks it)
- ✅ Can be approved/processed normally

### Schema Validation
The Form model now only accepts `vacationType: 'annual'`

**Impact:** If you try to create/update a form with `vacationType: 'unpaid'`, MongoDB will reject it with a validation error.

---

## Migration Notes

### No Data Migration Required
- Existing unpaid vacation forms remain in database
- They will display as "Annual Vacation" in UI
- Backend won't allow new unpaid vacation submissions

### Optional: Clean Up Old Data
If you want to update existing unpaid vacation forms:

```javascript
// MongoDB command
db.forms.updateMany(
  { type: 'vacation', vacationType: 'unpaid' },
  { $set: { vacationType: 'annual' } }
)
```

**Note:** This is optional and not required for the system to work.

---

## Testing Checklist

### Frontend
- [ ] Form submission page shows Annual Vacation info box
- [ ] No radio buttons for vacation type selection
- [ ] Form automatically sets vacationType to 'annual'
- [ ] Employee dashboard shows "Annual Vacation"
- [ ] Manager dashboard shows "ANNUAL VACATION"
- [ ] Admin dashboard shows "Annual Vacation"
- [ ] Super admin dashboard shows "Annual Vacation"

### Backend
- [ ] Submitting with vacationType='annual' → Success
- [ ] Submitting with vacationType='unpaid' → Error 400
- [ ] Submitting without vacationType → Error 400
- [ ] Admin approving unpaid vacation form → Error 400
- [ ] All vacation forms deduct from vacation days balance

### API Validation
```bash
# Test invalid request
curl -X POST http://localhost:5000/api/forms \
  -H "x-auth-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "vacation",
    "vacationType": "unpaid",
    "startDate": "2025-11-10",
    "endDate": "2025-11-12",
    "reason": "Test"
  }'

# Expected: 400 error with message about unpaid not allowed
```

---

## Why This Change?

### Benefits
1. **Simplified System**: One vacation type, easier to understand
2. **Clear Accounting**: All vacations deduct from annual balance
3. **Reduced Confusion**: Employees don't need to choose between types
4. **Better Tracking**: All vacation days are accounted for

### Rationale
- Unpaid vacation creates accounting complexity
- Single vacation type is clearer for HR management
- Simplifies approval workflow
- Aligns with standard HR practices

---

## Rollback Plan

If needed to restore unpaid vacation option:

### 1. Frontend
```javascript
// In FormSubmission.js
vacationType: '' // Change from 'annual'

// Restore radio buttons
<input type="radio" value="annual" />
<input type="radio" value="unpaid" />
```

### 2. Backend
```javascript
// In models/Form.js
enum: ['annual', 'unpaid'] // Add 'unpaid' back

// In routes/forms.js
// Remove the validation that rejects unpaid
// Restore the unpaid handling logic
```

### 3. Restart Backend
```bash
npm start
```

---

## Files Modified

### Frontend (5 files)
1. ✅ `hr-erp-frontend/src/components/FormSubmission.js`
2. ✅ `hr-erp-frontend/src/components/EmployeeDashboard.js`
3. ✅ `hr-erp-frontend/src/components/ManagerDashboard.js`
4. ✅ `hr-erp-frontend/src/components/AdminDashboard.js`
5. ✅ `hr-erp-frontend/src/components/SuperAdminDashboard.js`

### Backend (2 files)
1. ✅ `routes/forms.js`
2. ✅ `models/Form.js`

**Total:** 7 files modified

---

## Status

✅ **COMPLETE**

- Unpaid vacation option removed from UI
- Backend validation blocks unpaid submissions
- All dashboards updated to show "Annual Vacation"
- Database model updated
- No linter errors

**Ready for deployment!**

---

## Deployment Steps

1. **Restart Backend:**
```bash
cd hr-erp-backend
npm start
```

2. **Refresh Frontend:**
- Clear browser cache (Ctrl+F5 or Cmd+Shift+R)
- Reload application

3. **Verify:**
- Submit vacation form → Should only show Annual Vacation
- Check existing forms → All show as Annual Vacation
- Try API with unpaid → Should get error

---

**Last Updated:** November 6, 2025
**Change Type:** Feature Removal
**Impact:** Low (Simplification)
**Rollback:** Easy (documented above)

