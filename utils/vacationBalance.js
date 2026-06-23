const { calculateVacationDeductionDays } = require('./vacationDays');

const DEDUCTIBLE_VACATION_TYPES = ['annual', 'casual'];

function vacationBalanceField(vacationType) {
    return vacationType === 'casual' ? 'casualDaysLeft' : 'vacationDaysLeft';
}

function defaultVacationBalance(vacationType, settings) {
    if (vacationType === 'casual') {
        return settings?.casualVacationDays ?? 6;
    }
    return settings?.annualVacationDays ?? 15;
}

function vacationTypeLabel(vacationType) {
    return vacationType === 'casual' ? 'casual' : 'annual';
}

/**
 * Deduct vacation balance when a vacation form is approved.
 * @returns {{ error?: string, days?: number, field?: string, oldBalance?: number, newBalance?: number }}
 */
function deductVacationBalanceOnApproval(employee, form, settings) {
    if (form.type !== 'vacation' || !DEDUCTIBLE_VACATION_TYPES.includes(form.vacationType)) {
        return {};
    }

    const field = vacationBalanceField(form.vacationType);
    const days = calculateVacationDeductionDays({
        startDate: form.startDate,
        endDate: form.endDate,
        isHalfDay: form.isHalfDay
    });
    const balance = employee[field] ?? defaultVacationBalance(form.vacationType, settings);

    if (balance < days) {
        return {
            error: `Cannot approve: Employee has insufficient ${vacationTypeLabel(form.vacationType)} vacation days (${balance} remaining, ${days} requested)`
        };
    }

    const oldBalance = balance;
    employee[field] = Math.max(0, balance - days);
    return {
        days,
        field,
        oldBalance,
        newBalance: employee[field]
    };
}

module.exports = {
    DEDUCTIBLE_VACATION_TYPES,
    vacationBalanceField,
    defaultVacationBalance,
    deductVacationBalanceOnApproval
};
