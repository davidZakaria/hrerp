---
name: Biometric Attendance System Implementation
overview: ""
todos:
  - id: d5bb56e1-5efd-48dd-9b49-a02547a861f5
    content: Update User model with employeeCode and workSchedule fields, create Attendance model
    status: completed
  - id: 1b9a8d91-9878-4c98-a308-e4884a5ead45
    content: Install xlsx package and create XLS parsing utility functions
    status: completed
  - id: e2ad4433-595b-45d6-b206-0a21ee8d8fb9
    content: Create attendance routes with upload, calculation, and cross-reference logic
    status: completed
  - id: ad08990a-4912-431a-ace8-8f3faf511c8c
    content: Update registration form to include employeeCode and work schedule selection
    status: completed
  - id: 3e598246-ee3d-4d4e-8288-17be045b5f7d
    content: Create attendance upload interface in admin dashboard
    status: completed
  - id: 61bed067-8b0b-466c-822d-b36318b88fd6
    content: Create attendance viewing interface in admin dashboard with employee reports
    status: completed
  - id: 070c53a1-c985-4e6c-86f3-0367b8f24553
    content: Create employee attendance viewing section in employee dashboard
    status: completed
  - id: eb143a22-54f9-4d38-96c3-e00b135c4c19
    content: "Test complete flow: upload XLS files, verify calculations, check cross-referencing with forms, validate UI displays"
    status: completed
---

# Biometric Attendance System Implementation

## Backend Changes

### 1. Update User Model (`models/User.js`)

Add new fields for biometric integration and work schedules:

- `employeeCode`: Unique identifier matching biometric device (required during registration)
- `workSchedule`: Object containing `startTime` and `endTime` (e.g., "10:30" and "18:30")
- Add index on `employeeCode` for fast lookups

### 2. Create Attendance Model (`models/Attendance.js`)

New schema to store biometric data:

- `employeeCode`: Reference to employee
- `user`: ObjectId reference to User
- `date`: Date of attendance
- `clockIn`: Time clocked in
- `clockOut`: Time clocked out
- `status`: enum ['present', 'late', 'absent', 'excused', 'on_leave']
- `location`: Which of 6 locations
- `minutesLate`: Calculated minutes late (if any)
- `isExcused`: Boolean if covered by approved excuse/leave
- `relatedForm`: Reference to approved Form (if applicable)
- `month`: String (YYYY-MM) for easy querying
- `uploadedBy`: Admin who uploaded the data
- `uploadedAt`: Timestamp

### 3. Install XLS Parser

Add `xlsx` package to parse Excel files:

```bash
npm install xlsx
```

### 4. Create Attendance Routes (`routes/attendance.js`)

New route file with endpoints:

**Admin Endpoints:**

- `POST /api/attendance/upload` - Upload XLS files (accepts multiple files)
  - Parse each XLS file
  - Extract employee code, name, date, clock-in, clock-out
  - Match employeeCode to User records
  - Calculate late arrivals based on employee's work schedule
  - Cross-reference with approved Forms (vacation, excuse, sick_leave)
  - Mark attendance as 'excused' or 'on_leave' if covered by approved form
  - Store in Attendance collection

- `GET /api/attendance/monthly-report/:month` - Get all employees' attendance for a month
  - Admin can see everyone's attendance
  - Include both raw and adjusted data
  - Summary statistics per employee

- `GET /api/attendance/employee/:userId/:month` - Get specific employee's attendance
  - Admin view of single employee

**Employee Endpoints:**

- `GET /api/attendance/my-attendance/:month` - Employee views their own attendance
  - Daily breakdown with timestamps
  - Status for each day (present/late/absent/excused)
  - Summary statistics
  - Show which absences were covered by approved forms

**Shared Logic:**

- Helper function `calculateAttendanceStatus(clockIn, clockOut, workSchedule, approvedForms)`
- Helper function `crossReferenceWithForms(date, userId)` - checks if date is covered by approved vacation/excuse/sick leave
- Helper function `parseXLSFile(filePath)` - extracts data from Excel

### 5. Update Server.js

- Add attendance routes: `app.use('/api/attendance', require('./routes/attendance'))`
- Configure multer for multiple file uploads

## Frontend Changes

### 6. Update Registration (`hr-erp-frontend/src/components/Auth/Register.js`)

