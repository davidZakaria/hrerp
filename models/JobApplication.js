const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
    // Personal Information
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true
    },
    linkedinProfile: {
        type: String,
        trim: true
    },
    
    // Position Information
    positionAppliedFor: {
        type: String,
        required: true,
        trim: true
    },
    currentSalary: {
        type: Number,
        required: false
    },
    expectedSalary: {
        type: Number,
        required: true
    },
    dateAvailableToStart: {
        type: Date,
        required: true
    },
    
    // Education Background (Multiple)
    educationBackground: [{
        university: {
            type: String,
            required: true,
            trim: true
        },
        majorAndDegree: {
            type: String,
            required: true,
            trim: true
        },
        yearOfCompletion: {
            type: Number,
            required: true
        }
    }],
    
    // Professional Background (Multiple)
    professionalBackground: [{
        companyName: {
            type: String,
            required: true,
            trim: true
        },
        jobTitle: {
            type: String,
            required: true,
            trim: true
        },
        from: {
            type: Date,
            required: true
        },
        to: {
            type: Date,
            required: false // Can be null if currently working
        },
        salary: {
            type: Number,
            required: false
        }
    }],
    
    // Reference
    reference: {
        name: {
            type: String,
            required: true,
            trim: true
        },
        position: {
            type: String,
            required: true,
            trim: true
        },
        phone: {
            type: String,
            required: true,
            trim: true
        }
    },
    
    // Resume/CV
    resumeFilePath: {
        type: String,
        required: true
    },
    resumeFileName: {
        type: String,
        required: true
    },
    
    // Application Status
    status: {
        type: String,
        enum: ['pending', 'under_review', 'interview_scheduled', 'evaluated', 'accepted', 'rejected'],
        default: 'pending'
    },
    
    // Evaluation tracking
    assignedInterviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    adminEvaluationCompleted: {
        type: Boolean,
        default: false
    },
    technicalEvaluationCompleted: {
        type: Boolean,
        default: false
    },
    
    // Security & Anti-spam
    ipAddress: {
        type: String,
        required: false
    },
    userAgent: {
        type: String,
        required: false
    },
    
    // Timestamps
    appliedAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
jobApplicationSchema.index({ email: 1, appliedAt: -1 });
jobApplicationSchema.index({ status: 1 });
jobApplicationSchema.index({ assignedInterviewer: 1 });

// Update timestamp on save
jobApplicationSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('JobApplication', jobApplicationSchema);

