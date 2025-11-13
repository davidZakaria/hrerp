const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
    // Link to job application
    jobApplication: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobApplication',
        required: true
    },
    
    // Evaluator information
    evaluator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    evaluatorRole: {
        type: String,
        enum: ['admin', 'manager'],
        required: true
    },
    
    // Candidate Information
    candidateName: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    position: {
        type: String,
        required: true
    },
    
    // Rating Criteria
    experience: {
        type: String,
        enum: ['Good fit', 'Fit', 'Not fit'],
        required: true
    },
    education: {
        type: String,
        enum: ['Good fit', 'Fit', 'Not fit'],
        required: true
    },
    communication: {
        type: String,
        enum: ['Good fit', 'Fit', 'Not fit'],
        required: true
    },
    presentable: {
        type: String,
        enum: ['Good fit', 'Fit', 'Not fit'],
        required: true
    },
    fitTheCulture: {
        type: String,
        enum: ['Good fit', 'Fit', 'Not fit'],
        required: true
    },
    
    // Overall Impression
    overallImpression: {
        type: String,
        enum: ['Accepted', 'Pending', 'Rejected'],
        required: true
    },
    
    // Comments
    comment: {
        type: String,
        trim: true,
        default: ''
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
evaluationSchema.index({ jobApplication: 1, evaluatorRole: 1 });
evaluationSchema.index({ evaluator: 1 });

// Update timestamp on save
evaluationSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Evaluation', evaluationSchema);

