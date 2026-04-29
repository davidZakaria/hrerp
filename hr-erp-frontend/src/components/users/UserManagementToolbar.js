import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Two filter modes: simple (search only) vs advanced (dept/role/status).
 * Two view modes: card grid vs spreadsheet-style table.
 */
export default function UserManagementToolbar({
  filterLayout,
  onFilterLayoutChange,
  viewMode,
  onViewModeChange,
  departmentOptions,
  roleOptions,
  statusOptions,
  deptValue,
  roleValue,
  statusValue,
  onDeptChange,
  onRoleChange,
  onStatusChange,
}) {
  const { t } = useTranslation();

  return (
    <div className="user-mgmt-toolbar elegant-card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
      <div className="user-mgmt-toolbar-row user-mgmt-toolbar-primary">
        <div className="user-mgmt-toolbar-field">
          <label className="user-mgmt-toolbar-label" htmlFor="user-mgmt-filter-layout">
            {t('userManagement.filterTypeLabel')}
          </label>
          <select
            id="user-mgmt-filter-layout"
            className="form-mgmt-select user-mgmt-toolbar-select"
            value={filterLayout}
            onChange={(e) => onFilterLayoutChange(e.target.value)}
          >
            <option value="simple">{t('userManagement.filterSimple')}</option>
            <option value="advanced">{t('userManagement.filterAdvanced')}</option>
          </select>
        </div>
        <div className="user-mgmt-toolbar-field">
          <label className="user-mgmt-toolbar-label" htmlFor="user-mgmt-view-mode">
            {t('userManagement.viewLabel')}
          </label>
          <select
            id="user-mgmt-view-mode"
            className="form-mgmt-select user-mgmt-toolbar-select"
            value={viewMode}
            onChange={(e) => onViewModeChange(e.target.value)}
          >
            <option value="cards">{t('userManagement.viewCards')}</option>
            <option value="table">{t('userManagement.viewTable')}</option>
          </select>
        </div>
      </div>
      {filterLayout === 'advanced' && (
        <div className="user-mgmt-toolbar-row user-mgmt-toolbar-advanced">
          <div className="user-mgmt-toolbar-field">
            <label className="user-mgmt-toolbar-label" htmlFor="user-mgmt-f-dept">
              {t('adminDashboard.departmentLabel')}
            </label>
            <select
              id="user-mgmt-f-dept"
              className="form-mgmt-select user-mgmt-toolbar-select"
              value={deptValue}
              onChange={(e) => onDeptChange(e.target.value)}
            >
              <option value="">{t('userManagement.filterAny')}</option>
              {departmentOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="user-mgmt-toolbar-field">
            <label className="user-mgmt-toolbar-label" htmlFor="user-mgmt-f-role">
              {t('adminDashboard.roleLabel')}
            </label>
            <select
              id="user-mgmt-f-role"
              className="form-mgmt-select user-mgmt-toolbar-select"
              value={roleValue}
              onChange={(e) => onRoleChange(e.target.value)}
            >
              <option value="">{t('userManagement.filterAny')}</option>
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="user-mgmt-toolbar-field">
            <label className="user-mgmt-toolbar-label" htmlFor="user-mgmt-f-status">
              {t('common.status')}
            </label>
            <select
              id="user-mgmt-f-status"
              className="form-mgmt-select user-mgmt-toolbar-select"
              value={statusValue}
              onChange={(e) => onStatusChange(e.target.value)}
            >
              <option value="">{t('userManagement.filterAny')}</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      <p className="user-mgmt-toolbar-hint">{t('userManagement.toolbarHint')}</p>
    </div>
  );
}
