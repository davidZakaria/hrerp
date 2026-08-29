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
    <div className="audit-field-diff mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80">
        <span className="text-xs font-bold uppercase tracking-wider !text-slate-600 dark:!text-slate-400">
          Data changes
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left px-4 py-2 !text-slate-500 dark:!text-slate-400 font-semibold">Field</th>
              <th className="text-left px-4 py-2 !text-slate-500 dark:!text-slate-400 font-semibold">Before</th>
              <th className="text-left px-4 py-2 !text-slate-500 dark:!text-slate-400 font-semibold">After</th>
              <th className="text-left px-4 py-2 !text-slate-500 dark:!text-slate-400 font-semibold">Δ</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const before = oldValues?.[key];
              const after = newValues?.[key];
              const delta = formatDiff(before, after);
              return (
                <tr key={key} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <td className="px-4 py-2 font-medium !text-slate-800 dark:!text-slate-200 whitespace-nowrap">
                    {humanizeKey(key)}
                  </td>
                  <td className="px-4 py-2 !text-rose-700 dark:!text-rose-400 font-mono text-xs break-all">
                    {formatDisplayValue(before)}
                  </td>
                  <td className="px-4 py-2 !text-emerald-700 dark:!text-emerald-400 font-mono text-xs break-all">
                    {formatDisplayValue(after)}
                  </td>
                  <td className="px-4 py-2 font-semibold whitespace-nowrap">
                    {delta != null ? (
                      <span className={Number(delta) >= 0 ? '!text-emerald-600' : '!text-rose-600'}>
                        {delta}
                      </span>
                    ) : (
                      <span className="!text-slate-400">—</span>
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
    <div className="audit-details-block mt-3 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-4">
      <div className="text-xs font-bold uppercase tracking-wider !text-indigo-700 dark:!text-indigo-300 mb-3">
        Additional context
      </div>
      {reason && (
        <p className="text-sm mb-3 !text-slate-800 dark:!text-slate-200">
          <strong className="!text-slate-900 dark:!text-white">Reason:</strong> {reason}
        </p>
      )}
      {(targetResource || targetResourceId) && (
        <p className="text-sm mb-3 !text-slate-700 dark:!text-slate-300">
          <strong className="!text-slate-900 dark:!text-white">Resource:</strong>{' '}
          {targetResource || '—'}
          {targetResourceId ? ` · ${String(targetResourceId)}` : ''}
        </p>
      )}
      {detailEntries.length > 0 && (
        <dl className="grid gap-2 sm:grid-cols-2 text-sm">
          {detailEntries.map(([key, value]) => (
            <div key={key} className="min-w-0">
              <dt className="font-semibold !text-slate-600 dark:!text-slate-400 text-xs uppercase tracking-wide">
                {humanizeKey(key)}
              </dt>
              <dd className="mt-0.5 !text-slate-900 dark:!text-slate-100 font-mono text-xs break-all whitespace-pre-wrap">
                {formatDisplayValue(value)}
              </dd>
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
    <>
      <AuditFieldDiff oldValues={log.oldValues} newValues={log.newValues} />
      <AuditDetailsBlock
        details={log.details}
        reason={log.reason}
        targetResource={log.targetResource}
        targetResourceId={log.targetResourceId}
      />
    </>
  );
};

export default AuditLogDetailPanel;
export { humanizeKey, formatDisplayValue };
