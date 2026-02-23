const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['vacation', 'excuse', 'wfh', 'sick_leave', 'extra_hours', 'mission'],
        required: true
    },
    vacationType: {
        type: String,
        enum: ['annual'], // Only annual vacation allowed, unpaid removed
        required: function() {
            return this.type === 'vacation';
        }
    },
    startDate: {
        type: Date,
        required: function() {
            return this.type === 'vacation';
        }
    },
    endDate: {
        type: Date,
        required: function() {
            return this.type === 'vacation';
        }
    },
    excuseDate: {
        type: Date,
        required: function() {
            return this.type === 'excuse';
        }
    },
    excuseType: {
        type: String,
        enum: ['paid', 'unpaid'],
        required: function() {
            return this.type === 'excuse';
        }
    },
    // Sick leave specific fields
    sickLeaveStartDate: {
        type: Date,
        required: function() {
            return this.type === 'sick_leave';
        }
    },
    sickLeaveEndDate: {
        type: Date,
        required: function() {
            return this.type === 'sick_leave';
        }
    },
    medicalDocument: {
        type: String, // Store file path/URL
        required: false
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'manager_approved', 'manager_submitted', 'approved', 'rejected', 'manager_rejected'],
        default: 'pending'
    },
    adminComment: {
        type: String,
        default: ''
    },
    managerComment: {
        type: String,
        default: ''
    },
    managerApprovedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    managerApprovedAt: {
        type: Date
    },
    adminApprovedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    adminApprovedAt: {
        type: Date
    },
    fromHour: String,
    toHour: String,
    // Working from home fields (for Marketing department)
    wfhDate: {
        type: Date,
        required: function() {
            return this.type === 'wfh';
        }
    },
    wfhWorkingOn: {
        type: String, // Free text description of what they're working on
        required: function() {
            return this.type === 'wfh';
        }
    },
    // Legacy WFH fields (kept for backward compatibility)
    wfhDescription: String,
    wfhHours: Number,
    // Extra Hours fields (for Marketing department - overtime reporting)
    extraHoursDate: {
        type: Date,
        required: function() {
            return this.type === 'extra_hours';
        }
    },
    extraHoursWorked: {
        type: Number, // Number of extra hours worked
        required: function() {
            return this.type === 'extra_hours';
        }
    },
    extraHoursDescription: {
        type: String, // Description of work done during extra hours
        required: function() {
            return this.type === 'extra_hours';
        }
    },
    // Mission (business trip) fields
    missionStartDate: {
        type: Date,
        required: function() {
            return this.type === 'mission';
        }
    },
    missionEndDate: {
        type: Date,
        required: function() {
            return this.type === 'mission';
        }
    },
    missionDestination: {
        type: String,
        required: function() {
            return this.type === 'mission';
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    modificationHistory: [{
        modifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        modifiedAt: {
            type: Date,
            default: Date.now
        },
        reason: {
            type: String,
            required: true
        },
        changes: {
            before: mongoose.Schema.Types.Mixed,
            after: mongoose.Schema.Types.Mixed
        }
    }]
});

module.exports = mongoose.model('Form', formSchema); 