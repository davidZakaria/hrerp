const fs = require('fs');
const path = require('path');

let cachedSet = null;
let cachedMtime = null;

function loadHolidayDateKeys() {
    const env = process.env.ATTENDANCE_HOLIDAYS;
    if (env && env.trim()) {
        try {
            const arr = JSON.parse(env);
            return new Set(Array.isArray(arr) ? arr : []);
        } catch {
            const parts = env.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
            return new Set(parts);
        }
    }
    const filePath = path.join(__dirname, '..', 'config', 'attendanceHolidays.json');
    try {
        const stat = fs.statSync(filePath);
        if (cachedSet && cachedMtime === stat.mtimeMs) {
            return cachedSet;
        }
        const raw = fs.readFileSync(filePath, 'utf8');
        const arr = JSON.parse(raw);
        cachedSet = new Set(Array.isArray(arr) ? arr : []);
        cachedMtime = stat.mtimeMs;
        return cachedSet;
    } catch {
        return new Set();
    }
}

function isHolidayDateKey(dateKey) {
    return loadHolidayDateKeys().has(dateKey);
}

module.exports = {
    isHolidayDateKey,
    loadHolidayDateKeys
};