- Add `employeeCode` input field (required)
- Add work schedule selection dropdown with exactly 4 options:
  - "11:00 AM - 7:00 PM"
  - "10:30 AM - 6:30 PM"
  - "9:30 AM - 6:30 PM"
  - "8:30 AM - 4:30 PM"
- Submit employeeCode and selected workSchedule to backend

### 7. Update Admin Dashboard (`hr-erp-frontend/src/components/SuperAdminDashboard.js`)

Add new "Attendance Management" section:

**Upload Interface:**

- File upload component accepting multiple .xls/.xlsx files
- Show progress indicator during upload
- Display success/error messages with details (matched employees, unmatched codes)
- Button: "Upload Monthly Attendance (6 locations)"

**View Attendance:**

- Month selector (dropdown for year/month)
- Table showing all employees with:
  - Employee name and code
  - Days present / Total working days
  - Late arrivals count
  - Total absences
  - Excused absences (from approved forms)
  - Unexcused absences
  - Link to view detailed report for each employee

**Detailed Employee Report (Modal/Page):**

- Calendar view or table with daily breakdown
- Each day shows: Date, Status, Clock-in, Clock-out, Minutes Late
- Highlight days covered by approved forms (different color)
- Summary statistics

### 8. Update Employee Dashboard (`hr-erp-frontend/src/components/Dashboard.js`)

Add new "My Attendance" section:

**Display:**

- Month selector
- Summary cards:
  - Total days present
  - Days late
  - Total absences
  - Excused absences (with links to approved forms)
  - Unexcused absences
- Daily breakdown table:
  - Date, Day of week, Clock-in time, Clock-out time, Status badge
  - Color coding: Green (present), Yellow (late), Red (absent), Blue (excused/on leave)
- Note explaining: "Absences covered by approved vacation/excuse forms are marked as 'Excused'"

### 9. Create New Component (`hr-erp-frontend/src/components/AttendanceReport.js`)

Reusable component for displaying attendance data:

- Props: `attendanceData`, `isAdmin`, `userId`
- Shows daily details, summary stats
- Can be used in both admin and employee dashboards

## Data Flow

### Upload Process (25th of each month):

1. Admin navigates to Attendance section
2. Selects 6 XLS files from different locations
3. Clicks "Upload"
4. Backend processes each file:

   - Parses rows
   - Matches employeeCode to users
   - Calculates late arrivals
   - Checks approved forms for that date range
   - Marks attendance status
   - Stores in database

5. Returns summary: X records processed, Y employees matched, Z unmatched codes

### View Process (Employee):

1. Employee opens dashboard
2. Sees "My Attendance" widget showing current month summary
3. Clicks to expand full report
4. Views daily breakdown with status and timestamps
5. Can see which absences are covered by their approved forms

### View Process (Admin):

1. Admin opens Attendance section
2. Selects month
3. Sees table of all employees with summary stats
4. Clicks on employee to see detailed daily breakdown
5. Can export report (optional future enhancement)

## Technical Considerations

- **XLS Format Assumptions**: 
  - Column headers: Employee Code, Name, Date, Clock In, Clock Out
  - Date format: Handle common formats (MM/DD/YYYY, DD/MM/YYYY, etc.)

- **Time Calculations**:
  - Compare clock-in time with employee's workSchedule.startTime
  - Grace period: Consider 5-10 minutes as acceptable (configurable)

- **Form Cross-Reference**:
  - Query Forms collection for approved forms where date falls within range
  - Types: vacation, excuse, sick_leave with status 'approved' or 'manager_approved'

- **Unmatched Employee Codes**:
  - Log unmatched codes for admin review
  - Return in upload response so admin can correct

- **Data Validation**:
  - Validate XLS structure before processing
  - Handle missing clock-out times (still at work or forgot to clock out)
  - Prevent duplicate uploads for same month

## Files to Create/Modify

**New Files:**

- `models/Attendance.js`
- `routes/attendance.js`
- `hr-erp-frontend/src/components/AttendanceReport.js`
- `hr-erp-frontend/src/components/AttendanceUpload.js`

**Modified Files:**

- `models/User.js` (add employeeCode, workSchedule)
- `server.js` (add attendance routes)
- `routes/auth.js` (handle employeeCode in registration)
- `hr-erp-frontend/src/components/Auth/Register.js` (add fields)
- `hr-erp-frontend/src/components/SuperAdminDashboard.js` (add attendance section)
- `hr-erp-frontend/src/components/Dashboard.js` (add attendance widget)
- `package.json` (add xlsx dependency)