import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ExportPrintButtons from '../ExportPrintButtons';
import MedicalDocumentViewer from '../MedicalDocumentViewer';
import { formTypeIcon } from '../../utils/dashboardEmojis';
import { formatVacationDeductionDays, formatVacationDateRange } from '../../utils/vacationDays';

function StatusBadge({ status }) {
  const map = {
    approved: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    pending: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    rejected: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
  };
  const cls = map[status] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : '—';
  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${cls}`}>
      {label}
    </span>
  );
}

function formatDuration(form, t) {
  if (form.type === 'vacation') {
    return `${formatVacationDateRange(form)} (${formatVacationDeductionDays(form)} days${form.isHalfDay ? ', half day' : ''})`;
  }
  if (form.type === 'wfh') {
    return form.wfhDate?.slice(0, 10) || '—';
  }
  if (form.type === 'extra_hours') {
    return `${form.extraHoursDate?.slice(0, 10) || '—'} · ${form.extraHoursWorked || 0}h`;
  }
  if (form.type === 'mission') {
    return `${form.missionStartDate?.slice(0, 10)} → ${form.missionEndDate?.slice(0, 10)} · ${form.missionDestination || '—'}`;
  }
  if (form.type === 'sick_leave') {
    return `${form.sickLeaveStartDate?.slice(0, 10)} → ${form.sickLeaveEndDate?.slice(0, 10)}`;
  }
  return form.reason || '—';
}

const AdminFormsTrackingTable = ({
  forms,
  activeFormType,
  onActiveFormTypeChange,
  formsSearch,
  onFormsSearchChange,
  formsLoading,
  onRefresh,
  refreshing,
  onForceOverride,
  onDeleteForm,
  currentUserRole,
  typeCounts
}) => {
  const { t } = useTranslation();
  const [openMenuId, setOpenMenuId] = useState(null);

  const filtered = useMemo(() => {
    const q = formsSearch.trim().toLowerCase();
    return forms.filter((form) => {
      if (form.type !== activeFormType) return false;
      if (!q) return true;
      return (
        form.user?.name?.toLowerCase().includes(q) ||
        form.user?.email?.toLowerCase().includes(q) ||
        form.user?.department?.toLowerCase().includes(q)
      );
    });
  }, [forms, activeFormType, formsSearch]);

  const pipeline = useMemo(() => ({
    pending: filtered.filter((f) => f.status === 'pending').length,
    approved: filtered.filter((f) => f.status === 'approved').length,
    rejected: filtered.filter((f) => f.status === 'rejected').length
  }), [filtered]);

  return (
    <div className="admin-forms-tracking">
      <div className="form-mgmt-filters-bar admin-form-type-shell mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="form-mgmt-type-row">
            <label htmlFor="admin-form-type-tracking" className="!text-slate-700 dark:!text-slate-300 text-sm font-medium mr-2">
              {t('formManagement.typeLabel')}
            </label>
            <select
              id="admin-form-type-tracking"
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 !text-slate-900 dark:!text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
              value={activeFormType}
              onChange={(e) => onActiveFormTypeChange(e.target.value)}
            >
              <option value="vacation">{t('forms.vacation')} ({typeCounts?.vacation ?? 0})</option>
              <option value="wfh">{t('forms.workFromHome')} ({typeCounts?.wfh ?? 0})</option>
              <option value="sick_leave">{t('forms.sickLeave')} ({typeCounts?.sick_leave ?? 0})</option>
              <option value="extra_hours">{t('forms.extra_hours')} ({typeCounts?.extra_hours ?? 0})</option>
              <option value="mission">{t('forms.mission')} ({typeCounts?.mission ?? 0})</option>
            </select>
          </div>
          <div className="form-mgmt-pipeline-inline flex flex-wrap gap-2 text-sm !text-slate-600 dark:!text-slate-400">
            <strong className="!text-slate-900 dark:!text-white">{t('formManagement.pipelineSummary')}</strong>
            <span>{t('adminDashboard.summaryPendingManager')}: {pipeline.pending}</span>
            <span>|</span>
            <span>{t('adminDashboard.summaryApproved')}: {pipeline.approved}</span>
            <span>|</span>
            <span>{t('adminDashboard.summaryRejected')}: {pipeline.rejected}</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <input
            type="search"
            placeholder={t('adminDashboard.searchFormsPlaceholder')}
            value={formsSearch}
            onChange={(e) => onFormsSearchChange(e.target.value)}
            className="flex-1 min-w-[200px] bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 !text-slate-900 dark:!text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
            autoComplete="off"
          />
          <div className="flex flex-wrap items-center gap-2">
            <ExportPrintButtons
              forms={forms}
              activeFormType={activeFormType}
              sectionType="all"
              sectionTitle={`${activeFormType} Forms`}
              buttonClassName="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg border-0"
            />
            <button
              type="button"
              onClick={onRefresh}
              disabled={formsLoading || refreshing}
              className="bg-slate-100 dark:bg-slate-700 !text-slate-900 dark:!text-white px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600"
            >
              {(formsLoading || refreshing) ? t('adminDashboard.formsRefreshing') : t('adminDashboard.refresh')}
            </button>
          </div>
        </div>

        {formsLoading ? (
          <div className="!text-slate-500 dark:!text-slate-400 py-8 text-center">{t('adminDashboard.formsRefreshing')}</div>
        ) : filtered.length === 0 ? (
          <div className="!text-slate-500 dark:!text-slate-400 py-12 text-center">
            <p className="text-lg font-medium !text-slate-700 dark:!text-slate-300">{t('adminDashboard.noFormsFound', 'No forms found')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-100 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-700">
                <tr>
                  {['Employee', 'Department', 'Type', 'Duration', 'Submitted', 'Approver', 'Status', ''].map((h) => (
                    <th
                      key={h}
                      className="!text-slate-600 dark:!text-slate-400 text-xs font-bold uppercase tracking-wider px-4 py-3 text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((form) => (
                  <tr
                    key={form._id}
                    className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/30"
                  >
                    <td className="px-4 py-3 !text-slate-900 dark:!text-white font-medium">
                      <div className="flex items-center gap-2">
                        <span>{formTypeIcon(form.type)}</span>
                        <div>
                          <div>{form.user?.name || '—'}</div>
                          <div className="text-xs !text-slate-500 dark:!text-slate-400">{form.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 !text-slate-900 dark:!text-white">{form.user?.department || '—'}</td>
                    <td className="px-4 py-3 !text-slate-900 dark:!text-white capitalize">{form.type?.replace('_', ' ')}</td>
                    <td className="px-4 py-3 !text-slate-900 dark:!text-white max-w-[220px]">{formatDuration(form, t)}</td>
                    <td className="px-4 py-3 !text-slate-900 dark:!text-white">
                      {form.createdAt ? new Date(form.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 !text-slate-900 dark:!text-white">
                      {form.managerApprovedBy?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={form.status} />
                    </td>
                    <td className="px-4 py-3 relative">
                      <button
                        type="button"
                        className="!text-slate-500 dark:!text-slate-400 hover:!text-slate-900 dark:hover:!text-white px-2 py-1 rounded"
                        onClick={() => setOpenMenuId(openMenuId === form._id ? null : form._id)}
                        aria-label="Row actions"
                      >
                        ⋮
                      </button>
                      {openMenuId === form._id && (
                        <div className="absolute right-4 z-10 mt-1 min-w-[160px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1">
                          {form.status === 'pending' && currentUserRole === 'super_admin' && onForceOverride && (
                            <button
                              type="button"
                              className="w-full text-left px-4 py-2 text-xs !text-amber-700 dark:!text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                              onClick={() => {
                                setOpenMenuId(null);
                                onForceOverride(form);
                              }}
                            >
                              {t('adminDashboard.forceOverride', 'Force Override')}
                            </button>
                          )}
                          {form.type === 'sick_leave' && (
                            <div className="px-4 py-2">
                              <MedicalDocumentViewer form={form} userRole="admin" />
                            </div>
                          )}
                          {onDeleteForm && (
                            <button
                              type="button"
                              className="w-full text-left px-4 py-2 text-xs !text-rose-600 dark:!text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                              onClick={() => {
                                setOpenMenuId(null);
                                onDeleteForm(form._id);
                              }}
                            >
                              {t('common.delete', 'Delete')}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFormsTrackingTable;
