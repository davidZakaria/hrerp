const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['vacation', 'excuse'],
        required: true
    },
    vacationType: {
        type: String,
        enum: ['annual', 'unpaid'],
        required: false
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'manager_approved', 'approved', 'rejected', 'manager_rejected'],
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
    fromHour: String,
    toHour: String,
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