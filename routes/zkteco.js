/**
 * ZKTeco ADMS listener - receives real-time attendance from biometric devices
 * Endpoints: GET/POST /iclock/cdata, GET /iclock/getrequest
 */
const express = require('express');
const router = express.Router();
const { parseAttlogBody } = require('../utils/zktecoParser');
const {
    calculateAttendanceStatus,
    getMonthString,
    isWeekend
} = require('../utils/attendanceParser');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Form = require('../models/Form');

const GRACE_MINUTES = 5;
const defaultWorkSchedule = { startTime: '10:00', endTime: '19:00' };

let cachedSystemUserId = null;

async function getSystemUserId() {
    if (cachedSystemUserId) return cachedSystemUserId;
    if (process.env.ZKTECO_SYSTEM_USER_ID) {
        cachedSystemUserId = process.env.ZKTECO_SYSTEM_USER_ID;
        return cachedSystemUserId;
    }
    const superAdmin = await User.findOne({ role: 'super_admin' }).select('_id');
    cachedSystemUserId = superAdmin ? superAdmin._id.toString() : null;
    return cachedSystemUserId;
}

async function findUserByEmployeeCode(code) {
    const c = String(code || '').trim();
    let user = await User.findOne({ employeeCode: c });
    if (!user) {
        const variants = [
            c,
            'EMP' + c,
            'EMP' + c.padStart(4, '0'),
            c.padStart(4, '0'),
            c.padStart(3, '0')
        ].filter((v, i, a) => a.indexOf(v) === i);
        for (const v of variants) {
            user = await User.findOne({ employeeCode: v });
            if (user) break;
        }
    }
    return user;
}

async function crossReferenceWithForms(date, userId) {
    try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const approvedStatuses = ['approved', 'manager_approved', 'manager_submitted'];

        const vacationForm = await Form.findOne({
            user: userId,
            type: 'vacation',
            status: { $in: approvedStatuses },
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay }
        });
        if (vacationForm) return { form: vacationForm, status: 'on_leave' };

        const sickLeaveForm = await Form.findOne({
            user: userId,
            type: 'sick_leave',
            status: { $in: approvedStatuses },
            sickLeaveStartDate: { $lte: endOfDay },
            sickLeaveEndDate: { $gte: startOfDay }
        });
        if (sickLeaveForm) return { form: sickLeaveForm, status: 'on_leave' };

        const excuseForm = await Form.findOne({
            user: userId,
            type: 'excuse',
            status: { $in: approvedStatuses },
            excuseDate: { $gte: startOfDay, $lte: endOfDay }
        });
        if (excuseForm) return { form: excuseForm, status: 'excused' };

        const wfhForm = await Form.findOne({
            user: userId,
            type: 'wfh',
            status: { $in: approvedStatuses },
            wfhDate: { $gte: startOfDay, $lte: endOfDay }
        });
        if (wfhForm) return { form: wfhForm, status: 'wfh' };

        return null;
    } catch (err) {
        console.error('[zkteco] crossReferenceWithForms error:', err);
        return null;
    }
}

