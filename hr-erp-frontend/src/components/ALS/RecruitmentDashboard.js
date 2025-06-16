import React, { useState, useEffect } from 'react';

const Modal = ({ show, onClose, children }) => {
  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      backdropFilter: 'blur(5px)'
    }}>
      <div style={{ 
        background: 'linear-gradient(145deg, rgba(0, 0, 0, 0.9), rgba(26, 26, 26, 0.95))', 
        padding: 24, 
        borderRadius: 12, 
        minWidth: 350, 
        maxWidth: 500, 
        width: '100%', 
        position: 'relative',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 30px rgba(255, 255, 255, 0.2)',
        color: '#ffffff'
      }}>
        <button onClick={onClose} style={{ 
          position: 'absolute', 
          top: 8, 
          right: 8, 
          background: 'none', 
          border: 'none', 
          fontSize: 20, 
          cursor: 'pointer',
          color: 'rgba(255, 255, 255, 0.8)',
          padding: '0.2rem',
          borderRadius: '50%',
          transition: 'all 0.3s ease'
        }}>&times;</button>
        {children}
      </div>
    </div>
  );
};

const sortArrow = (col, sortBy, sortDir) => {
  if (col !== sortBy) return null;
  return sortDir === 'asc' ? ' ▲' : ' ▼';
};

function toCSV(rows, columns) {
  const escape = (str) => `"${String(str).replace(/"/g, '""')}"`;
  const header = columns.map(col => escape(col.label)).join(',');
  const body = rows.map(row => columns.map(col => escape(row[col.key] ?? '')).join(',')).join('\n');
  return header + '\n' + body;
}

const columns = [
  { key: 'source', label: 'Source' },
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'email', label: 'Email' },
  { key: 'position', label: 'Position' },
  { key: 'hrInterviewer', label: 'HR Interviewer' },
  { key: 'technicalInterviewer', label: 'Technical Interviewer' },
  { key: 'hrAssessment', label: 'HR Assessment' },
  { key: 'technicalAssessment', label: 'Technical Assessment' },
  { key: 'finalStatus', label: 'Final Status' }
];

