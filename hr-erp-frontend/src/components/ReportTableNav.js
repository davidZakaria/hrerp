import React, { useEffect, useState } from 'react';

export const REPORT_SCROLL_TABLE_CSS = `
  .report-scroll-table-wrap {
    overflow: auto;
    border: 1px solid #334155;
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.5);
  }
  .report-scroll-table-wrap table {
    margin: 0;
  }
  .report-scroll-table-wrap thead th {
    position: sticky;
    top: 0;
    z-index: 2;
    box-shadow: 0 1px 0 #334155;
  }
  .report-nested-detail {
    border: 1px solid #475569;
    border-radius: 6px;
    overflow: auto;
    max-height: 320px;
    background: rgba(15, 23, 42, 0.95);
  }
  .report-nested-detail thead th {
    position: sticky;
    top: 0;
    z-index: 1;
  }
`;

export function useReportPagination(items, initialPageSize = 15) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    setPage(1);
  }, [items, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    pageItems,
    total,
    startIndex: start
  };
}

export function ReportPaginationBar({
  page,
  setPage,
  pageSize,
  setPageSize,
  totalPages,
  total,
  startIndex,
  i18nPrefix,
  t
}) {
  if (total === 0) return null;

  const from = startIndex + 1;
  const to = Math.min(startIndex + pageSize, total);

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.75rem',
      marginTop: '0.75rem',
      padding: '0.5rem 0'
    }}>
      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
        {t(`${i18nPrefix}.showingPage`, { from, to, total })}
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {t(`${i18nPrefix}.rowsPerPage`)}
          <select
            className="form-input-elegant"
            style={{ width: 'auto', padding: '0.25rem 0.5rem', minHeight: 'unset' }}
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {[10, 15, 25, 50].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn-elegant btn-secondary"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          {t(`${i18nPrefix}.prevPage`)}
        </button>
        <span style={{ fontSize: '0.85rem', color: '#cbd5e1', minWidth: '4rem', textAlign: 'center' }}>
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn-elegant btn-secondary"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          {t(`${i18nPrefix}.nextPage`)}
        </button>
      </div>
    </div>
  );
}

export function ReportViewModeToggle({ viewMode, setViewMode, i18nPrefix, t }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <button
        type="button"
        className={`btn-elegant ${viewMode === 'employees' ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => setViewMode('employees')}
      >
        {t(`${i18nPrefix}.viewByEmployee`)}
      </button>
      <button
        type="button"
        className={`btn-elegant ${viewMode === 'allRows' ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => setViewMode('allRows')}
      >
        {t(`${i18nPrefix}.viewAllRows`)}
      </button>
    </div>
  );
}

export function ReportScrollTable({ children, maxHeight = 520, className = '' }) {
  return (
    <div className={`report-scroll-table-wrap ${className}`.trim()} style={{ maxHeight }}>
      {children}
    </div>
  );
}

export function ReportNestedTable({ children }) {
  return (
    <div className="report-nested-detail">
      {children}
    </div>
  );
}

/** Auto-expand when filters narrow to a single employee group. */
export function useAutoExpandSingleEmployee(groups, filterSearch, expandedSet, setExpandedSet) {
  useEffect(() => {
    const q = filterSearch.trim();
    if (!q || groups.length !== 1) return;
    setExpandedSet(new Set([groups[0].key]));
  }, [groups, filterSearch, setExpandedSet]);
}