function timeToHHMM(date) {
    const h = date.getHours();
    const m = date.getMinutes();
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function applyDedupAndFILO(punches) {
    const byKey = {};
    for (const p of punches) {
        const dateOnly = new Date(p.timestamp);
        dateOnly.setHours(0, 0, 0, 0);
        const key = `${p.employeeCode}|${dateOnly.getTime()}`;
        if (!byKey[key]) byKey[key] = [];
        byKey[key].push(p);
    }

    const result = [];
    for (const key of Object.keys(byKey)) {
        const list = byKey[key];
        list.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        const filtered = [];
        for (let i = 0; i < list.length; i++) {
            const curr = list[i];
            const prev = filtered[filtered.length - 1];
            if (prev && (curr.timestamp.getTime() - prev.timestamp.getTime()) < GRACE_MINUTES * 60 * 1000) {
                continue;
            }
            filtered.push(curr);
        }

        if (filtered.length > 0) {
            const first = filtered[0];
            const last = filtered[filtered.length - 1];
            result.push({
                employeeCode: first.employeeCode,
                date: new Date(first.timestamp.getFullYear(), first.timestamp.getMonth(), first.timestamp.getDate()),
                clockIn: timeToHHMM(first.timestamp),
                clockOut: filtered.length > 1 ? timeToHHMM(last.timestamp) : null
            });
        }
    }
    return result;
}

async function processAttlogBatch(punches, deviceSN) {
    if (!punches || punches.length === 0) return;

    const systemUserId = await getSystemUserId();
    if (!systemUserId) {
        console.error('[zkteco] No system user for uploadedBy. Set ZKTECO_SYSTEM_USER_ID or ensure a super_admin exists.');
        return;
    }

    const records = applyDedupAndFILO(punches);
    const location = deviceSN || 'zkteco';
    let saved = 0;
    let updated = 0;

    for (const rec of records) {
        try {
            const user = await findUserByEmployeeCode(rec.employeeCode);
            if (!user) {
                console.warn(`[zkteco] Unmatched employeeCode: ${rec.employeeCode}`);
                continue;
            }

            if (isWeekend(rec.date)) {
                continue;
            }

            const month = getMonthString(rec.date);
            const workSchedule = (user.workSchedule && user.workSchedule.startTime)
                ? user.workSchedule
                : defaultWorkSchedule;
            const attendanceStatus = calculateAttendanceStatus(
                rec.clockIn,
                rec.clockOut,
                workSchedule,
                15
            );

            let status = attendanceStatus.status;
            let isExcused = false;
            let relatedForm = null;
            const formRef = await crossReferenceWithForms(rec.date, user._id);
            if (formRef) {
                status = formRef.status;
                isExcused = true;
                relatedForm = formRef.form._id;
            }

            const existing = await Attendance.findOne({ user: user._id, date: rec.date });
            const payload = {
                employeeCode: user.employeeCode,
                clockIn: rec.clockIn || '',
                clockOut: rec.clockOut || '',
                status,
                minutesLate: attendanceStatus.minutesLate,
                minutesOvertime: attendanceStatus.minutesOvertime,
                missedClockIn: attendanceStatus.missedClockIn,
                missedClockOut: attendanceStatus.missedClockOut,
                isExcused,
                relatedForm,
                month,
                uploadedBy: systemUserId,
                uploadedAt: new Date(),
                location,
                source: 'zkteco'
            };

            if (existing) {
                existing.clockIn = payload.clockIn;
                existing.clockOut = payload.clockOut;
                existing.status = payload.status;
                existing.minutesLate = payload.minutesLate;
                existing.minutesOvertime = payload.minutesOvertime;
                existing.missedClockIn = payload.missedClockIn;
                existing.missedClockOut = payload.missedClockOut;
                existing.isExcused = payload.isExcused;
                existing.relatedForm = payload.relatedForm;
                existing.uploadedBy = payload.uploadedBy;
                existing.uploadedAt = payload.uploadedAt;
                existing.location = payload.location;
                existing.source = payload.source;
                await existing.save();
                updated++;
            } else {
                await Attendance.create({
                    ...payload,
                    user: user._id,
                    date: rec.date
                });
                saved++;
            }
        } catch (err) {
            console.error(`[zkteco] Error processing ${rec.employeeCode}:`, err);
        }
    }
    if (saved > 0 || updated > 0) {
        console.log(`[ZKTeco] Processed: ${saved} new, ${updated} updated attendance record(s)`);
    }
}

// GET /iclock/cdata - Handshake
router.get('/cdata', (req, res) => {
    const sn = req.query.SN || '';
    console.log(`[ZKTeco] Handshake from device SN=${sn || '(empty)'} IP=${req.ip} at ${new Date().toISOString()}`);
    const config = `GET OPTION FROM: ${sn} Stamp=9999 OpStamp=9999 ErrorDelay=60 Delay=30 TransTimes=00:00;14:05 TransInterval=1 TransFlag=1111000000 Realtime=1 Encrypt=0`;
    res.type('text/plain').send(config);
});

// POST /iclock/cdata - Data ingestion
router.post('/cdata', (req, res) => {
    const table = req.query.table;
    const deviceSN = req.query.SN || '';

    if (table !== 'ATTLOG') {
        console.log(`[ZKTeco] POST cdata table=${table || '(empty)'} - not ATTLOG, skipping. IP=${req.ip}`);
        return res.type('text/plain').send('OK');
    }

    const body = req.body || '';
    const punches = parseAttlogBody(body);
    console.log(`[ZKTeco] Data push from device SN=${deviceSN || '(empty)'} IP=${req.ip} - ${punches.length} punch(es) at ${new Date().toISOString()}`);

    res.type('text/plain').send('OK');

    setImmediate(() => {
        processAttlogBatch(punches, deviceSN).catch(err => {
            console.error('[zkteco] Async processAttlogBatch error:', err);
        });
    });
});

// Throttle getrequest logs (device polls every ~30s) - log at most once per minute per IP
const getrequestLogLast = new Map();
const GETREQUEST_LOG_INTERVAL_MS = 60000;

// GET /iclock/getrequest - Command polling
router.get('/getrequest', (req, res) => {
    const now = Date.now();
    const key = req.ip;
    const last = getrequestLogLast.get(key) || 0;
    if (now - last > GETREQUEST_LOG_INTERVAL_MS) {
        console.log(`[ZKTeco] Command poll from device SN=${req.query.SN || '(empty)'} IP=${req.ip} - device is connected`);
        getrequestLogLast.set(key, now);
    }
    res.type('text/plain').send('OK');
});

module.exports = router;
