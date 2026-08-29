const { shouldResetExcuseRequests } = require('./excuseResetHelper');
const { normalizeExcuseType, isPaidExcuseExactlyTwoHours } = require('./excuseType');
const { createAuditLog } = require('../routes/audit');

/**
 * Validate excuse deduction before manager approval (no persistence).
 * @returns {{ ok: boolean, error?: string, deduction?: object }}
 */
function validateExcuseDeductionOnApproval(form, employee) {
    if (form.type !== 'excuse') {
        return { ok: true };
    }

    form.excuseType = normalizeExcuseType(form);

    if (form.excuseType === 'paid') {
        if (!isPaidExcuseExactlyTwoHours(form)) {
            return {
                ok: false,
                error: 'Cannot approve: paid excuse must be exactly 2 hours between from and to time.'
            };
        }

        if (shouldResetExcuseRequests(employee.excuseRequestsResetDate)) {
            employee.excuseRequestsLeft = 2;
            employee.excuseRequestsResetDate = new Date();
        }

        if ((employee.excuseRequestsLeft ?? 0) <= 0) {
            return {
                ok: false,
                error: 'Cannot approve: Employee has exhausted their 2 paid excuse requests for this month'
            };
        }

        return {
            ok: true,
            deduction: {
                type: 'paid',
                field: 'excuseRequestsLeft',
                oldBalance: employee.excuseRequestsLeft,
                newBalance: Math.max(0, employee.excuseRequestsLeft - 1)
            }
        };
    }

    if (form.excuseType === 'unpaid') {
        const balance = employee.vacationDaysLeft ?? 0;
        if (balance < 0.5) {
            return {
                ok: false,
                error: `Cannot approve: Employee has insufficient vacation days. Available: ${balance}, Required: 0.5`
            };
        }

        return {
            ok: true,
            deduction: {
                type: 'unpaid',
                field: 'vacationDaysLeft',
                oldBalance: balance,
                newBalance: Math.max(0, balance - 0.5),
                days: 0.5
            }
        };
    }

    return { ok: false, error: `Unknown excuse type: ${form.excuseType}` };
}

/**
 * Persist excuse deduction after atomic form approval.
 */
async function persistExcuseDeductionOnApproval(form, employee, deduction, actor, req) {
    if (!deduction || form.type !== 'excuse') {
        return;
    }

    employee[deduction.field] = deduction.newBalance;
    await employee.save();

    if (deduction.type === 'unpaid') {
        await createAuditLog({
            action: 'VACATION_DAYS_MODIFIED',
            performedBy: actor._id,
            targetUser: employee._id,
            targetResource: 'user',
            targetResourceId: employee._id,
            description: `Unpaid excuse approved - deducted 0.5 vacation days for ${employee.name} (Form ID: ${form._id})`,
            oldValues: { vacationDaysLeft: deduction.oldBalance },
            newValues: { vacationDaysLeft: deduction.newBalance },
            details: {
                targetUserName: employee.name,
                targetUserEmail: employee.email,
                targetUserDepartment: employee.department,
                changeAmount: -0.5,
                formId: form._id.toString(),
                formType: 'excuse',
                excuseType: 'unpaid',
                daysDeducted: 0.5,
                reason: 'Automatic deduction upon unpaid excuse approval',
                approvedBy: actor.role
            },
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            severity: 'MEDIUM'
        });
    }
}

module.exports = {
    validateExcuseDeductionOnApproval,
    persistExcuseDeductionOnApproval
};
