const mongoose = require('mongoose');
const { getEffectiveManagedDepartments } = require('../utils/effectiveManagedDepartments');
const { groupKeysCoveringDepartment } = require('../config/departmentGroups');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['employee', 'manager', 'admin', 'super_admin'],
        default: 'employee'
    },
    department: {
        type: String,
        required: true
    },
    managedDepartments: [{
        type: String
    }],
    /** Manager-only: keys into config/departmentGroups (expanded at runtime, not stored as duplicate list) */
    managedDepartmentGroups: [{
        type: String
    }],
    permissions: {
        canEditDepartmentForms: { type: Boolean, default: false }
    },
    employeeCode: {
        type: String,
        required: false, // Not required for existing users, but will be for new registrations
        unique: true,
        sparse: true // Allows multiple null values but enforces uniqueness for non-null values
    },
    workSchedule: {
        startTime: {
            type: String, // e.g., "11:00"
            required: false
        },
        endTime: {
            type: String, // e.g., "19:00"
            required: false
        }
    },
    vacationDaysLeft: {
        type: Number,
        default: 21
    },
    excuseRequestsLeft: {
        type: Number,
        default: 2 // 2 paid excuse requests per month (each is 2 hours)
    },
    excuseRequestsResetDate: {
        type: Date,
        default: Date.now // Track when excuse requests were last reset
    },
    sickDaysLeft: {
        type: Number,
        default: null // Unlimited sick days - no restrictions
    },
    // Fingerprint miss tracking (forgot to clock in/out)
    fingerprintMissCount: {
        type: Number,
        default: 0 // Number of missed fingerprint scans this month
    },
    fingerprintMissResetMonth: {
        type: String, // "YYYY-MM" format - tracks which month the count applies to
        default: null
    },
    totalFingerprintDeduction: {
        type: Number,
        default: 0 // Accumulated deduction in days for the current month
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    },
    modificationHistory: [{
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        modifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        modifiedAt: {
            type: Date,
            default: Date.now
        },
        reason: String
    }],
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'pending', 'draft'],
        default: 'active'
    },
    lastLogin: {
        type: Date
    }
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ employeeCode: 1 }, { unique: true, sparse: true }); // For biometric matching
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ status: 1 });
userSchema.index({ managedDepartments: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Compound indexes for common queries
userSchema.index({ role: 1, status: 1 });
userSchema.index({ department: 1, status: 1 });
userSchema.index({ role: 1, department: 1 });

// Virtual for full name if needed
userSchema.virtual('displayName').get(function() {
  return this.name || this.email;
});

// Method to check if user can manage department
userSchema.methods.canManageDepartment = function(department) {
  if (this.role === 'super_admin' || this.role === 'admin') {
    return true;
  }
  if (this.role === 'manager') {
    const effective = getEffectiveManagedDepartments(this);
    return effective.includes(department);
  }
  return false;
};

// Method to get user permissions
userSchema.methods.getPermissions = function() {
  const permissions = {
    canViewAllUsers: ['super_admin', 'admin'].includes(this.role),
    canEditUsers: ['super_admin', 'admin'].includes(this.role),
    canViewAllForms: ['super_admin', 'admin'].includes(this.role),
    canApproveAll: ['super_admin', 'admin'].includes(this.role),
    canManageTeam: this.role === 'manager' && getEffectiveManagedDepartments(this).length > 0,
    canViewAuditLogs: this.role === 'super_admin',
    canCreateUsers: ['super_admin', 'admin'].includes(this.role),
    canDeleteUsers: this.role === 'super_admin',
    canResetPasswords: ['super_admin', 'admin'].includes(this.role),
    canEditDepartmentForms: this.role === 'manager' && (this.permissions?.canEditDepartmentForms === true)
  };
  
  return permissions;
};

// Static method for efficient user queries
userSchema.statics.findActiveByRole = function(role) {
  return this.find({ role, status: 'active' }).select('-password');
};

userSchema.statics.findByDepartment = function(department, includeManagers = false) {
  const groupKeys = groupKeysCoveringDepartment(department);
  const query = includeManagers
    ? {
        $or: [
          { department },
          { managedDepartments: department },
          ...(groupKeys.length ? [{ managedDepartmentGroups: { $in: groupKeys } }] : [])
        ]
      }
    : { department };

  return this.find({ ...query, status: 'active' }).select('-password');
};

userSchema.statics.findTeamMembers = function(managerId) {
  return this.findById(managerId)
    .then(manager => {
      if (!manager) return [];
      const effective = getEffectiveManagedDepartments(manager);
      if (effective.length === 0) return [];
      return this.find({
        department: { $in: effective },
        status: 'active'
      }).select('-password');
    });
};

// Pre-save middleware for data validation and normalization
userSchema.pre('save', function(next) {
  // Normalize email
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  
  // Ensure managers have at least one scope: home department, explicit depts, or groups
  if (this.role === 'manager') {
    const hasGroups = this.managedDepartmentGroups && this.managedDepartmentGroups.length > 0;
    const hasDepts = this.managedDepartments && this.managedDepartments.length > 0;
    if (!hasDepts && !hasGroups) {
      this.managedDepartments = [this.department];
    }
  }

  // Clear managed departments and form-edit permission for non-managers
  if (this.role !== 'manager') {
    this.managedDepartments = [];
    this.managedDepartmentGroups = [];
    if (this.permissions) this.permissions.canEditDepartmentForms = false;
  }
  
  next();
});

// Post-save middleware for logging
userSchema.post('save', function(doc) {
  console.log(`User ${doc.email} (${doc.role}) saved successfully`);
});

module.exports = mongoose.model('User', userSchema); 