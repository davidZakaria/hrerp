# Biometric Attendance System - Testing Guide

## Prerequisites
- Backend server running on port 5001
- Frontend running on port 3000
- MongoDB connected

## Testing Steps

### 1. Register a Test Employee with Biometric Info

1. Go to registration page
2. Fill in the form with:
   - Name: Test Employee
   - Email: test@example.com
   - Password: test123
   - Department: (select any)
   - **Employee Code: EMP001** (important - this matches biometric device)
   - **Work Schedule: 10:30 AM - 6:30 PM** (or any option)
3. Submit and wait for admin approval

### 2. Approve the Employee (As Admin)

1. Log in as admin/super_admin
2. Go to User Management tab
3. Find the pending user
4. Approve the user

### 3. Create a Sample XLS File for Testing

Create an Excel file named `attendance-sample.xlsx` with the following structure:

| Employee Code | Name | Date | Clock In | Clock Out |
|--------------|------|------|----------|-----------|
| EMP001 | Test Employee | 1/15/2025 | 10:25 | 18:35 |
| EMP001 | Test Employee | 1/16/2025 | 10:45 | 18:30 |
| EMP001 | Test Employee | 1/17/2025 | 10:30 | 18:28 |
| EMP001 | Test Employee | 1/20/2025 | 11:00 | 18:45 |
| EMP001 | Test Employee | 1/21/2025 | 10:20 | 18:30 |

**What this tests:**
- Row 1: On time (within 10-min grace period)
- Row 2: Late (15 minutes late)
- Row 3: Exactly on time
- Row 4: Late (30 minutes late)
- Row 5: Early (10 minutes early)

### 4. Upload Attendance File (As Admin)

1. Log in as admin
2. Go to **Attendance** tab
3. Click "Choose Files" and select your `attendance-sample.xlsx`
4. Click "Upload Attendance Files"
5. Verify the results:
   - ✓ Should show "5 records processed"
   - ✓ Should show "5 successful records"
   - ✓ Should show "0 failed records"
   - ✓ Should show "0 unmatched codes"

### 5. View Monthly Report (As Admin)

1. While still in Attendance tab
2. Select the month (January 2025 or current month)
3. Verify the table shows:
   - Employee: Test Employee
   - Code: EMP001
   - Total Days: 5
   - Present: ~3 (depends on grace period)
   - Late: ~2
4. Click "View Details" button
5. Verify the modal shows:
   - Daily breakdown with all 5 days
   - Clock in/out times matching your XLS file
   - Status badges (Present/Late)
   - Minutes late for late arrivals

### 6. Test Cross-Reference with Forms

#### Create and Approve a Vacation Form

1. Log in as the test employee (test@example.com)
2. Submit a vacation form for a date in your test data (e.g., Jan 22-23, 2025)
3. Have a manager/admin approve it

#### Create New Attendance Data for Those Dates

Create another XLS file with attendance showing the employee was absent:

| Employee Code | Name | Date | Clock In | Clock Out |
|--------------|------|------|----------|-----------|
| EMP001 | Test Employee | 1/22/2025 | - | - |
| EMP001 | Test Employee | 1/23/2025 | - | - |

