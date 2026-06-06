/**
 * OT Variance Reconciliation — pure calculation utilities.
 * Compares biometric actual OT hours vs manager-approved OT hours.
 */

function roundHours(hours) {
    return Math.round(hours * 100) / 100;
}

/**
 * Core pro-rata OT authorization rule.
 * @param {number} actualPunchingHours - Fingerprint-derived OT hours
 * @param {number} approvedHours - Manager-approved OT hours
 */
function reconcileOvertime(actualPunchingHours, approvedHours) {
    const actual = Number(actualPunchingHours) || 0;
    const approved = Number(approvedHours) || 0;
    const variance = roundHours(actual - approved);
    const finalPayableHours = roundHours(Math.min(actual, approved));

    let varianceFlag = 'neutral';
    if (variance > 0) varianceFlag = 'positive';
    if (variance < 0) varianceFlag = 'negative';

    return {
        actualPunchingHours: roundHours(actual),
        approvedHours: roundHours(approved),
        variance,
        finalPayableHours,
        varianceFlag
    };
}

/**
 * Build a per-request reconciliation row from form + attendance + user data.
 */
function buildOtReconciliationRow({ form, attendanceRecord, user }) {
    const actualHours = (attendanceRecord?.minutesOvertime ?? 0) / 60;
    const approvedHours = form.approvedHours ?? form.extraHoursWorked ?? 0;
    const calc = reconcileOvertime(actualHours, approvedHours);

    return {
        formId: form._id,
        employeeCode: user.employeeCode || '',
        employeeName: user.name,
        department: user.department,
        otDate: form.extraHoursDate,
        requestedHours: form.extraHoursWorked,
        ...calc
    };
}

module.exports = {
    reconcileOvertime,
    buildOtReconciliationRow,
    roundHours
};
