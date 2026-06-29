const Attendance = require('../models/Attendance');
const Form = require('../models/Form');
const {
    buildOtReconciliationRow,
    getFingerprintOtForAttendance,
    otReconciliationDateKey,
    roundHours
} = require('./otReconciliation');

const USER_POPULATE = 'name department employeeCode jobTitle location';

function summarizeOtRows(detailed) {
    const totals = detailed.reduce(
        (acc, row) => {
            acc.totalFingerprint += Number(row.actualPunchingHours) || 0;
            acc.totalApproved += Number(row.approvedHours) || 0;
            acc.totalFinalPayable += Number(row.finalPayableHours) || 0;
            acc.totalVariance += Number(row.variance) || 0;
            return acc;
        },
        { totalFingerprint: 0, totalApproved: 0, totalFinalPayable: 0, totalVariance: 0 }
    );
    return {
        totalFingerprint: roundHours(totals.totalFingerprint),
        totalApproved: roundHours(totals.totalApproved),
        totalFinalPayable: roundHours(totals.totalFinalPayable),
        totalVariance: roundHours(totals.totalVariance)
    };
}

/**
 * Build OT reconciliation payload for one user or the whole org.
 * @param {Date} rangeStart
 * @param {Date} rangeEnd
 * @param {{ userId?: string }} [options]
 */
async function buildOtReconciliationPayload(rangeStart, rangeEnd, { userId = null } = {}) {
    const userScope = userId ? { user: userId } : {};
    const dateFilter = { extraHoursDate: { $gte: rangeStart, $lte: rangeEnd } };

    const [attendanceRecords, forms, otFormsForReason, pendingHrCount, pendingManagerCount, totalOtInRange] = await Promise.all([
        Attendance.find({
            date: { $gte: rangeStart, $lte: rangeEnd },
            clockIn: { $exists: true, $ne: '' },
            clockOut: { $exists: true, $ne: '' },
            ...userScope
        }).populate('user', USER_POPULATE).lean(),
        Form.find({
            type: 'extra_hours',
            status: 'approved',
            ...dateFilter,
            ...userScope
        })
            .populate('user', USER_POPULATE)
            .sort({ extraHoursDate: 1 }).lean(),
        Form.find({
            type: 'extra_hours',
            status: { $ne: 'rejected' },
            ...dateFilter,
            ...userScope
        })
            .populate('user', USER_POPULATE)
            .sort({ extraHoursDate: 1 }).lean(),
        Form.countDocuments({
            type: 'extra_hours',
            status: { $in: ['manager_approved', 'manager_submitted'] },
            ...dateFilter,
            ...userScope
        }),
        Form.countDocuments({
            type: 'extra_hours',
            status: 'pending',
            ...dateFilter,
            ...userScope
        }),
        Form.countDocuments({
            type: 'extra_hours',
            ...dateFilter,
            ...userScope
        })
    ]);

    const formMap = new Map();
    for (const form of forms) {
        if (!form.user?._id) continue;
        formMap.set(otReconciliationDateKey(form.user._id, form.extraHoursDate), form);
    }

    const reasonFormMap = new Map();
    for (const form of otFormsForReason) {
        if (!form.user?._id) continue;
        const key = otReconciliationDateKey(form.user._id, form.extraHoursDate);
        if (!reasonFormMap.has(key)) {
            reasonFormMap.set(key, form);
        }
    }

    const rowMap = new Map();

    for (const att of attendanceRecords) {
        if (!att.user?._id) continue;
        const fp = getFingerprintOtForAttendance(att);
        if (fp.hours <= 0) continue;

        const key = otReconciliationDateKey(att.user._id, att.date);
        const form = formMap.get(key) || null;
        const reasonForm = reasonFormMap.get(key) || null;
        rowMap.set(
            key,
            buildOtReconciliationRow({
                form,
                reasonForm,
                attendanceRecord: att,
                user: att.user,
                otDate: att.date,
                rowKey: key
            })
        );
    }

    for (const form of forms) {
        if (!form.user?._id) continue;
        const key = otReconciliationDateKey(form.user._id, form.extraHoursDate);
        if (rowMap.has(key)) continue;
        rowMap.set(
            key,
            buildOtReconciliationRow({
                form,
                reasonForm: reasonFormMap.get(key) || form,
                attendanceRecord: null,
                user: form.user,
                actualHours: 0,
                otDate: form.extraHoursDate,
                rowKey: key
            })
        );
    }

    for (const form of otFormsForReason) {
        if (!form.user?._id) continue;
        const key = otReconciliationDateKey(form.user._id, form.extraHoursDate);
        if (rowMap.has(key)) continue;
        rowMap.set(
            key,
            buildOtReconciliationRow({
                form: formMap.get(key) || null,
                reasonForm: form,
                attendanceRecord: null,
                user: form.user,
                actualHours: 0,
                otDate: form.extraHoursDate,
                rowKey: key
            })
        );
    }

    const detailed = Array.from(rowMap.values()).sort((a, b) => new Date(a.otDate) - new Date(b.otDate));

    const final = forms
        .filter((form) => form.user?._id)
        .map((form) => {
            const key = otReconciliationDateKey(form.user._id, form.extraHoursDate);
            const row =
                rowMap.get(key) ||
                buildOtReconciliationRow({
                    form,
                    reasonForm: reasonFormMap.get(key) || form,
                    attendanceRecord: null,
                    user: form.user,
                    actualHours: 0,
                    otDate: form.extraHoursDate,
                    rowKey: key
                });
            const approved = Number(row.approvedHours) || 0;
            if (approved <= 0) return null;
            return {
                rowKey: row.rowKey,
                formId: row.formId,
                employeeCode: row.employeeCode,
                employeeName: row.employeeName,
                department: row.department,
                jobTitle: row.jobTitle,
                location: row.location,
                otDate: row.otDate,
                approvedHours: approved,
                actualPunchingHours: row.actualPunchingHours,
                finalPayableHours: row.finalPayableHours
            };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(a.otDate) - new Date(b.otDate));

    return {
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
        totalRequests: detailed.length,
        fingerprintOtDays: detailed.filter((r) => r.actualPunchingHours > 0).length,
        pendingManagerCount,
        pendingHrApprovalCount: pendingHrCount,
        hrApprovedFormCount: forms.length,
        totalOtRequestsInRange: totalOtInRange,
        summary: summarizeOtRows(detailed),
        detailed,
        final
    };
}

module.exports = { buildOtReconciliationPayload, summarizeOtRows };
