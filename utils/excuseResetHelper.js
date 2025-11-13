/**
 * Helper functions for excuse request reset logic (25th of each month)
 */

/**
 * Check if excuse requests need to be reset based on 25th of the month
 * @param {Date} lastResetDate - The date when requests were last reset
 * @returns {boolean} - True if reset is needed
 */
function shouldResetExcuseRequests(lastResetDate) {
    const now = new Date();
    const resetDay = 25; // Reset on the 25th of each month
    
    if (!lastResetDate) {
        return true; // No reset date means never reset, so reset now
    }
    
    const lastReset = new Date(lastResetDate);
    
    // Get the 25th of current month
    const currentMonth25th = new Date(now.getFullYear(), now.getMonth(), resetDay);
    
    // Get the 25th of last month
    const lastMonth25th = new Date(now.getFullYear(), now.getMonth() - 1, resetDay);
    
    // If today is on or after the 25th of this month
    if (now.getDate() >= resetDay) {
        // Reset if last reset was before the 25th of this month
        return lastReset < currentMonth25th;
    } else {
        // If today is before the 25th, reset if last reset was before the 25th of last month
        return lastReset < lastMonth25th;
    }
}

/**
 * Get the next reset date (25th of next month)
 * @returns {Date} - The next reset date
 */
function getNextResetDate() {
    const now = new Date();
    const resetDay = 25;
    
    // If today is before the 25th, next reset is the 25th of this month
    if (now.getDate() < resetDay) {
        return new Date(now.getFullYear(), now.getMonth(), resetDay);
    } else {
        // Otherwise, next reset is the 25th of next month
        return new Date(now.getFullYear(), now.getMonth() + 1, resetDay);
    }
}

/**
 * Get the display text for reset information
 * @param {Date} lastResetDate - The date when requests were last reset
 * @returns {string} - Display text
 */
function getResetDisplayText(lastResetDate) {
    const nextReset = getNextResetDate();
    const dayOfMonth = nextReset.getDate();
    const monthName = nextReset.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    return `Resets on ${dayOfMonth}th of each month | Next: ${monthName}`;
}

module.exports = {
    shouldResetExcuseRequests,
    getNextResetDate,
    getResetDisplayText
};

