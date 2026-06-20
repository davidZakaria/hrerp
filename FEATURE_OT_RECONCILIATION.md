# Feature Specification: OT Variance Reconciliation & Deduction System

## 1. Business Objective
Implement a Time and Attendance Reconciliation system for the HR ERP. The system calculates overtime (OT) and deductions based on actual employee check-in/check-out times (biometric fingerprint data) compared against manager-approved Overtime Requests.

## 2. Role-Based Access Control (RBAC) Updates
Before building the calculator, the Overtime Request form permissions must be updated:
- **Employees (All):** Must have permission to view, fill out, and submit the "Overtime Request" forms.
- **Managers / HR Admins:** Only users with these roles can view the submission queue, approve/reject requests, and input the final `approved_hours` value.

## 3. Core Calculation Logic (The "Pro-Rata OT Authorization Rule")
This logic determines the final payable overtime hours by comparing what the employee actually worked versus what the manager approved.

**Variables:**
- `Actual_OT`: The exact raw hours recorded by the biometric scanner (calculated from check-in/check-out).
- `Approved_OT`: The hours a manager explicitly signed off on via the OT Request Form.
- `Variance`: Calculated as `Actual_OT - Approved_OT`.

**The Rules:**
1. **If Actual > Approved:** 
   - Flag/Color: Green (Positive Variance)
   - Action: The system *will take the approved hours*. (e.g., If employee stays 2 hours but manager approved 1 hour, pay for 1 hour).
2. **If Actual < Approved:** 
   - Flag/Color: Red (Negative Variance / Deduction)
   - Action: The system *will take the punching / actual hours*. (e.g., If manager approved 2 hours but employee left after 1 hour, pay for 1 hour).

**Universal Mathematical Formula:**
To simplify the backend logic, use this strict programmatic rule:
`Final_Payable_OT = Math.min(Actual_OT, Approved_OT)`

## 4. UI Dashboard & Reporting Requirements
The HR Admin Dashboard requires two distinct table views based on the whiteboard specifications:

### A. Detailed OT Report (Data Ingestion Layer)
This table shows the raw discrepancies before final payroll.
**Columns Required:**
- Employee Name
- Title
- Department
- Location
- OT (fingerprint actuals)
- Approved OT
- Variance (Actual - Approved). *Must be styled conditionally: Green text/badge if Actual > Approved, Red text/badge if Actual < Approved.*

### B. Final OT Report (Data Output Layer)
This table shows the reconciled, clean hours ready for payroll processing.
**Columns Required:**
- Employee Code
- Employee Name
- Title
- Department
- Location
- Final OT Hrs (Result of the Core Calculation Logic)

## 5. Export & KPI Integrations
- The "Final OT Report" view must include an **"Export to Excel"** button.
- This button will download the reconciled table data as a `.xlsx` or `.csv` file so HR can push the final data into high-level performance metric dashboards and process payroll.