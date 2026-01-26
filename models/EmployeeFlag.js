const mongoose = require('mongoose');

const employeeFlagSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    flaggedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['deduction', 'reward'],
        required: true
    },
    reason: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    deactivatedAt: {
        type: Date
    },
    deactivatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

// Indexes for efficient queries
employeeFlagSchema.index({ employee: 1, isActive: 1 });
employeeFlagSchema.index({ flaggedBy: 1 });
employeeFlagSchema.index({ type: 1, isActive: 1 });
employeeFlagSchema.index({ createdAt: -1 });

// Virtual for flag age
employeeFlagSchema.virtual('ageInDays').get(function() {
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Static method to get active flags for an employee
employeeFlagSchema.statics.getActiveFlags = function(employeeId) {
    return this.find({ employee: employeeId, isActive: true })
        .populate('flaggedBy', 'name email')
        .sort({ createdAt: -1 });
};

// Static method to get all active flags for multiple employees
employeeFlagSchema.statics.getActiveFlagsForEmployees = function(employeeIds) {
    return this.find({ employee: { $in: employeeIds }, isActive: true })
        .populate('flaggedBy', 'name email')
        .populate('employee', 'name email department')
        .sort({ createdAt: -1 });
};

// Instance method to deactivate a flag
employeeFlagSchema.methods.deactivate = function(userId) {
    this.isActive = false;
    this.deactivatedAt = new Date();
    this.deactivatedBy = userId;
    return this.save();
};

module.exports = mongoose.model('EmployeeFlag', employeeFlagSchema);
