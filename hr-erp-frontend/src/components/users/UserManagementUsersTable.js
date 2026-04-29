import React from 'react';
import { useTranslation } from 'react-i18next';
import { getEffectiveManagedDepartmentsClient } from '../../utils/effectiveManagedDepartments';

/**
 * Spreadsheet-style preview for user directory (read-oriented layout).
 */
export default function UserManagementUsersTable({
  users,
  departmentGroupCatalog,
  getEmployeeFlags,
  onEdit,
  onResetPassword,
  onDelete,
  onReactivate,
  onMoveToDraft,
  onRemoveFlag,
}) {
  const { t } = useTranslation();

  const scopeSummary = (user) => {
    const eff = getEffectiveManagedDepartmentsClient(
      user.managedDepartments,
      user.managedDepartmentGroups,
      departmentGroupCatalog || {}
    );
    if (!eff.length) return '—';
    const joined = eff.join(', ');
    return joined.length > 48 ? `${joined.slice(0, 45)}…` : joined;
  };

  return (
    <div className="user-mgmt-sheet-wrap">
      <table className="user-mgmt-sheet">
        <thead>
          <tr>
            <th className="user-mgmt-sheet-col-idx">#</th>
            <th>{t('common.name')}</th>
            <th>{t('common.email')}</th>
            <th>{t('common.employeeCode')}</th>
            <th>{t('adminDashboard.roleLabel')}</th>
            <th>{t('common.status')}</th>
            <th>{t('common.department')}</th>
            <th className="user-mgmt-sheet-num">{t('userManagement.colVacation')}</th>
            <th>{t('userManagement.colJoined')}</th>
            <th>{t('userManagement.colLastLogin')}</th>
            <th>{t('userManagement.colScope')}</th>
            <th>{t('userManagement.colFlags')}</th>
            <th className="user-mgmt-sheet-actions-col">{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, idx) => {
            const flags = getEmployeeFlags(user._id);
            return (
              <tr key={user._id} className="user-mgmt-sheet-row">
                <td className="user-mgmt-sheet-num">{idx + 1}</td>
                <td className="user-mgmt-sheet-strong">{user.name || '—'}</td>
                <td>{user.email || '—'}</td>
                <td>{user.employeeCode || '—'}</td>
                <td>{String(user.role || '').replace(/_/g, ' ')}</td>
                <td>{user.status || '—'}</td>
                <td>{user.department || '—'}</td>
                <td className="user-mgmt-sheet-num">{Number(user.vacationDaysLeft ?? 0).toFixed(1)}</td>
                <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
                <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : t('userManagement.never')}</td>
                <td className="user-mgmt-sheet-clip" title={scopeSummary(user)}>
                  {scopeSummary(user)}
                </td>
                <td className="user-mgmt-sheet-flags">
                  {flags.length === 0 ? (
                    '—'
                  ) : (
                    <span className="user-mgmt-sheet-flag-pill" title={flags.map((f) => f.type).join(', ')}>
                      {flags.length}
                    </span>
                  )}
                </td>
                <td className="user-mgmt-sheet-actions-cell">
                  <div className="user-mgmt-sheet-actions">
                    {(user.status === 'draft' || user.status === 'inactive') && (
                      <button
                        type="button"
                        className="user-mgmt-sheet-btn user-mgmt-sheet-btn-success"
                        onClick={() => onReactivate(user)}
                      >
                        {t('users.reactivate') || '✓'}
                      </button>
                    )}
                    {user.status !== 'draft' &&
                      user.status !== 'inactive' &&
                      user.role !== 'super_admin' && (
                        <button
                          type="button"
                          className="user-mgmt-sheet-btn"
                          onClick={() => onMoveToDraft(user)}
                        >
                          {t('users.moveToDraft') || 'Draft'}
                        </button>
                      )}
                    <button type="button" className="user-mgmt-sheet-btn user-mgmt-sheet-btn-primary" onClick={() => onEdit(user)}>
                      {t('common.edit')}
                    </button>
                    <button type="button" className="user-mgmt-sheet-btn user-mgmt-sheet-btn-warn" onClick={() => onResetPassword(user)}>
                      🔑
                    </button>
                    <button type="button" className="user-mgmt-sheet-btn user-mgmt-sheet-btn-danger" onClick={() => onDelete(user)}>
                      {t('common.delete')}
                    </button>
                  </div>
                  {flags.length > 0 && (
                    <div className="user-mgmt-sheet-flag-row">
                      {flags.map((flag) => (
                        <button
                          key={flag._id}
                          type="button"
                          className="user-mgmt-sheet-flag-x"
                          title={flag.reason}
                          onClick={() => onRemoveFlag(flag._id)}
                        >
                          × {flag.type}
                        </button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
