/**
 * Single source of truth for excuse paid vs unpaid display and persistence.
 */

/**
 * @param {string} [fromHour]
 * @param {string} [toHour]
 * @returns {number|null}
 */
function getExcuseDurationHours(fromHour, toHour) {
    if (!fromHour || !toHour) return null;
    try {
        const fromTime = new Date(`2000-01-01T${String(fromHour).trim()}`);
        const toTime = new Date(`2000-01-01T${String(toHour).trim()}`);
        if (Number.isNaN(fromTime.getTime()) || Number.isNaN(toTime.getTime())) return null;
        return (toTime - fromTime) / (1000 * 60 * 60);
    } catch {
        return null;
    }
}

/**
 * @param {{ type?: string, excuseType?: string, fromHour?: string, toHour?: string }} form
 * @returns {'paid'|'unpaid'|undefined}
 */
function normalizeExcuseType(form) {
    if (!form || form.type !== 'excuse') return undefined;
    const et = form.excuseType;
    if (et === 'paid' || et === 'unpaid') return et;
    const hours = getExcuseDurationHours(form.fromHour, form.toHour);
    if (hours === null || Number.isNaN(hours)) return 'unpaid';
    if (hours === 2) return 'paid';
    return 'unpaid';
}

/**
 * @param {{ excuseType?: string, fromHour?: string, toHour?: string }} form
 * @returns {boolean}
 */
function isPaidExcuseExactlyTwoHours(form) {
    const hours = getExcuseDurationHours(form.fromHour, form.toHour);
    return hours === 2;
}

module.exports = {
    getExcuseDurationHours,
    normalizeExcuseType,
    isPaidExcuseExactlyTwoHours
};
