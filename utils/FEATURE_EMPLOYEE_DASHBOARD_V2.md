# Feature Specification: Smart Employee Dashboard V2

## 1. The "Smart Hero" Section (Warm EX)
- **Time-Aware Greeting:** Use the employee's local time to display "Good morning 🌅", "Good afternoon ☕", or "Good evening 🌙", followed by their First Name.
- **User Identity:** Display their Profile Picture (Avatar) with the click-to-upload feature (`multer`). If no picture is uploaded, show a colorful circle with their initials. Below it, show their `jobTitle` and `department`.

## 2. The "Leave Wallet" (Visual Cards)
Instead of a boring table, use a modern CSS Grid with rounded cards (`borderRadius: 16px`, soft drop shadows) to show their exact remaining balances:
1. **Annual Leaves:** `vacationDaysLeft` (Out of 15) - Color: Soft Blue
2. **Casual Leaves:** `casualDaysLeft` (Out of 6) - Color: Soft Purple
3. **Paid Excuses:** `excuseRequestsLeft` (Out of 2) - Color: Soft Orange

## 3. The "My Monthly Snapshot" Section
Transparency reduces HR tickets. Show the employee their *own* data for the current month based on the heavy math we just built:
- **My Overtime:** Show their personal OT for the month (Requested, Approved, and the **Reason**).
- **My Absences & Deductions:** Show their personal Absent Days, Variance, and if they received the "1 day = 2 days" penalty deduction.
- **My Shortfall:** Show their total lateness minutes.

## 4. Quick Actions Bar
A floating row of beautifully styled buttons that open the existing form modals:
- ➕ Request Leave (Annual/Casual/Sick)
- ➕ Request Overtime
- ➕ Request Excuse