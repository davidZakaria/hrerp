# Reporting & Exports

[← Back to showcase index](../../APP_SHOWCASE.md) · [← User Administration](./04-user-administration.md)

---

## The problem it solves

End-of-month HR means copying data between spreadsheets, reconciling OT claims against punch logs, and building leave summaries by hand.

**Pre-built reports connect attendance, leave, and OT in one click — with CSV and print export where it matters.**

---

## Report catalog

| Report | Who uses it | What it answers |
|--------|-------------|-----------------|
| **Attendance summary** | Admin | Who was present, late, absent in a date range? |
| **Monthly attendance** | Admin | Month-wide org view |
| **Team attendance** | Manager | How is my department performing? |
| **OT reconciliation** | Admin / Payroll prep | Did approved OT match fingerprint hours? |
| **3-pillar deduction** | Admin / Payroll prep | Missing punch, lateness, absence breakdown |
| **Detailed leaves** | Admin | Balances + usage by employee |
| **Vacation days report** | Admin | Organization vacation summary |
| **Employee monthly snapshot** | Employee | My month at a glance |
| **Personal OT report** | Employee | My overtime history |
| **Form CSV / print** | Admin | Export approval pipeline for records |

---

## OT reconciliation — why it matters

Payroll disputes often start with overtime. This report compares:

- **Fingerprint-calculated OT** (from punches)
- **Approved OT forms** (from the leave module)

Discrepancies surface immediately — before they become payment errors.

> 📸 **Screenshot placeholder**
>
> ![OT reconciliation](./assets/09-ot-reconciliation.png)

---

## Deduction report — payroll-ready visibility

Three clear pillars per employee per period:

1. **Missing punch** — progressive monthly tiers
2. **Time shortfall** — lateness + early exit after grace
3. **Full absence** — no punch, no waiver

> 📸 **Screenshot placeholder**
>
> ![Deduction report](./assets/08-deduction-report.png)

---

## Form exports

Admin **Forms** tab includes:

- **CSV download** — filter by month, export pipeline data
- **Print** — formatted leave records for filing

---

## Pay period alignment

Reports and form filters align to the company's **25th → 25th** rolling pay period — the same boundary used for leave date validation.

---

## Key files (for developers)

| Area | Path |
|------|------|
| Report APIs | `routes/attendance.js`, `routes/forms.js` |
| OT payload builder | `utils/buildOtReconciliationPayload.js` |
| Deduction calculator | `utils/deductionCalculator.js` |
| Leaves calculator | `utils/detailedLeavesCalculator.js` |
| Monthly snapshot | `utils/buildEmployeeMonthlySnapshot.js` |
| Export UI | `hr-erp-frontend/src/components/ExportPrintButtons.js` |

---

[← User Administration](./04-user-administration.md) · [Next: Governance →](./06-governance.md)
