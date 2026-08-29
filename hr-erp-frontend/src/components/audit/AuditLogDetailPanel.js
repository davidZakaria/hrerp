import React from 'react';

const FIELD_LABELS = {
  vacationDaysLeft: 'Annual vacation days',
  casualDaysLeft: 'Casual days',
  excuseRequestsLeft: 'Paid excuses remaining',
  name: 'Name',
  email: 'Email',
  department: 'Department',
  role: 'Role',
  status: 'Status',
  employeeCode: 'Employee code',
  managedDepartments: 'Managed departments',
  managedDepartmentGroups: 'Managed department groups',
  jobTitle: 'Job title',
  location: 'Location',
  workSchedule: 'Work schedule'
};

const DETAIL_LABELS = {
  formId: 'Form ID',
  formType: 'Form type',
  vacationType: 'Vacation type',
  excuseType: 'Excuse type',
  vacationStartDate: 'Vacation start',
  vacationEndDate: 'Vacation end',
  daysDeducted: 'Days deducted',
  changeAmount: 'Change amount',
  approvedBy: 'Approved by',
  reason: 'Reason',
  backupId: 'Backup ID',
  flagType: 'Flag type',
  employeeName: 'Employee',
  targetUserName: 'Target user',
  targetUserEmail: 'Target email',
  targetUserDepartment: 'Department',
  downloadedCount: 'Records exported',
  usersUpdated: 'Users updated',
  resetValue: 'Reset value',
  balanceWentNegative: 'Balance went negative',
  fileName: 'File name',
  rowsImported: 'Rows imported',
  rowsUpdated: 'Rows updated',
  rowsSkipped: 'Rows skipped'
};

function humanizeKey(key) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  if (DETAIL_LABELS[key]) return DETAIL_LABELS[key];
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function formatDisplayValue(value) {
  if (value == null || value === '') return '—';
  if (value instanceof Date) return value.toLocaleString();
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function formatDiff(oldVal, newVal) {
  const o = oldVal == null ? null : Number(oldVal);
  const n = newVal == null ? null : Number(newVal);
  if (Number.isFinite(o) && Number.isFinite(n) && o !== n) {
    const delta = n - o;
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta}`;
  }
  return null;
}

function AuditFieldDiff({ oldValues, newValues }) {
  if (!oldValues && !newValues) return null;

  const keys = [
    ...new Set([
      ...Object.keys(oldValues || {}),
      ...Object.keys(newValues || {})
    ])
  ].filter((k) => {
    const o = oldValues?.[k];
    const n = newValues?.[k];
    return JSON.stringify(o) !== JSON.stringify(n);
  });

  if (!keys.length) return null;

  return (
    <div className="audit-field-diff">
      <div className="audit-field-diff__header">Data changes</div>
      <div className="audit-field-diff__scroll">
        <table className="audit-field-diff__table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Before</th>
              <th>After</th>
              <th>Δ</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const before = oldValues?.[key];
              const after = newValues?.[key];
              const delta = formatDiff(before, after);
              return (
                <tr key={key}>
                  <td className="audit-field-diff__field">{humanizeKey(key)}</td>
                  <td className="audit-field-diff__before">{formatDisplayValue(before)}</td>
                  <td className="audit-field-diff__after">{formatDisplayValue(after)}</td>
                  <td className="audit-field-diff__delta">
                    {delta != null ? (
                      <span className={Number(delta) >= 0 ? 'audit-field-diff__delta--up' : 'audit-field-diff__delta--down'}>
                        {delta}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditDetailsBlock({ details, reason, targetResource, targetResourceId }) {
  const detailEntries = details && typeof details === 'object'
    ? Object.entries(details).filter(([, v]) => v != null && v !== '')
    : [];

  const hasMeta = reason || targetResource || targetResourceId;
  if (!detailEntries.length && !hasMeta) return null;

  return (
    <div className="audit-details-block">
      <div className="audit-details-block__title">Additional context</div>
      {reason && (
        <p className="audit-details-block__line">
          <strong>Reason:</strong> {reason}
        </p>
      )}
      {(targetResource || targetResourceId) && (
        <p className="audit-details-block__line">
          <strong>Resource:</strong>{' '}
          {targetResource || '—'}
          {targetResourceId ? ` · ${String(targetResourceId)}` : ''}
        </p>
      )}
      {detailEntries.length > 0 && (
        <dl className="audit-details-block__grid">
          {detailEntries.map(([key, value]) => (
            <div key={key} className="audit-details-block__item">
              <dt>{humanizeKey(key)}</dt>
              <dd>{formatDisplayValue(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

const AuditLogDetailPanel = ({ log }) => {
  if (!log) return null;

  return (
    <div className="audit-log-detail-panel">
      <AuditFieldDiff oldValues={log.oldValues} newValues={log.newValues} />
      <AuditDetailsBlock
        details={log.details}
        reason={log.reason}
        targetResource={log.targetResource}
        targetResourceId={log.targetResourceId}
      />
    </div>
  );
};

export default AuditLogDetailPanel;
export { humanizeKey, formatDisplayValue };
