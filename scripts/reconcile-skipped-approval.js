/**
 * Force-reconcile a single approved vacation form that migrate-approvals.js skipped
 * due to insufficient balance (form was approved before deduction ran).
 *
 * Usage:
 *   node scripts/reconcile-skipped-approval.js
 *   node scripts/reconcile-skipped-approval.js --execute
 *   node scripts/reconcile-skipped-approval.js --form-id=6a70c06551ba10bb7bd96fc4 --execute
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Form = require('../models/Form');
const User = require('../models/User');
const Audit = require('../models/Audit');
const { getSystemSettings } = require('../utils/getSystemSettings');
const {
    deductVacationBalanceOnApproval,
    vacationBalanceField
} = require('../utils/vacationBalance');
const { calculateVacationDeductionDays } = require('../utils/vacationDays');
const { createAuditLog } = require('../routes/audit');

const EXECUTE = process.argv.includes('--execute');
const formIdArg = process.argv.find((a) => a.startsWith('--form-id='));
const FORM_ID = formIdArg ? formIdArg.split('=')[1] : '6a70c06551ba10bb7bd96fc4';

async function hasVacationDeductionAudit(formId) {
    return Boolean(await Audit.findOne({
        action: 'VACATION_DAYS_MODIFIED',
        'details.formId': formId.toString()
    }).select('_id').lean());
}

async function main() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/hr-erp';
    await mongoose.connect(uri);
    console.log(`Connected (${EXECUTE ? 'EXECUTE' : 'DRY-RUN'})\n`);

    const form = await Form.findById(FORM_ID);
    if (!form) {
        console.error(`Form not found: ${FORM_ID}`);
        process.exit(1);
    }

    if (form.status !== 'approved' || form.type !== 'vacation') {
        console.error(`Form ${FORM_ID} is not an approved vacation (status=${form.status}, type=${form.type})`);
        process.exit(1);
    }

    if (await hasVacationDeductionAudit(form._id)) {
        console.log(`Form ${FORM_ID} already has a VACATION_DAYS_MODIFIED audit. Nothing to do.`);
        await mongoose.disconnect();
        return;
    }

    const employee = await User.findById(form.user);
    if (!employee) {
        console.error('Employee not found for form');
        process.exit(1);
    }

    const settings = await getSystemSettings();
    const field = vacationBalanceField(form.vacationType);
    const days = calculateVacationDeductionDays({
        startDate: form.startDate,
        endDate: form.endDate,
        isHalfDay: form.isHalfDay
    });
    const oldBalance = employee[field] ?? 0;
    const newBalance = oldBalance - days;

    console.log('Form:', form._id.toString());
    console.log('Employee:', employee.name, `(${employee.email})`);
    console.log('Vacation type:', form.vacationType);
    console.log('Dates:', form.startDate?.toISOString?.()?.slice(0, 10), '→', form.endDate?.toISOString?.()?.slice(0, 10));
    console.log(`Deduction: ${field} ${oldBalance} → ${newBalance} (-${days} days)`);

    if (newBalance < 0) {
        console.warn('WARNING: Balance will go negative. Form was already approved; recording true liability.');
    }

    const check = deductVacationBalanceOnApproval(
        Object.assign(employee, { [field]: oldBalance }),
        form,
        settings
    );
    if (check.error && newBalance >= 0) {
        console.error('Unexpected:', check.error);
        process.exit(1);
    }

    if (!EXECUTE) {
        console.log('\nNo changes written. Re-run with --execute to apply.');
        await mongoose.disconnect();
        return;
    }

    employee[field] = newBalance;
    await employee.save();

    await createAuditLog({
        action: 'VACATION_DAYS_MODIFIED',
        performedBy: employee._id,
        targetUser: employee._id,
        targetResource: 'user',
        targetResourceId: employee._id,
        description: `[reconcile-skipped-approval] ${form.vacationType} vacation days deducted for ${employee.name}: ${days} days (Form ID: ${form._id})`,
        oldValues: { [field]: oldBalance },
        newValues: { [field]: newBalance },
        details: {
            targetUserName: employee.name,
            targetUserEmail: employee.email,
            targetUserDepartment: employee.department,
            changeAmount: -days,
            formId: form._id.toString(),
            formType: 'vacation',
            vacationType: form.vacationType,
            vacationStartDate: form.startDate,
            vacationEndDate: form.endDate,
            daysDeducted: days,
            reason: 'Forced reconciliation for approved form skipped due to insufficient balance during bulk migration',
            approvedBy: 'reconcile-skipped-approval',
            balanceWentNegative: newBalance < 0
        },
        severity: 'HIGH'
    });

    console.log('\nApplied successfully.');
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
