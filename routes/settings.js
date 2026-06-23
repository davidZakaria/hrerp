const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');
const { invalidateSystemSettingsCache } = require('../utils/getSystemSettings');

const EDITABLE_FIELDS = [
    'companyName',
    'annualVacationDays',
    'casualVacationDays',
    'monthlyExcuseRequests',
    'payPeriodAnchorDay',
    'latenessGracePeriodMinutes',
    'standardShiftHours'
];

async function requireSuperAdmin(req, res, next) {
    try {
        const user = await User.findById(req.user.id).select('role');
        if (!user) {
            return res.status(401).json({ msg: 'User not found. Please login again.' });
        }
        if (user.role !== 'super_admin') {
            return res.status(403).json({ msg: 'Not authorized — Super Admin role required' });
        }
        next();
    } catch (err) {
        console.error('[settings] requireSuperAdmin error:', err);
        res.status(500).json({ msg: 'Server error' });
    }
}

function validateSettingsPayload(body) {
    const errors = [];

    if (body.companyName !== undefined) {
        const name = String(body.companyName).trim();
        if (!name) errors.push('companyName cannot be empty');
    }

    const numberChecks = [
        { key: 'annualVacationDays', min: 0, max: 365 },
        { key: 'casualVacationDays', min: 0, max: 365 },
        { key: 'monthlyExcuseRequests', min: 0, max: 31 },
        { key: 'payPeriodAnchorDay', min: 1, max: 31 },
        { key: 'latenessGracePeriodMinutes', min: 0, max: 240 },
        { key: 'standardShiftHours', min: 0, max: 24 }
    ];

    for (const { key, min, max } of numberChecks) {
        if (body[key] === undefined) continue;
        const value = Number(body[key]);
        if (!Number.isFinite(value)) {
            errors.push(`${key} must be a number`);
            continue;
        }
        if (value < min || value > max) {
            errors.push(`${key} must be between ${min} and ${max}`);
        }
    }

    return errors;
}

// GET /api/settings — any authenticated user
router.get('/', auth, async (req, res) => {
    try {
        const settings = await SystemSettings.getOrCreate();
        res.json(settings.toPublicJSON());
    } catch (err) {
        console.error('[settings] GET error:', err);
        res.status(500).json({ msg: 'Failed to load system settings' });
    }
});

// PUT /api/settings — super_admin only
router.put('/', auth, requireSuperAdmin, async (req, res) => {
    try {
        const errors = validateSettingsPayload(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ msg: errors.join('; ') });
        }

        const settings = await SystemSettings.getOrCreate();

        for (const field of EDITABLE_FIELDS) {
            if (req.body[field] === undefined) continue;
            if (field === 'companyName') {
                settings.companyName = String(req.body.companyName).trim();
            } else {
                settings[field] = Number(req.body[field]);
            }
        }

        await settings.save();
        invalidateSystemSettingsCache();
        res.json({
            msg: 'System settings updated successfully',
            settings: settings.toPublicJSON()
        });
    } catch (err) {
        console.error('[settings] PUT error:', err);
        res.status(500).json({ msg: 'Failed to update system settings' });
    }
});

module.exports = router;
