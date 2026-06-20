/**
 * Helper functions for excuse request reset logic (25th of each month)
 */

/**
 * Check if excuse requests need to be reset based on pay-period anchor day.
 * @param {Date} lastResetDate - The date when requests were last reset
 * @param {number} [resetDay=25] - Day of month when quotas reset
 * @returns {boolean} - True if reset is needed
 */
function shouldResetExcuseRequests(lastResetDate, resetDay = 25) {
    const now = new Date();
    const anchorDay = Math.min(Math.max(Number(resetDay) || 25, 1), 31);
    
    if (!lastResetDate) {
        return true; // No reset date means never reset, so reset now
    }
    
    const lastReset = new Date(lastResetDate);
    
    const currentMonthAnchor = new Date(now.getFullYear(), now.getMonth(), anchorDay);
    const lastMonthAnchor = new Date(now.getFullYear(), now.getMonth() - 1, anchorDay);

    if (now.getDate() >= anchorDay) {
        return lastReset < currentMonthAnchor;
    }
    return lastReset < lastMonthAnchor;
}

/**
 * Get the next reset date (anchor day of current or next month)
 * @param {number} [resetDay=25]
 * @returns {Date}
 */
function getNextResetDate(resetDay = 25) {
    const now = new Date();
    const anchorDay = Math.min(Math.max(Number(resetDay) || 25, 1), 31);

    if (now.getDate() < anchorDay) {
        return new Date(now.getFullYear(), now.getMonth(), anchorDay);
    }
    return new Date(now.getFullYear(), now.getMonth() + 1, anchorDay);
}

/**
 * Get the display text for reset information
 * @param {Date} lastResetDate
 * @param {number} [resetDay=25]
 * @returns {string}
 */
function getResetDisplayText(lastResetDate, resetDay = 25) {
    const nextReset = getNextResetDate(resetDay);
    const dayOfMonth = nextReset.getDate();
    const monthName = nextReset.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    return `Resets on ${dayOfMonth}th of each month | Next: ${monthName}`;
}

/** Default paid excuse quota per reset cycle */
const DEFAULT_EXCUSE_REQUESTS_QUOTA = 2;

/**
 * MongoDB $set payload for resetting excuse request quota (cron / admin reset).
 * @param {number} [quota=2]
 * @returns {{ excuseRequestsLeft: number, excuseRequestsResetDate: Date }}
 */
function buildExcuseQuotaResetUpdate(quota = DEFAULT_EXCUSE_REQUESTS_QUOTA) {
    return {
        excuseRequestsLeft: quota,
        excuseRequestsResetDate: new Date()
    };
}

module.exports = {
    shouldResetExcuseRequests,
    getNextResetDate,
    getResetDisplayText,
    DEFAULT_EXCUSE_REQUESTS_QUOTA,
    buildExcuseQuotaResetUpdate
};