(Leave Clock In/Out empty or don't include these dates in XLS at all)

#### Upload and Verify

1. Upload the new XLS file as admin
2. View the attendance report
3. Verify that:
   - Days 22-23 are marked as "ON LEAVE" (not absent)
   - They appear in "On Leave" count, not "Absent" count
   - The status badge is purple, not red

### 7. View as Employee

1. Log out and log in as test employee (test@example.com)
2. Scroll to "My Attendance" section at the bottom
3. Verify you see:
   - Summary statistics (Present, Late, etc.)
   - Daily breakdown table with all days
   - Status badges matching admin view
   - Note explaining excused absences

### 8. Test Excuse Form Cross-Reference

1. As employee, submit an excuse form for one of the days you were late (e.g., Jan 16)
2. Have manager approve it
3. Refresh attendance view
4. Verify that day is now marked as "EXCUSED" instead of "LATE"

### 9. Test with Multiple Employees

1. Register 2-3 more employees with different:
   - Employee codes (EMP002, EMP003, etc.)
   - Work schedules (try all 4 options)
2. Create XLS with attendance for all employees
3. Upload and verify:
   - All employees are matched correctly
   - Late calculations are correct based on their different schedules
   - Admin can view all employees in one table

### 10. Test Unmatched Employee Code

1. Create an XLS with an employee code that doesn't exist (e.g., EMP999)
2. Upload it
3. Verify the upload result shows:
   - "Unmatched employee codes: 1"
   - Details showing which code couldn't be matched
   - The file name where it was found

### 11. Test Different File Formats

Try uploading:
- `.xls` (Excel 97-2003)
- `.xlsx` (Excel 2007+)
- Invalid files (should show error)
- Empty files (should handle gracefully)

### 12. Test Date/Time Formats

Create XLS files with different date/time formats:
- MM/DD/YYYY (1/15/2025)
- DD/MM/YYYY (15/1/2025)
- YYYY-MM-DD (2025-01-15)
- 12-hour format with AM/PM (10:30 AM)
- 24-hour format (10:30)
- Excel time decimals (0.4375 = 10:30 AM)

Verify all formats are parsed correctly.

## Expected Results Summary

### ✓ Registration:
- Employee code field is required
- Work schedule field is required
- Unique employee codes enforced

### ✓ Admin Upload:
- Accepts multiple files
- Shows detailed results
- Reports unmatched codes
- Calculates late arrivals correctly
- Cross-references with forms automatically

### ✓ Admin View:
- Shows all employees in elegant table
- Summary statistics accurate
- Detail view shows daily breakdown
- Status badges color-coded correctly

### ✓ Employee View:
- Shows only own attendance
- Summary cards display correct numbers
- Daily table shows all days
- Status matches what admin sees

### ✓ Cross-Reference:
- Vacation forms → "On Leave" status
- Excuse forms → "Excused" status
- Sick leave forms → "On Leave" status
- Only approved forms are counted

### ✓ Calculations:
- Late = Clock-in > (Schedule start + 10 min grace)
- Minutes late = Exact difference
- Different schedules calculated independently
- Status badges match calculations

## Troubleshooting

### Issue: "No token, authorization denied"
- **Solution:** Make sure you're logged in

### Issue: "Unmatched employee codes"
- **Solution:** Verify employee code in User profile matches XLS file exactly

### Issue: "Invalid file format"
- **Solution:** Make sure file is .xls or .xlsx

### Issue: Attendance not showing
- **Solution:** Check that the month in your XLS data matches the selected month

### Issue: Wrong late calculations
- **Solution:** Verify employee's work schedule is set correctly

### Issue: Forms not cross-referencing
- **Solution:** Make sure forms are APPROVED before uploading attendance

## Sample Test Data

You can use this SQL/JSON to create test data programmatically if needed:

```javascript
// Test Employees
{
  name: "John Doe",
  email: "john@test.com",
  employeeCode: "EMP001",
  workSchedule: { startTime: "10:30", endTime: "18:30" },
  department: "IT"
}

{
  name: "Jane Smith",
  email: "jane@test.com",
  employeeCode: "EMP002",
  workSchedule: { startTime: "11:00", endTime: "19:00" },
  department: "HR"
}

{
  name: "Bob Wilson",
  email: "bob@test.com",
  employeeCode: "EMP003",
  workSchedule: { startTime: "09:30", endTime: "18:30" },
  department: "Finance"
}
```

## Performance Testing

For production readiness, test with:
- 100+ employees
- Multiple months of data
- 6 files simultaneously
- Large XLS files (1000+ rows)

All operations should complete within acceptable time limits.

