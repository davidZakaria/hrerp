const mongoose = require('mongoose');

const SINGLETON_KEY = 'global';

const systemSettingsSchema = new mongoose.Schema({
    /** Enforces a single document in this collection */
    singletonKey: {
        type: String,
        default: SINGLETON_KEY,
        unique: true,
        immutable: true
    },
    companyName: {
        type: String,
        default: 'NEW JERSEY DEVELOPMENTS',
        trim: true
    },
    annualVacationDays: {
        type: Number,
        default: 15,
        min: 0
    },
    casualVacationDays: {
        type: Number,
        default: 6,
        min: 0
    },
    monthlyExcuseRequests: {
        type: Number,
        default: 2,
        min: 0
    },
    payPeriodAnchorDay: {
        type: Number,
        default: 25,
        min: 1,
        max: 31
    },
    latenessGracePeriodMinutes: {
        type: Number,
        default: 15,
        min: 0
    },
    standardShiftHours: {
        type: Number,
        default: 8,
        min: 0
    }
}, {
    timestamps: true
});

/**
 * Returns the singleton settings document, creating defaults if missing.
 */
systemSettingsSchema.statics.getOrCreate = async function getOrCreate() {
    const existing = await this.findOne({ singletonKey: SINGLETON_KEY });
    if (existing) {
        let needsSave = false;
        if (existing.casualVacationDays == null) {
            existing.casualVacationDays = 6;
            needsSave = true;
        }
        if (needsSave) {
            await existing.save();
        }
        return existing;
    }

    try {
        return await this.create({ singletonKey: SINGLETON_KEY });
    } catch (err) {
        if (err.code === 11000) {
            return this.findOne({ singletonKey: SINGLETON_KEY });
        }
        throw err;
    }
};

/** Public fields returned by the API (excludes internal singleton key). */
systemSettingsSchema.methods.toPublicJSON = function toPublicJSON() {
    return {
        companyName: this.companyName,
        annualVacationDays: this.annualVacationDays,
        casualVacationDays: this.casualVacationDays,
        monthlyExcuseRequests: this.monthlyExcuseRequests,
        payPeriodAnchorDay: this.payPeriodAnchorDay,
        latenessGracePeriodMinutes: this.latenessGracePeriodMinutes,
        standardShiftHours: this.standardShiftHours,
        updatedAt: this.updatedAt
    };
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
module.exports.SINGLETON_KEY = SINGLETON_KEY;
