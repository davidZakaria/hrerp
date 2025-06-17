const mongoose = require('mongoose');

const AuditSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'USER_CREATED',
      'USER_UPDATED', 
      'USER_DELETED',
      'USER_STATUS_CHANGED',
      'USER_LOGIN',
      'USER_LOGOUT',
      'FORM_CREATED',
      'FORM_UPDATED',
      'FORM_APPROVED',
      'FORM_REJECTED',
      'FORM_DELETED',
      'RECRUITMENT_CREATED',
      'RECRUITMENT_UPDATED',
      'RECRUITMENT_DELETED',
      'SYSTEM_ACCESS',
      'PASSWORD_RESET',
      'VACATION_DAYS_MODIFIED',
      'SUPER_ADMIN_ACTION'
    ]
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  targetResource: {
    type: String, // 'user', 'form', 'recruitment', etc.
    default: null
  },
  targetResourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  description: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Store any additional data
    default: {}
  },
  oldValues: {
    type: mongoose.Schema.Types.Mixed, // Store previous values for updates
    default: {}
  },
  newValues: {
    type: mongoose.Schema.Types.Mixed, // Store new values for updates
    default: {}
  },
  reason: {
    type: String, // Reason for the action (especially for super admin actions)
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW'
  }
});

// Index for efficient querying
AuditSchema.index({ timestamp: -1 });
AuditSchema.index({ performedBy: 1, timestamp: -1 });
AuditSchema.index({ action: 1, timestamp: -1 });
AuditSchema.index({ targetUser: 1, timestamp: -1 });

module.exports = mongoose.model('Audit', AuditSchema); 