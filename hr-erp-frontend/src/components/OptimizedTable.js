import React, { useState, useMemo, useCallback, memo } from 'react';

const TableRow = memo(({ item, columns, onRowClick, selectedRows, onRowSelect, actions }) => {
  const isSelected = selectedRows?.includes(item._id);

  return (
    <tr 
      className={`table-row ${isSelected ? 'selected' : ''} ${onRowClick ? 'clickable' : ''}`}
      onClick={() => onRowClick?.(item)}
    >
      {onRowSelect && (
        <td className="select-cell">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onRowSelect(item._id, e.target.checked);
            }}
          />
        </td>
      )}
      {columns.map((column) => (
        <td key={column.key} className={`cell-${column.key}`}>
          {column.render ? column.render(item[column.key], item) : item[column.key] || '-'}
        </td>
      ))}
      {actions && (
        <td className="actions-cell">
          {actions(item)}
        </td>
      )}
    </tr>
  );
});

const OptimizedTable = ({
  data = [],
  columns = [],
  loading = false,
  error = null,
  searchable = true,
  sortable = true,
  selectable = false,
  pagination = true,
  pageSize = 10,
  onRowClick = null,
  actions = null,
  emptyMessage = "No data available",
  className = ""
}) => {
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);

  // Optimized filtering with useMemo
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    
    const searchLower = search.toLowerCase();
    return data.filter(item =>
      columns.some(column => {
        const value = item[column.key];
        return value && value.toString().toLowerCase().includes(searchLower);
      })
    );
  }, [data, search, columns]);

  // Optimized sorting with useMemo
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (aVal === bVal) return 0;
      
      const result = aVal < bVal ? -1 : 1;
      return sortConfig.direction === 'asc' ? result : -result;
    });
  }, [filteredData, sortConfig]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = pagination ? sortedData.slice(startIndex, startIndex + pageSize) : sortedData;

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleRowSelect = useCallback((rowId, selected) => {
    setSelectedRows(prev => 
      selected 
        ? [...prev, rowId]
        : prev.filter(id => id !== rowId)
    );
  }, []);

  const handleSelectAll = useCallback((selected) => {
    setSelectedRows(selected ? paginatedData.map(item => item._id) : []);
  }, [paginatedData]);

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  if (error) {
    return (
      <div className="table-error">
        <div className="error-icon">⚠️</div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className={`optimized-table-container ${className}`}>
      <style>{`
        .optimized-table-container {
          background: rgba(0, 0, 0, 0.8);
          border-radius: 12px;
          padding: 1.5rem;
          margin: 1rem 0;
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .table-search {
          flex: 1;
          max-width: 300px;
          padding: 8px 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 0.9rem;
        }

        .table-search::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }

        .table-info {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
        }

        .table-wrapper {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .optimized-table {
          width: 100%;
          border-collapse: collapse;
          background: rgba(0, 0, 0, 0.6);
        }

        .optimized-table th {
          background: rgba(0, 0, 0, 0.8);
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          color: white;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .sortable-header {
          cursor: pointer;
          user-select: none;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sortable-header:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .sort-icon {
          margin-left: 8px;
          opacity: 0.6;
          font-size: 0.8rem;
        }

        .table-row {
          transition: background-color 0.2s;
        }

        .table-row:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .table-row.selected {
          background: rgba(76, 175, 80, 0.2);
        }

        .table-row.clickable {
          cursor: pointer;
        }

        .optimized-table td {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.9);
          vertical-align: middle;
        }

        .select-cell {
          width: 40px;
          text-align: center;
        }

        .actions-cell {
          text-align: right;
          white-space: nowrap;
        }

        .table-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .pagination-info {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
        }

        .pagination-controls {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .pagination-btn {
          padding: 6px 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-btn.active {
          background: rgba(76, 175, 80, 0.8);
        }

        .table-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 3rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .table-empty {
          text-align: center;
          padding: 3rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .table-error {
          text-align: center;
          padding: 2rem;
          background: rgba(244, 67, 54, 0.1);
          border: 1px solid rgba(244, 67, 54, 0.3);
          border-radius: 8px;
          color: #ff5252;
        }

        .error-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        @media (max-width: 768px) {
          .table-header {
            flex-direction: column;
            align-items: stretch;
          }

          .table-search {
            max-width: none;
          }

          .optimized-table th,
          .optimized-table td {
            padding: 8px 12px;
            font-size: 0.9rem;
          }

          .pagination-controls {
            justify-content: center;
          }
        }
      `}</style>

      {(searchable || selectable) && (
        <div className="table-header">
          {searchable && (
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="table-search"
            />
          )}
          <div className="table-info">
            {selectedRows.length > 0 && `${selectedRows.length} selected • `}
            {filteredData.length} of {data.length} items
          </div>
        </div>
      )}

      <div className="table-wrapper">
        {loading ? (
          <div className="table-loading">
            <div className="spinner-elegant" style={{ width: '40px', height: '40px' }}></div>
            <span style={{ marginLeft: '1rem' }}>Loading...</span>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="table-empty">
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
            {emptyMessage}
          </div>
        ) : (
          <table className="optimized-table">
            <thead>
              <tr>
                {selectable && (
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedRows.length === paginatedData.length && paginatedData.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th key={column.key}>
                    {sortable && column.sortable !== false ? (
                      <div
                        className="sortable-header"
                        onClick={() => handleSort(column.key)}
                      >
                        <span>{column.label}</span>
                        <span className="sort-icon">{getSortIcon(column.key)}</span>
                      </div>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
                {actions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item) => (
                <TableRow
                  key={item._id || item.id}
                  item={item}
                  columns={columns}
                  onRowClick={onRowClick}
                  selectedRows={selectedRows}
                  onRowSelect={selectable ? handleRowSelect : null}
                  actions={actions}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && totalPages > 1 && (
        <div className="table-pagination">
          <div className="pagination-info">
            Showing {startIndex + 1}-{Math.min(startIndex + pageSize, sortedData.length)} of {sortedData.length}
          </div>
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              ⇤
            </button>
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              ←
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return (
                <button
                  key={page}
                  className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              );
            })}
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              →
            </button>
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              ⇥
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(OptimizedTable); 
