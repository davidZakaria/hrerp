# Feature Specification: Advanced Deduction System

## 1. Business Objective
Implement an automated Deduction Calculator for the HR ERP. The system calculates salary deductions based on three core violations: 
1. **Lateness / Early Leaving:** Exact minute-by-minute deduction after a 15-minute grace period.
2. **Missing Punches (In or Out):** A progressive penalty system based on monthly frequency.
3. **Full Absence:** Missing a full day without an approved form.

## 2. Forms & Waivers (Reconciliation)
Before any deduction is finalized, the system must check for approved forms (Excuse, Permission, Leave) for that specific date. Approved forms cancel out biometric deductions.

## 3. Core Calculation Logic (The 3 Pillars of Deduction)

### Pillar A: Missing Punch Progressive Penalty (In OR Out)
Applies when an employee has an IN punch but no OUT punch, or vice versa. Track occurrences per month:
- **1st Time:** 0 deduction (1st Warning).
- **2nd Time:** 0 deduction (Verbal Warning).
- **3rd Time:** 1/4 Day Deduction (0.25).
- **4th Time:** 1/2 Day Deduction (0.50).
- **5th Time:** 3/4 Day Deduction (0.75).
- **6th Time & Up:** 1 Full Day Deduction (1.0).

### Pillar B: Time Shortfall (Exact Minute Deduction)
Applies to late arrivals and early departures.
- **Grace Period:** 15 minutes per day.
- **Rule 1:** Calculate `Total_Shortfall_Minutes` = (Minutes Late) + (Minutes Left Early).
- **Rule 2:** If `Total_Shortfall_Minutes <= 15`, then Deduction = 0.
- **Rule 3:** If `Total_Shortfall_Minutes > 15`, deduct the exact total minutes (including the initial 15). 
- **Math for Payroll:** To convert this into a "Day" fraction for the CSV export, use: `Deduction Days = Total_Shortfall_Minutes / (Standard Shift Hours * 60)`. *(Example: 30 minutes late on an 8-hour shift = 30 / 480 = 0.0625 Days).*

### Pillar C: Full Absence
- **Rule:** NO biometric logs (No IN, No OUT) and no approved leave form.
- **Penalty:** 1 Full Day Deduction (1.0).

## 4. UI Dashboard: Deduction Detailed Report
**Columns Required:**
- Code
- Name
- Title
- Department
- Location
- Missing (In or Out) *(Displays Pillar A penalty, e.g. "3rd Time - 1/4 Day")*
- Shortfall Minutes *(Displays Pillar B total minutes late/early)*

## 5. Export to CSV (Clean HR Report)
**Exact Headers to Export:**
`Code2, National ID, English Name, Arabic Name, Job Title, Department, Location, overtime per day, overtime per Hours, Total overtime, Total Deduction Days`
*(Note: 'Total Deduction Days' is the sum of Pillar A, Pillar B, and Pillar C).*