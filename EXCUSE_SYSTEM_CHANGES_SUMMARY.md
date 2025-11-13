# Excuse Form System Changes - Summary

## Overview
The excuse form system has been completely redesigned from an hours-based system to a request-based system with the following key changes:

## Key Changes

### 1. **Request-Based System (Instead of Hours-Based)**
- **Old System**: Users had 2 hours per month for excuses
- **New System**: Users have 2 requests per month, each request is exactly 2 hours

### 2. **Paid vs Unpaid Excuse Types** (UPDATED)
- **Paid Excuses**: 
  - Limited to 2 requests per month
  - Must be exactly 2 hours (no more, no less)
  - Automatically resets monthly
  - **No vacation day deduction**
  
- **Unpaid Excuses**:
  - Unlimited requests
  - Any duration allowed
  - **Deducts 0.5 vacation days per request**
  - **Always available as an option alongside paid excuses**
  - Requires minimum 0.5 vacation days available

### 3. **Employee Choice** (NEW)
- Employees can **choose between paid and unpaid** at any time
- Both options are visible when submitting excuse forms
- Paid option is disabled when monthly requests exhausted
- Unpaid option is disabled when vacation days < 0.5

### 4. **Approval Process**
- **Excuse forms can ONLY be approved by managers** (not admins)
- Manager approval is final - no admin approval needed
- Admins attempting to approve excuse forms will receive an error message

### 5. **Monthly Tracking**
- System automatically resets excuse requests at the start of each month
- Dashboard shows "X / 2" requests remaining for current month
- Forms display shows whether each excuse was paid or unpaid

---

## Backend Changes

### 1. User Model (`models/User.js`)
```javascript
// Changed from:
excuseHoursLeft: { type: Number, default: 2 }

// Changed to:
excuseRequestsLeft: { type: Number, default: 2 }
excuseRequestsResetDate: { type: Date, default: Date.now }
```

### 2. Form Model (`models/Form.js`)
Added new field:
```javascript
excuseType: {
    type: String,
    enum: ['paid', 'unpaid'],
    required: function() {
        return this.type === 'excuse';
    }
}
```

### 3. Form Submission Route (`routes/forms.js`) (UPDATED)
**POST `/api/forms`**:
- Validates `excuseType` field is provided
- For paid excuses:
  - Validates exactly 2 hours
  - Checks monthly request limit
  - Auto-resets if new month
  - Returns error if requests exhausted
- For unpaid excuses:
  - **No restrictions on hours (any duration)**
  - **Validates user has at least 0.5 vacation days available**
  - Returns error if insufficient vacation days

**PUT `/api/forms/manager/:id` (Manager Approval)** (UPDATED):
- For paid excuses:
  - Checks monthly limit
  - Deducts 1 request (not hours)
  - Auto-resets if new month
- For unpaid excuses:
  - **Checks employee has at least 0.5 vacation days**
  - **Deducts 0.5 vacation days from employee's annual leave**
  - Returns error if insufficient vacation days
- Sets status to 'approved' (final, no admin approval needed)

**PUT `/api/forms/:id` (Admin Approval)**:
- **BLOCKS** admins from approving/rejecting excuse forms
- Returns error message directing to have manager review

**GET `/api/forms/excuse-hours`**:
- Returns `excuseRequestsLeft` and `excuseRequestsResetDate`
- Auto-resets requests if new month detected

### 4. Excuse Hours Route (`routes/excuse-hours.js`)
- Updated reset endpoint to reset `excuseRequestsLeft` instead of hours
- Updated status endpoint to show requests instead of hours
- Updated audit log actions to use "EXCUSE_REQUESTS" instead of "EXCUSE_HOURS"

---

## Frontend Changes

### 1. Form Submission Component (`hr-erp-frontend/src/components/FormSubmission.js`)

**State Changes**:
```javascript
// Changed from:
const [excuseHoursLeft, setExcuseHoursLeft] = useState(null);

// Changed to:
const [excuseRequestsLeft, setExcuseRequestsLeft] = useState(null);

// Added to form state:
excuseType: 'paid' // default value
```

