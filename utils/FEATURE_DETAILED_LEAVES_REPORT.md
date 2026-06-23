# Feature Specification: Detailed Leaves & Absenteeism Report

## 1. Business Objective & Settings Update
- **Database (`SystemSettings` & `User` models):** 
  - Change default Annual Leaves from 21 to **15**.
  - Add a new field for **Casual Leaves** (Default: **6**) in both `SystemSettings` (as `casualVacationDays`) and the `User` schema (as `casualDaysLeft`).
- **Forms (`Form` model):**
  - Add `casual` to the allowed `vacationType` enums so employees can request it.

## 2. Core Mathematical Logic (Monthly Aggregation)
To generate the report, calculate these variables per employee for the selected month:

**A. Approved Leaves:**
- `App_Annual`: Sum of approved forms where type is vacation and vacationType is annual.
- `App_Casual`: Sum of approved forms where type is vacation and vacationType is casual.
- `App_Sick`: Sum of approved forms where type is sick leave.
- `Total_Approved = App_Annual + App_Casual + App_Sick`

**B. Absenteeism Calculation:**
- `Absent_Raw`: Total days in the month where the employee has NO attendance logs (No IN, No OUT). This includes weekends.
- `Absent_Actual = Absent_Raw` MINUS (Fridays, Saturdays, and official dates found in `config/attendanceHolidays.js` or `.json`).

**C. Variance & Penalty Deduction (The Whiteboard Rule):**
- `Variance = Absent_Actual - Total_Approved`
- **Rule 1 (Perfect Match):** If `Variance == 0`, `Deduction = 0` (Color: Green).
- **Rule 2 (Negative):** If `Variance < 0` (Actual < Approved), `Deduction = 0` (Color: Green).
- **Rule 3 (Penalty):** If `Variance > 0` (Actual > Approved), `Deduction = Variance * 2` (Color: Red). *(1 unexcused day missing = 2 days penalty).*

**D. Dynamic Reason Generation:**
- If the employee has approved forms for the month, combine their types/reasons (e.g., "Annual Leave, Sick Leave").
- If `Variance > 0`, explicitly append "Unexcused Absence Penalty" to the reason.
- If `Variance == 0` and `Absent_Actual == 0`, output "Perfect Attendance".

## 3. UI Dashboard: Detailed Leaves Report
Build a UI table in the Admin Dashboard matching the physical whiteboard.
**Columns:**
1. Code
2. Name
3. Title
4. Department
5. Location
6. Approved Annual Days (Out of 15)
7. Approved Casual Leaves (Out of 6)
8. Approved Sick Leaves
9. Absent Days (Raw missing physical logs)
10. Actual Absent Days (Raw minus weekends/holidays)
11. Variance (Colored Red if > 0, Green if <= 0)
12. Deduction Leaves (Value & Color coded Red if > 0)
13. Reason

**Must Have:** Add an "Export to CSV" button that perfectly mirrors these columns for the Payroll team.