const RecruitmentDashboard = () => {
  const [recruits, setRecruits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    source: '',
    hrAssessment: '',
    finalStatus: ''
  });
  const [deletingId, setDeletingId] = useState(null);
  const [editRecruit, setEditRecruit] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const fetchRecruits = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/recruitment', {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (res.ok) {
        setRecruits(data);
      } else {
        setError(data.msg || 'Failed to fetch recruits.');
      }
    } catch (err) {
      setError('Error connecting to server.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecruits();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this recruit?')) return;
    setDeletingId(id);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/recruitment/${id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });
      if (res.ok) {
        setRecruits(recruits.filter(r => r._id !== id));
      } else {
        const data = await res.json();
        setError(data.msg || 'Failed to delete recruit.');
      }
    } catch (err) {
      setError('Error connecting to server.');
    }
    setDeletingId(null);
  };

  const handleEditClick = (recruit) => {
    setEditRecruit(recruit);
    setEditForm({ ...recruit });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/recruitment/${editRecruit._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (res.ok) {
        setRecruits(recruits.map(r => r._id === editRecruit._id ? data : r));
        setEditRecruit(null);
        setEditForm(null);
      } else {
        setError(data.msg || 'Failed to update recruit.');
      }
    } catch (err) {
      setError('Error connecting to server.');
    }
    setSavingEdit(false);
  };

  // Sorting handler
  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({ source: '', hrAssessment: '', finalStatus: '' });
    setSearch('');
    setPage(1);
  };

  // Filter and sort recruits
  const filteredSortedRecruits = recruits.filter(recruit => {
    const matchesSearch = 
      recruit.name.toLowerCase().includes(search.toLowerCase()) ||
      recruit.email.toLowerCase().includes(search.toLowerCase()) ||
      recruit.position.toLowerCase().includes(search.toLowerCase());
    const matchesFilters = 
      (!filters.source || recruit.source === filters.source) &&
      (!filters.hrAssessment || recruit.hrAssessment === filters.hrAssessment) &&
      (!filters.finalStatus || recruit.finalStatus === filters.finalStatus);
    return matchesSearch && matchesFilters;
  }).sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (aVal === undefined || aVal === null) aVal = '';
    if (bVal === undefined || bVal === null) bVal = '';
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalRows = filteredSortedRecruits.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
  const paginatedRecruits = filteredSortedRecruits.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleExportCSV = () => {
    const csv = toCSV(filteredSortedRecruits, columns);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recruits.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      'Approved': 'background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%); color: white;',
      'Rejected': 'background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); color: white;',
      'Pending': 'background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: white;',
      'Offered': 'background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%); color: white;',
      'Hired': 'background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%); color: white;',
      'Accepted': 'background: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%); color: white;'
    };
    
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '0.875rem',
        fontWeight: '500',
        textTransform: 'capitalize',
        ...(statusStyles[status] ? { background: statusStyles[status].split(';')[0].split(':')[1], color: 'white' } : { background: '#666', color: 'white' })
      }}>
        {status || '-'}
      </span>
    );
  };

  return (
    <div className="recruitment-dashboard">
      <style>{`
        .recruitment-dashboard {
          background: linear-gradient(145deg, rgba(0, 0, 0, 0.8), rgba(26, 26, 26, 0.9));
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(255, 255, 255, 0.1);
          padding: 2rem;
          color: #ffffff;
        }
        
        .dashboard-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 2rem;
          color: #ffffff;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
          text-align: center;
        }
        
        .stats-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        
        .stat-card {
          background: linear-gradient(145deg, rgba(0, 0, 0, 0.7), rgba(26, 26, 26, 0.8));
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          transition: all 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(255, 255, 255, 0.15);
          border-color: rgba(100, 181, 246, 0.3);
        }
        
        .stat-number {
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 0.5rem;
        }
        
        .stat-label {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.8);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .filters-section {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr auto auto;
          gap: 1rem;
          margin-bottom: 2rem;
          align-items: center;
          padding: 1.5rem;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .filters-section input,
        .filters-section select {
          padding: 12px 16px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.5);
          color: #ffffff;
          font-size: 1rem;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }
        
        .filters-section input:focus,
        .filters-section select:focus {
          border-color: #64b5f6;
          outline: none;
          background: rgba(0, 0, 0, 0.7);
          box-shadow: 0 0 0 3px rgba(100, 181, 246, 0.2);
        }
        
        .filters-section input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }
        
        .filters-section select option {
          background: #1a1a1a;
          color: #ffffff;
        }
        
        .filters-section button {
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          white-space: nowrap;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .filters-section .clear-btn {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
          color: white;
        }
        
        .filters-section .export-btn {
          background: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%);
          color: white;
        }
        
        .filters-section button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        
        .table-container {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(10px);
        }
        
        .recruitment-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1000px;
        }
        
        .recruitment-table th {
          background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
          padding: 1rem;
          text-align: left;
          font-weight: 700;
          color: #ffffff;
          border-bottom: 2px solid rgba(100, 181, 246, 0.3);
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-size: 0.875rem;
        }
        
        .recruitment-table th:hover {
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
        }
        
        .recruitment-table td {
          padding: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          transition: all 0.3s ease;
        }
        
        .recruitment-table tr:hover {
          background: rgba(100, 181, 246, 0.1);
        }
        
        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }
        
        .action-buttons button {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .action-buttons .edit-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .action-buttons .delete-btn {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
          color: white;
        }
        
        .action-buttons button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        
        .action-buttons button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 2rem;
          padding: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.3);
        }
        
        .pagination button {
          padding: 10px 16px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.5);
          color: #ffffff;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        
        .pagination button:disabled {
          background: rgba(0, 0, 0, 0.3);
          color: rgba(255, 255, 255, 0.3);
          cursor: not-allowed;
        }
        
        .pagination button:not(:disabled):hover {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          transform: translateY(-2px);
        }
        
        .pagination .page-info {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .modal-content {
          padding: 2rem;
        }
        
        .modal-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: #ffffff;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        .modal-form {
          display: grid;
          gap: 1rem;
        }
        
        .modal-form label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .modal-form input,
        .modal-form select {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.5);
          color: #ffffff;
          font-size: 1rem;
          transition: all 0.3s ease;
        }
        
        .modal-form input:focus,
        .modal-form select:focus {
          border-color: #64b5f6;
          outline: none;
          background: rgba(0, 0, 0, 0.7);
          box-shadow: 0 0 0 3px rgba(100, 181, 246, 0.2);
        }
        
        .modal-form select option {
          background: #1a1a1a;
          color: #ffffff;
        }
        
        .modal-form button {
          margin-top: 1rem;
          padding: 12px 24px;
          background: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.3s ease;
        }
        
        .modal-form button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 210, 255, 0.3);
        }
        
        .modal-form button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .loading-message {
          text-align: center;
          padding: 2rem;
          color: rgba(255, 255, 255, 0.8);
          font-size: 1.1rem;
        }
        
        .error-message {
          background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
          color: white;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-weight: 500;
          box-shadow: 0 4px 15px rgba(244, 67, 54, 0.3);
        }
        
        .no-records {
          text-align: center;
          padding: 3rem;
          color: rgba(255, 255, 255, 0.6);
          font-size: 1.1rem;
        }
        
        @media (max-width: 1200px) {
          .filters-section {
            grid-template-columns: 1fr 1fr 1fr;
          }
          .filters-section input {
            grid-column: 1 / -1;
          }
        }
        
        @media (max-width: 768px) {
          .recruitment-dashboard {
            padding: 1rem;
          }
          
          .dashboard-title {
            font-size: 1.5rem;
          }
          
          .filters-section {
            grid-template-columns: 1fr;
            gap: 0.75rem;
            padding: 1rem;
          }
          
          .table-container {
            margin: 0 -1rem;
            border-radius: 0;
          }
          
          .pagination {
            flex-wrap: wrap;
            justify-content: center;
            gap: 0.5rem;
          }
          
          .stats-section {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      <div className="dashboard-title">📊 Recruitment Dashboard</div>
      
      {/* Stats Section */}
      <div className="stats-section">
        <div className="stat-card">
          <div className="stat-number">{recruits.length}</div>
          <div className="stat-label">Total Recruits</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{recruits.filter(r => r.finalStatus === 'Pending').length}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{recruits.filter(r => r.finalStatus === 'Hired').length}</div>
          <div className="stat-label">Hired</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{recruits.filter(r => r.hrAssessment === 'Approved').length}</div>
          <div className="stat-label">HR Approved</div>
        </div>
      </div>
      
      <div className="filters-section">
        <input
          type="text"
          placeholder="🔍 Search by name, email, or position..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select 
          value={filters.source} 
          onChange={e => { setFilters(f => ({ ...f, source: e.target.value })); setPage(1); }}
        >
          <option value="">All Sources</option>
          <option value="LinkedIn">LinkedIn</option>
          <option value="Wuzzuf">Wuzzuf</option>
          <option value="Facebook">Facebook</option>
          <option value="Referral">Referral</option>
        </select>
        <select 
          value={filters.hrAssessment} 
          onChange={e => { setFilters(f => ({ ...f, hrAssessment: e.target.value })); setPage(1); }}
        >
          <option value="">All HR Assessments</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Pending">Pending</option>
        </select>
        <select 
          value={filters.finalStatus} 
          onChange={e => { setFilters(f => ({ ...f, finalStatus: e.target.value })); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="Offered">Offered</option>
          <option value="Hired">Hired</option>
          <option value="Accepted">Accepted</option>
          <option value="Pending">Pending</option>
          <option value="Rejected">Rejected</option>
        </select>
        <button className="clear-btn" onClick={handleClearFilters}>🗑️ Clear</button>
        <button className="export-btn" onClick={handleExportCSV}>📥 Export CSV</button>
      </div>

      {loading && <div className="loading-message">⏳ Loading recruits...</div>}
      {error && <div className="error-message">❌ {error}</div>}

      <div className="table-container">
        <div style={{ overflowX: 'auto' }}>
          <table className="recruitment-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)}>
                    {col.label}{sortArrow(col.key, sortBy, sortDir)}
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecruits.map(recruit => (
                <tr key={recruit._id}>
                  {columns.map(col => (
                    <td key={col.key}>
                      {col.key === 'hrAssessment' || col.key === 'finalStatus' 
                        ? getStatusBadge(recruit[col.key])
                        : recruit[col.key] || '-'
                      }
                    </td>
                  ))}
                  <td>
                    <div className="action-buttons">
                      <button
                        className="edit-btn"
                        onClick={() => handleEditClick(recruit)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(recruit._id)}
                        disabled={deletingId === recruit._id}
                      >
                        {deletingId === recruit._id ? '⏳ Deleting...' : '🗑️ Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedRecruits.length === 0 && !loading && (
                <tr>
                  <td colSpan={columns.length + 1} className="no-records">
                    📭 No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pagination">
        <button onClick={() => setPage(1)} disabled={page === 1}>⏮️ First</button>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>⬅️ Prev</button>
        <span className="page-info">Page {page} of {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>➡️ Next</button>
        <button onClick={() => setPage(totalPages)} disabled={page === totalPages}>⏭️ Last</button>
      </div>

      <Modal show={!!editRecruit} onClose={() => { setEditRecruit(null); setEditForm(null); }}>
        <div className="modal-content">
          <div className="modal-title">✏️ Edit Recruit</div>
          {editForm && (
            <form className="modal-form" onSubmit={handleEditSubmit}>
              <div>
                <label>Source</label>
                <select name="source" value={editForm.source} onChange={handleEditChange} required>
                  <option value="">Select Source</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Wuzzuf">Wuzzuf</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Referral">Referral</option>
                </select>
              </div>
              <div>
                <label>Name</label>
                <input name="name" type="text" value={editForm.name} onChange={handleEditChange} required />
              </div>
              <div>
                <label>Phone Number</label>
                <input name="phone" type="tel" value={editForm.phone} onChange={handleEditChange} required />
              </div>
              <div>
                <label>Email</label>
                <input name="email" type="email" value={editForm.email} onChange={handleEditChange} required />
              </div>
              <div>
                <label>Position</label>
                <input name="position" type="text" value={editForm.position} onChange={handleEditChange} required />
              </div>
              <div>
                <label>HR Interviewer</label>
                <select name="hrInterviewer" value={editForm.hrInterviewer} onChange={handleEditChange} required>
                  <option value="">Select HR Interviewer</option>
                  <option value="Sandra">Sandra</option>
                  <option value="Nour">Nour</option>
                </select>
              </div>
              <div>
                <label>Technical Interviewer</label>
                <select name="technicalInterviewer" value={editForm.technicalInterviewer} onChange={handleEditChange} required>
                  <option value="">Select Technical Interviewer</option>
                  <option value="Sales Manager">Sales Manager</option>
                  <option value="Sales Director">Sales Director</option>
                  <option value="Marketing Manager">Marketing Manager</option>
                  <option value="Operation Manager">Operation Manager</option>
                  <option value="CFO">CFO</option>
                  <option value="Legal Manager">Legal Manager</option>
                </select>
              </div>
              <div>
                <label>HR Assessment</label>
                <select name="hrAssessment" value={editForm.hrAssessment} onChange={handleEditChange} required>
                  <option value="">Select Assessment</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div>
                <label>Technical Assessment</label>
                <input name="technicalAssessment" type="text" value={editForm.technicalAssessment || ''} onChange={handleEditChange} />
              </div>
              <div>
                <label>Final Status</label>
                <select name="finalStatus" value={editForm.finalStatus} onChange={handleEditChange} required>
                  <option value="">Select Status</option>
                  <option value="Offered">Offered</option>
                  <option value="Hired">Hired</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Pending">Pending</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <button type="submit" disabled={savingEdit}>
                {savingEdit ? '⏳ Saving...' : '💾 Save Changes'}
              </button>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default RecruitmentDashboard;