**New UI Features** (UPDATED):
1. **Excuse Type Selection**:
   - Radio buttons for Paid/Unpaid selection **always visible**
   - Paid option disabled when no requests left
   - Unpaid option always enabled (no restriction)
   - Visual indicators showing requests remaining
   - **Helper text: "Choose paid (uses monthly request) or unpaid (deducts half vacation day)"**
   
2. **Request Status Display**:
   - Shows "X / 2 Requests Remaining"
   - Color-coded: Green when available, Orange when exhausted
   - Helper text for paid: "Exactly 2 hours (X of 2 left this month)"
   - **Helper text for unpaid: "Any duration - deducts 0.5 vacation day"**

3. **Validation**:
   - Real-time validation for 2-hour requirement on paid excuses
   - Error message if hours don't equal 2
   - **No hour restrictions for unpaid excuses**
   - Warning when no paid requests remaining

4. **Summary Card**:
   - Shows excuse type (Paid/Unpaid)
   - Displays validation warnings for incorrect hours
   - Visual feedback with color coding

### 2. Employee Dashboard (`hr-erp-frontend/src/components/EmployeeDashboard.js`)

**Dashboard Card**:
```
Old: "Excuse Hours: 2 hours remaining"
New: "Paid Excuse Requests: 2 / 2 This Month (Each = 2 hours)"
```

**Forms Preview**:
- Each excuse form now shows:
  - Excuse Type: 💰 Paid or 📝 Unpaid
  - Color-coded badges (green for paid, orange for unpaid)

### 3. Translation Files
Added new translation keys:
- `requestsRemaining`: "Requests Remaining" (EN) / "الطلبات المتبقية" (AR)

---

## Database Schema Changes

### Users Collection
```javascript
{
  // Removed field:
  // excuseHoursLeft: Number

  // New fields:
  excuseRequestsLeft: Number,      // Default: 2
  excuseRequestsResetDate: Date    // Tracks last reset
}
```

### Forms Collection
```javascript
{
  // New field:
  excuseType: String  // 'paid' or 'unpaid'
}
```

---

## API Endpoint Changes

### Modified Endpoints

1. **POST `/api/forms`**
   - Now requires `excuseType` field for excuse forms
   - Validates 2-hour requirement for paid excuses
   - Checks monthly request limit

2. **PUT `/api/forms/manager/:id`**
   - Deducts from `excuseRequestsLeft` (not hours)
   - Auto-resets monthly

3. **PUT `/api/forms/:id`**
   - Blocks admin approval for excuse forms

4. **GET `/api/forms/excuse-hours`**
   - Returns `excuseRequestsLeft` and `excuseRequestsResetDate`
   - Auto-resets if new month

5. **POST `/api/excuse-hours/reset`** (Admin only)
   - Resets all users' `excuseRequestsLeft` to 2
   - Updates `excuseRequestsResetDate`

6. **GET `/api/excuse-hours/status`** (Admin only)
   - Shows request statistics instead of hours

---

## User Experience Flow (UPDATED)

### Submitting an Excuse Request:
1. User navigates to form submission
2. Selects "Excuse" type
3. Sees **both** Paid and Unpaid options available
4. User **chooses** between:
   - **Paid Excuse**: Uses 1 of 2 monthly requests, exactly 2 hours
   - **Unpaid Excuse**: Deducts 0.5 vacation days, any duration
5. Helper text explains: "Choose paid (uses monthly request) or unpaid (deducts half vacation day)"
6. Submits form to manager

### With Paid Requests Available (1-2 left):
1. User sees "2 / 2 Requests Remaining" (or "1 / 2")
2. **Both paid and unpaid options are visible**
3. Paid option: Exactly 2 hours required
4. Unpaid option: Any duration, deducts 0.5 vacation days
5. User chooses based on their preference

