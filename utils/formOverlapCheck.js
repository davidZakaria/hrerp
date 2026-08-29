const Form = require('../models/Form');

const BLOCKING_STATUSES = ['pending', 'approved'];

function dayStart(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function dayEnd(d) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
}

/**
 * Build a MongoDB overlap filter for a form type and inclusive date range.
 */
function overlapFilterForType(type, rangeStart, rangeEnd) {
    const start = dayStart(rangeStart);
    const end = dayEnd(rangeEnd);

    switch (type) {
        case 'vacation':
            return {
                startDate: { $lte: end },
                endDate: { $gte: start }
            };
        case 'sick_leave':
            return {
                sickLeaveStartDate: { $lte: end },
                sickLeaveEndDate: { $gte: start }
            };
        case 'mission':
            return {
                missionStartDate: { $lte: end },
                missionEndDate: { $gte: start }
            };
        case 'wfh':
            return {
                wfhDate: { $gte: start, $lte: end }
            };
        case 'extra_hours':
            return {
                extraHoursDate: { $gte: start, $lte: end }
            };
        case 'excuse':
            return {
                excuseDate: { $gte: start, $lte: end }
            };
        default:
            return null;
    }
}

/**
 * Returns an overlapping form document if the user already has pending/approved
 * request for the same type and overlapping dates.
 */
async function findOverlappingForm(userId, type, rangeStart, rangeEnd) {
    const dateFilter = overlapFilterForType(type, rangeStart, rangeEnd);
    if (!dateFilter) {
        return null;
    }

    return Form.findOne({
        user: userId,
        type,
        status: { $in: BLOCKING_STATUSES },
        ...dateFilter
    }).select('_id status type startDate endDate');
}

module.exports = {
    BLOCKING_STATUSES,
    findOverlappingForm,
    overlapFilterForType
};
