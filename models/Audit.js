const mongoose = require('mongoose');

const AuditSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'AUTOMATED_BACKUP_COMPLETED',
      'AUTOMATED_BACKUP_FAILED',
      'BACKUP_CLEANUP',
      'BACKUP_CREATED',
      'BACKUP_DELETED',
      'BACKUP_EXPORTED',
      'BACKUP_FAILED',
      'BACKUP_IMPORTED',
      'BACKUP_MANIFEST_DOWNLOADED',
      'BACKUP_RESTORED',
      'BACKUP_VERIFIED',
      'EMPLOYEE_FLAG_CREATED',
      'EMPLOYEE_FLAG_REMOVED',
      'EVALUATION_SUBMITTED',
      'FORM_APPROVED',
      'FORM_CREATED',
      'FORM_DELETED',
      'FORM_REJECTED',
      'FORM_UPDATED',
      'INTERVIEWER_ASSIGNED',
      'JOB_APPLICATION_SUBMITTED',
      'MANUAL_EXCUSE_HOURS_RESET',
      'MANUAL_EXCUSE_REQUESTS_RESET',
      'MONTHLY_EXCUSE_HOURS_RESET',
      'PASSWORD_RESET',
      'RECRUITMENT_CREATED',
      'RECRUITMENT_DELETED',
      'RECRUITMENT_UPDATED',
      'SUPER_ADMIN_ACTION',
      'SYSTEM_ACCESS',
      'USER_CREATED',
      'USER_DELETED',
      'USER_LOGIN',
      'USER_LOGOUT',
      'USER_STATUS_CHANGED',
      'USER_UPDATED',
      'VACATION_DAYS_MODIFIED'
    ]
  },
  performedBy: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId for users or String for system actions
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
  // ObjectId for users/forms/flags; string for backup folder names / backup IDs
  targetResourceId: {
    type: mongoose.Schema.Types.Mixed,
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