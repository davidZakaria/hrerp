const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    employeeCode: {
        type: String,
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    clockIn: {
        type: String, // Store as "HH:MM" format
        required: true
    },
    clockOut: {
        type: String, // Store as "HH:MM" format
        required: false // Optional in case employee forgot to clock out
    },
    status: {
        type: String,
        enum: ['present', 'late', 'absent', 'excused', 'on_leave', 'wfh'],
        required: true,
        default: 'present'
    },
    location: {
        type: String, // Which of the 6 locations
        required: false
    },
    minutesLate: {
        type: Number,
        default: 0
    },
    minutesOvertime: {
        type: Number,
        default: 0
    },
    missedClockIn: {
        type: Boolean,
        default: false
    },
    missedClockOut: {
        type: Boolean,
        default: false
    },
    // Fingerprint deduction tracking
    fingerprintDeduction: {
        type: Number,
        default: 0 // Deduction in days for this specific record (0.25, 0.5, 0.75, or 1)
    },
    fingerprintMissType: {
        type: String,
        enum: ['none', 'clock_in', 'clock_out', 'both'],
        default: 'none'
    },
    isExcused: {
        type: Boolean,
        default: false
    },
    relatedForm: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Form',
        required: false // Only if covered by approved form
    },
    month: {
        type: String, // Format: "YYYY-MM" for easy querying
        required: true,
        index: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound indexes for common queries
attendanceSchema.index({ user: 1, month: 1 });
attendanceSchema.index({ user: 1, date: 1 });
attendanceSchema.index({ employeeCode: 1, month: 1 });
attendanceSchema.index({ month: 1, status: 1 });

// Prevent duplicate attendance records for same user/date
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

// Static method to get monthly attendance for a user
attendanceSchema.statics.getMonthlyAttendance = function(userId, month) {
    return this.find({ user: userId, month })
        .populate('relatedForm', 'type status startDate endDate excuseDate')
        .sort({ date: 1 });
};

// Static method to get all employees' attendance for a month
attendanceSchema.statics.getAllMonthlyAttendance = function(month) {
    return this.find({ month })
        .populate('user', 'name email employeeCode department workSchedule')
        .populate('relatedForm', 'type status')
        .sort({ date: 1 });
};

// Static method to get attendance statistics for a user
attendanceSchema.statics.getUserStats = async function(userId, month) {
    const records = await this.find({ user: userId, month });
    
    const stats = {
        totalDays: records.length,
        present: records.filter(r => r.status === 'present').length,
        late: records.filter(r => r.status === 'late').length,
        absent: records.filter(r => r.status === 'absent').length,
        excused: records.filter(r => r.isExcused || r.status === 'excused').length,
        onLeave: records.filter(r => r.status === 'on_leave').length,
        wfh: records.filter(r => r.status === 'wfh').length,
        totalMinutesLate: records.reduce((sum, r) => sum + (r.minutesLate || 0), 0),
        totalMinutesOvertime: records.reduce((sum, r) => sum + (r.minutesOvertime || 0), 0),
        missedClockIns: records.filter(r => r.missedClockIn).length,
        missedClockOuts: records.filter(r => r.missedClockOut).length,
        // Fingerprint deduction stats
        totalFingerprintDeduction: records.reduce((sum, r) => sum + (r.fingerprintDeduction || 0), 0),
        fingerprintMisses: records.filter(r => r.fingerprintMissType && r.fingerprintMissType !== 'none').length
    };
    
    stats.unexcusedAbsences = stats.absent - stats.excused;
    
    return stats;
};

// Instance method to check if attendance is covered by a form
attendanceSchema.methods.checkFormCoverage = async function() {
    if (!this.relatedForm) return false;
    
    const Form = mongoose.model('Form');
    const form = await Form.findById(this.relatedForm);
    
    if (!form) return false;
    
    // Check if form is approved
    const approvedStatuses = ['approved', 'manager_approved', 'manager_submitted'];
    return approvedStatuses.includes(form.status);
};

module.exports = mongoose.model('Attendance', attendanceSchema);

