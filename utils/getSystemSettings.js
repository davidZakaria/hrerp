const SystemSettings = require('../models/SystemSettings');

const CACHE_TTL_MS = 60 * 1000;

/** Fallback values when DB is unavailable (match SystemSettings schema defaults). */
const DEFAULTS = {
    companyName: 'NEW JERSEY DEVELOPMENTS',
    annualVacationDays: 15,
    casualVacationDays: 6,
    monthlyExcuseRequests: 2,
    payPeriodAnchorDay: 25,
    latenessGracePeriodMinutes: 15,
    standardShiftHours: 8
};

let cache = { doc: null, expiresAt: 0 };

function toPlainSettings(doc) {
    return {
        companyName: doc.companyName,
        annualVacationDays: doc.annualVacationDays,
        casualVacationDays: doc.casualVacationDays,
        monthlyExcuseRequests: doc.monthlyExcuseRequests,
        payPeriodAnchorDay: doc.payPeriodAnchorDay,
        latenessGracePeriodMinutes: doc.latenessGracePeriodMinutes,
        standardShiftHours: doc.standardShiftHours
    };
}

/**
 * Load singleton system settings (cached briefly to reduce DB reads).
 */
async function getSystemSettings() {
    const now = Date.now();
    if (cache.doc && cache.expiresAt > now) {
        return cache.doc;
    }

    try {
        const doc = await SystemSettings.getOrCreate();
        cache = {
            doc: toPlainSettings(doc),
            expiresAt: now + CACHE_TTL_MS
        };
        return cache.doc;
    } catch (err) {
        console.error('[getSystemSettings] falling back to defaults:', err.message);
        return { ...DEFAULTS };
    }
}

function getSystemSettingsDefaults() {
    return { ...DEFAULTS };
}

function invalidateSystemSettingsCache() {
    cache = { doc: null, expiresAt: 0 };
}

module.exports = {
    getSystemSettings,
    getSystemSettingsDefaults,
    invalidateSystemSettingsCache,
    DEFAULTS
};
