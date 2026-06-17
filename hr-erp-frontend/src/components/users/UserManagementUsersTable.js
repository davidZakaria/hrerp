import React from 'react';
import { useTranslation } from 'react-i18next';
import { getEffectiveManagedDepartmentsClient } from '../../utils/effectiveManagedDepartments';

function UserRowActions({
  user,
  flags,
  t,
  onEdit,
  onResetPassword,
  onDelete,
  onReactivate,
  onMoveToDraft,
  onRemoveFlag,
  layout = 'row',
}) {
  const btnWrapClass = layout === 'column' ? 'user-mgmt-mobile-card-actions' : 'user-mgmt-sheet-actions';

  return (
    <>
      <div className={btnWrapClass}>
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
    </>
  );
}

/**
 * Spreadsheet-style preview for user directory (read-oriented layout).
 * Desktop: wide table with horizontal scroll. Mobile: stacked cards.
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

  const mobileFields = (user) => [
    { label: t('common.email'), value: user.email || '—' },
    { label: t('adminDashboard.roleLabel'), value: String(user.role || '').replace(/_/g, ' ') },
    { label: t('common.status'), value: user.status || '—' },
    { label: t('common.department'), value: user.department || '—' },
    { label: t('userManagement.colJobTitle'), value: user.jobTitle || '—' },
    { label: t('userManagement.colLocation'), value: user.location || '—' },
    { label: t('userManagement.colVacation'), value: Number(user.vacationDaysLeft ?? 0).toFixed(1) },
    {
      label: t('userManagement.colJoined'),
      value: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—',
    },
    {
      label: t('userManagement.colLastLogin'),
      value: user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : t('userManagement.never'),
    },
    { label: t('userManagement.colScope'), value: scopeSummary(user) },
    {
      label: t('userManagement.colFlags'),
      value: getEmployeeFlags(user._id).length || '—',
    },
  ];

  return (
    <div className="user-mgmt-sheet-wrap responsive-table-wrap">
      <div className="user-mgmt-mobile-cards">
        {users.map((user, idx) => {
          const flags = getEmployeeFlags(user._id);
          return (
            <article key={user._id} className="user-mgmt-mobile-card">
              <header className="user-mgmt-mobile-card-header">
                <h4 className="user-mgmt-mobile-card-name">
                  {idx + 1}. {user.name || '—'}
                </h4>
                {user.employeeCode && (
                  <span className="user-mgmt-mobile-card-code">#{user.employeeCode}</span>
                )}
              </header>
              <dl className="user-mgmt-mobile-card-grid">
                {mobileFields(user).map((field) => (
                  <div key={field.label} className="user-mgmt-mobile-card-row">
                    <dt>{field.label}</dt>
                    <dd>{field.value}</dd>
                  </div>
                ))}
              </dl>
              <UserRowActions
                user={user}
                flags={flags}
                t={t}
                onEdit={onEdit}
                onResetPassword={onResetPassword}
                onDelete={onDelete}
                onReactivate={onReactivate}
                onMoveToDraft={onMoveToDraft}
                onRemoveFlag={onRemoveFlag}
                layout="column"
              />
            </article>
          );
        })}
      </div>

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
            <th>{t('userManagement.colJobTitle')}</th>
            <th>{t('userManagement.colLocation')}</th>
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
                <td className="user-mgmt-sheet-clip" title={user.jobTitle || ''}>{user.jobTitle || '—'}</td>
                <td className="user-mgmt-sheet-clip" title={user.location || ''}>{user.location || '—'}</td>
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
                  <UserRowActions
                    user={user}
                    flags={flags}
                    t={t}
                    onEdit={onEdit}
                    onResetPassword={onResetPassword}
                    onDelete={onDelete}
                    onReactivate={onReactivate}
                    onMoveToDraft={onMoveToDraft}
                    onRemoveFlag={onRemoveFlag}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