### When Paid Requests Exhausted (0 left):
1. User sees "0 / 2 Requests Remaining"
2. **Both options still visible**
3. Paid option is **disabled** (grayed out)
4. Warning shown: "No paid excuse requests remaining this month"
5. Unpaid option is **available** - deducts 0.5 vacation days
6. Can choose any duration

### Manager Approval:
1. Manager reviews excuse request
2. Sees if it's 💰 Paid or 📝 Unpaid
3. Approves/Rejects
4. **For paid**: System deducts 1 request from monthly allowance
5. **For unpaid**: System deducts 0.5 vacation days from annual leave
6. System validates sufficient balance before approval
7. Status set to 'approved' (final)

### Admin View:
1. Admins can **see** excuse forms with type badges
2. Admins **cannot approve** excuse forms
3. Receive error if approval attempted
4. Must have manager review instead

---

## Migration Notes

### Existing Data
- Old `excuseHoursLeft` field remains in database but is no longer used
- New submissions will use `excuseRequestsLeft`
- Existing excuse forms don't have `excuseType` field (will show as undefined in old forms)

### Recommendations
1. **Database Migration Script**: Update all users to have `excuseRequestsLeft: 2` and set `excuseRequestsResetDate` to current date
2. **Historical Data**: Consider adding `excuseType: 'paid'` to all existing excuse forms for consistency
3. **Communication**: Inform all employees of the new system rules

---

## Testing Checklist

### Backend Testing
- [ ] Submit paid excuse with exactly 2 hours
- [ ] Submit paid excuse with != 2 hours (should fail)
- [ ] Submit 2 paid excuses in one month (should succeed)
- [ ] Submit 3rd paid excuse in same month (should fail)
- [ ] Submit unpaid excuse with any duration (should succeed)
- [ ] Manager approves paid excuse (should deduct request)
- [ ] Manager approves unpaid excuse (should not deduct)
- [ ] Admin tries to approve excuse (should fail)
- [ ] Monthly reset functionality
- [ ] Cross-month request submission

### Frontend Testing
- [ ] Paid/Unpaid selection UI works
- [ ] Request counter displays correctly
- [ ] Paid option disables when exhausted
- [ ] 2-hour validation shows warnings
- [ ] Form submission with paid/unpaid
- [ ] Dashboard shows correct request count
- [ ] Forms preview shows excuse type
- [ ] Translation strings display

---

## Benefits of New System

1. **Clearer Rules**: Fixed 2-hour requests are easier to understand than flexible hours
2. **Fair Usage**: Each employee gets exactly 2 paid requests per month
3. **Flexibility**: Unpaid option available when paid exhausted
4. **Better Tracking**: Monthly reset provides clear boundaries
5. **Manager Control**: Managers have full authority over excuse approvals
6. **Transparency**: Users can see exactly how many requests they have left

---

## Configuration

### To change the number of monthly requests:
Update the default value in `models/User.js`:
```javascript
excuseRequestsLeft: {
    type: Number,
    default: 2  // Change this value
}
```

### To change the hours per request:
Update validation in `routes/forms.js` and frontend validation:
```javascript
if (hoursRequested !== 2) {  // Change the 2 here
```

---

## Support and Maintenance

### Admin Tools
- Manual reset: POST `/api/excuse-hours/reset`
- View status: GET `/api/excuse-hours/status`

### Monitoring
- Track request usage via admin dashboard
- View statistics on paid vs unpaid excuses
- Monitor monthly patterns

---

## Change Log

**Date**: November 2, 2025

**Changed Files**:
- Backend: 4 files (models/User.js, models/Form.js, routes/forms.js, routes/excuse-hours.js)
- Frontend: 2 files (FormSubmission.js, EmployeeDashboard.js)
- Translations: 2 files (en.json, ar.json)

**Total Changes**: 8 files modified, 0 files added, 0 files deleted

---

## Conclusion

The new excuse system provides a clearer, more manageable approach to handling employee excuse requests. The combination of fixed 2-hour paid requests with unlimited unpaid options gives employees flexibility while maintaining organizational control. The monthly reset and manager-only approval process ensures proper oversight and fair distribution of paid excuse time.

