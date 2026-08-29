/**
 * Reconcile missing balance deductions for approved forms.
 * Production may have status-only migration without vacation/excuse deductions.
 *
 * Usage:
 *   node scripts/migrate-approvals.js           # dry-run (default)
 *   node scripts/migrate-approvals.js --execute   # apply changes
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Form = require('../models/Form');
const User = require('../models/User');
const Audit = require('../models/Audit');
const { getSystemSettings } = require('../utils/getSystemSettings');
const { deductVacationBalanceOnApproval } = require('../utils/vacationBalance');
const { createAuditLog } = require('../routes/audit');

const EXECUTE = process.argv.includes('--execute');

async function hasVacationDeductionAudit(formId) {
    const id = formId.toString();
    const hit = await Audit.findOne({
        action: 'VACATION_DAYS_MODIFIED',
        'details.formId': id
    }).select('_id').lean();
    return Boolean(hit);
}

async function migrateLegacyStatuses() {
    const legacy = await Form.updateMany(
        { status: 'manager_approved' },
        { $set: { status: 'approved' } }
    );
    const legacyRejected = await Form.updateMany(
        { status: 'manager_rejected' },
        { $set: { status: 'rejected' } }
    );
    console.log(`Legacy status updates: approved=${legacy.modifiedCount}, rejected=${legacyRejected.modifiedCount}`);
}

async function reconcileVacationForms(settings) {
    const forms = await Form.find({
        status: 'approved',
        type: 'vacation',
        vacationType: { $in: ['annual', 'casual'] }
    }).populate('user', 'name email department vacationDaysLeft casualDaysLeft');

    let scanned = 0;
    let skippedHasAudit = 0;
    let skippedInsufficient = 0;
    let applied = 0;

    for (const form of forms) {
        scanned += 1;
        if (await hasVacationDeductionAudit(form._id)) {
            skippedHasAudit += 1;
            continue;
        }

        const employee = await User.findById(form.user._id || form.user);
        if (!employee) {
            console.warn(`SKIP: employee missing for form ${form._id}`);
            continue;
        }

        const clone = employee.toObject();
        const userDoc = new User(clone);
        userDoc.isNew = false;

        const deduction = deductVacationBalanceOnApproval(userDoc, form, settings);
        if (deduction.error) {
            skippedInsufficient += 1;
            console.warn(`SKIP insufficient balance: form=${form._id} user=${employee.name} — ${deduction.error}`);
            continue;
        }

        if (!deduction.days) {
            continue;
        }

        console.log(
            `${EXECUTE ? 'APPLY' : 'DRY-RUN'} vacation deduction: form=${form._id} user=${employee.name} ` +
            `${deduction.field} ${deduction.oldBalance} → ${deduction.newBalance} (-${deduction.days})`
        );

        if (EXECUTE) {
            employee[deduction.field] = deduction.newBalance;
            await employee.save();

            await createAuditLog({
                action: 'VACATION_DAYS_MODIFIED',
                performedBy: employee._id,
                targetUser: employee._id,
                targetResource: 'user',
                targetResourceId: employee._id,
                description: `[migrate-approvals] ${form.vacationType} vacation days deducted for ${employee.name}: ${deduction.days} days (Form ID: ${form._id})`,
                oldValues: { [deduction.field]: deduction.oldBalance },
                newValues: { [deduction.field]: deduction.newBalance },
                details: {
                    targetUserName: employee.name,
                    targetUserEmail: employee.email,
                    targetUserDepartment: employee.department,
                    changeAmount: -(deduction.days),
                    formId: form._id.toString(),
                    formType: 'vacation',
                    vacationType: form.vacationType,
                    vacationStartDate: form.startDate,
                    vacationEndDate: form.endDate,
                    daysDeducted: deduction.days,
                    reason: 'Reconciliation script for missing post-approval deduction',
                    approvedBy: 'migrate-approvals'
                },
                severity: 'MEDIUM'
            });
        }

        applied += 1;
    }

    return { scanned, skippedHasAudit, skippedInsufficient, applied };
}

async function reconcileUnpaidExcuses() {
    const forms = await Form.find({
        status: 'approved',
        type: 'excuse',
        excuseType: 'unpaid'
    }).populate('user', 'name email department vacationDaysLeft');

    let scanned = 0;
    let skippedHasAudit = 0;
    let skippedInsufficient = 0;
    let applied = 0;

    for (const form of forms) {
        scanned += 1;
        if (await hasVacationDeductionAudit(form._id)) {
            skippedHasAudit += 1;
            continue;
        }

        const employee = await User.findById(form.user._id || form.user);
        if (!employee) continue;

        if ((employee.vacationDaysLeft ?? 0) < 0.5) {
            skippedInsufficient += 1;
            console.warn(`SKIP unpaid excuse: form=${form._id} user=${employee.name} insufficient balance`);
            continue;
        }

        const oldBalance = employee.vacationDaysLeft;
        const newBalance = Math.max(0, oldBalance - 0.5);

        console.log(
            `${EXECUTE ? 'APPLY' : 'DRY-RUN'} unpaid excuse: form=${form._id} user=${employee.name} ` +
            `vacationDaysLeft ${oldBalance} → ${newBalance}`
        );

        if (EXECUTE) {
            employee.vacationDaysLeft = newBalance;
            await employee.save();

            await createAuditLog({
                action: 'VACATION_DAYS_MODIFIED',
                performedBy: employee._id,
                targetUser: employee._id,
                targetResource: 'user',
                targetResourceId: employee._id,
                description: `[migrate-approvals] Unpaid excuse deduction for ${employee.name} (Form ID: ${form._id})`,
                oldValues: { vacationDaysLeft: oldBalance },
                newValues: { vacationDaysLeft: newBalance },
                details: {
                    targetUserName: employee.name,
                    targetUserEmail: employee.email,
                    targetUserDepartment: employee.department,
                    changeAmount: -0.5,
                    formId: form._id.toString(),
                    formType: 'excuse',
                    excuseType: 'unpaid',
                    daysDeducted: 0.5,
                    reason: 'Reconciliation script for missing unpaid excuse deduction',
                    approvedBy: 'migrate-approvals'
                },
                severity: 'MEDIUM'
            });
        }

        applied += 1;
    }

    return { scanned, skippedHasAudit, skippedInsufficient, applied };
}

async function main() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/hr-erp';
    await mongoose.connect(uri);
    console.log(`Connected (${EXECUTE ? 'EXECUTE' : 'DRY-RUN'} mode)\n`);

    await migrateLegacyStatuses();

    const settings = await getSystemSettings();
    const vacationResult = await reconcileVacationForms(settings);
    const excuseResult = await reconcileUnpaidExcuses();

    console.log('\n=== SUMMARY ===');
    console.log('Vacation forms:', vacationResult);
    console.log('Unpaid excuse forms:', excuseResult);

    if (!EXECUTE) {
        console.log('\nNo changes written. Re-run with --execute to apply.');
    }

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
