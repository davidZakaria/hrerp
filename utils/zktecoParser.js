/**
 * ZKTeco ADMS ATTLOG plain-text parser
 * Format: AC-No Timestamp Status VerifyCode (space or tab separated)
 * Example: 105 2025-10-15 09:00:00 1 0
 */

/**
 * Parse ZKTeco timestamp string to Date
 * @param {String} str - Timestamp in YYYY-MM-DD HH:mm:ss format
 * @returns {Date|null} Parsed date or null if invalid
 */
function parseZktecoTimestamp(str) {
    if (!str || typeof str !== 'string') return null;
    const trimmed = str.trim();
    if (!trimmed) return null;

    // Match YYYY-MM-DD HH:mm:ss (with optional seconds)
    const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
    if (!match) return null;

    const [, year, month, day, hour, min, sec] = match;
    const date = new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        parseInt(hour, 10),
        parseInt(min, 10),
        parseInt(sec, 10)
    );

    return isNaN(date.getTime()) ? null : date;
}

/**
 * Parse ZKTeco ATTLOG plain-text body line by line
 * Format per line: AC-No Timestamp Status VerifyCode (space or tab separated)
 * @param {String} body - Plain text body from POST /iclock/cdata
 * @returns {Array<{employeeCode: string, timestamp: Date}>} Parsed punches
 */
function parseAttlogBody(body) {
    const result = [];
    if (!body || typeof body !== 'string') return result;

    const lines = body.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split by space or tab (timestamp "YYYY-MM-DD HH:mm:ss" may be one or two parts)
        const parts = line.split(/[\s\t]+/);
        if (parts.length < 2) {
            console.warn(`[zktecoParser] Skipping malformed line ${i + 1}: ${line}`);
            continue;
        }

        const employeeCode = String(parts[0]).trim();
        let timestampStr = parts[1];
        if (parts.length >= 3 && !timestampStr.includes(':')) {
            timestampStr = parts[1] + ' ' + parts[2];
        }
        const timestamp = parseZktecoTimestamp(timestampStr);

        if (!employeeCode) {
            console.warn(`[zktecoParser] Skipping line ${i + 1}: missing employee code`);
            continue;
        }
        if (!timestamp) {
            console.warn(`[zktecoParser] Skipping line ${i + 1}: invalid timestamp "${timestampStr}"`);
            continue;
        }

        result.push({ employeeCode, timestamp });
    }

    return result;
}

module.exports = {
    parseAttlogBody,
    parseZktecoTimestamp
};
