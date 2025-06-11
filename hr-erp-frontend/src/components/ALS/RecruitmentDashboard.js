import React, { useState, useEffect } from 'react';

const Modal = ({ show, onClose, children }) => {
  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 350, maxWidth: 500, width: '100%', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>&times;</button>
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

  return (
    <div>
      {/* Responsive styles for mobile */}
      <style>{`
        @media (max-width: 700px) {
          .ats-filters {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
          }
          .ats-table-wrapper {
            border-radius: 0 !important;
          }
          .ats-table {
            font-size: 13px !important;
            min-width: 600px !important;
          }
          .ats-table th, .ats-table td {
            padding: 6px 4px !important;
          }
          .ats-pagination {
            flex-direction: column !important;
            gap: 4px !important;
          }
        }
      `}</style>
      <h2>Recruitment Dashboard</h2>
      
      {/* Search and Filters */}
      <div className="ats-filters" style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <input
          type="text"
          placeholder="Search by name, email, or position..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '60%', minWidth: 200, marginBottom: 0, fontSize: 16, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
        <select name="source" value={filters.source} onChange={e => { setFilters(f => ({ ...f, source: e.target.value })); setPage(1); }} style={{ fontSize: 16, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}>
          <option value="">All Sources</option>
          <option value="LinkedIn">LinkedIn</option>
          <option value="Wuzzuf">Wuzzuf</option>
          <option value="Facebook">Facebook</option>
          <option value="Referral">Referral</option>
        </select>
        <select name="hrAssessment" value={filters.hrAssessment} onChange={e => { setFilters(f => ({ ...f, hrAssessment: e.target.value })); setPage(1); }} style={{ fontSize: 16, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}>
          <option value="">All HR Assessments</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Pending">Pending</option>
        </select>
        <select name="finalStatus" value={filters.finalStatus} onChange={e => { setFilters(f => ({ ...f, finalStatus: e.target.value })); setPage(1); }} style={{ fontSize: 16, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}>
          <option value="">All Statuses</option>
          <option value="Offered">Offered</option>
          <option value="Hired">Hired</option>
          <option value="Accepted">Accepted</option>
          <option value="Pending">Pending</option>
          <option value="Rejected">Rejected</option>
        </select>
        <button onClick={handleClearFilters} style={{ padding: '8px 12px', background: '#eee', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', fontSize: 16 }}>Clear Filters</button>
        <button onClick={handleExportCSV} style={{ padding: '8px 12px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 16 }}>Export CSV</button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Recruits Table */}
      <div className="ats-table-wrapper" style={{ overflowX: 'auto', borderRadius: '4px' }}>
        <table className="ats-table" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '4px' }} border="1" cellPadding="8">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} style={{ cursor: 'pointer' }} onClick={() => handleSort(col.key)}>
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
                  <td key={col.key}>{recruit[col.key] || '-'}</td>
                ))}
                <td>
                  <button
                    style={{
                      marginRight: 6,
                      padding: '6px 10px',
                      backgroundColor: '#2196F3',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: 15
                    }}
                    onClick={() => handleEditClick(recruit)}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(recruit._id)}
                    disabled={deletingId === recruit._id}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#f44336',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      opacity: deletingId === recruit._id ? 0.6 : 1,
                      fontSize: 15
                    }}
                  >
                    {deletingId === recruit._id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
            {paginatedRecruits.length === 0 && (
              <tr><td colSpan={columns.length + 1} style={{ textAlign: 'center', color: '#888' }}>No records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="ats-pagination" style={{ marginTop: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        <button onClick={() => setPage(1)} disabled={page === 1} style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc', background: page === 1 ? '#eee' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 15 }}>First</button>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc', background: page === 1 ? '#eee' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 15 }}>Prev</button>
        <span style={{ fontSize: 15 }}>Page {page} of {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc', background: page === totalPages ? '#eee' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 15 }}>Next</button>
        <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc', background: page === totalPages ? '#eee' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 15 }}>Last</button>
      </div>

      <Modal show={!!editRecruit} onClose={() => { setEditRecruit(null); setEditForm(null); }}>
        <h3>Edit Recruit</h3>
        {editForm && (
          <form onSubmit={handleEditSubmit}>
            <label>Source</label>
            <select name="source" value={editForm.source} onChange={handleEditChange} required style={{ width: '100%', marginBottom: 8 }}>
              <option value="">Select Source</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Wuzzuf">Wuzzuf</option>
              <option value="Facebook">Facebook</option>
              <option value="Referral">Referral</option>
            </select>
            <label>Name</label>
            <input name="name" type="text" value={editForm.name} onChange={handleEditChange} required style={{ width: '100%', marginBottom: 8 }} />
            <label>Phone Number</label>
            <input name="phone" type="tel" value={editForm.phone} onChange={handleEditChange} required style={{ width: '100%', marginBottom: 8 }} />
            <label>Email</label>
            <input name="email" type="email" value={editForm.email} onChange={handleEditChange} required style={{ width: '100%', marginBottom: 8 }} />
            <label>Position</label>
            <input name="position" type="text" value={editForm.position} onChange={handleEditChange} required style={{ width: '100%', marginBottom: 8 }} />
            <label>HR Interviewer</label>
            <select name="hrInterviewer" value={editForm.hrInterviewer} onChange={handleEditChange} required style={{ width: '100%', marginBottom: 8 }}>
              <option value="">Select HR Interviewer</option>
              <option value="Sandra">Sandra</option>
              <option value="Nour">Nour</option>
            </select>
            <label>Technical Interviewer</label>
            <select name="technicalInterviewer" value={editForm.technicalInterviewer} onChange={handleEditChange} required style={{ width: '100%', marginBottom: 8 }}>
              <option value="">Select Technical Interviewer</option>
              <option value="Sales Manager">Sales Manager</option>
              <option value="Sales Director">Sales Director</option>
              <option value="Marketing Manager">Marketing Manager</option>
              <option value="Operation Manager">Operation Manager</option>
              <option value="CFO">CFO</option>
              <option value="Legal Manager">Legal Manager</option>
            </select>
            <label>HR Assessment</label>
            <select name="hrAssessment" value={editForm.hrAssessment} onChange={handleEditChange} required style={{ width: '100%', marginBottom: 8 }}>
              <option value="">Select Assessment</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Pending">Pending</option>
            </select>
            <label>Technical Assessment</label>
            <input name="technicalAssessment" type="text" value={editForm.technicalAssessment || ''} onChange={handleEditChange} style={{ width: '100%', marginBottom: 8 }} />
            <label>Final Status</label>
            <select name="finalStatus" value={editForm.finalStatus} onChange={handleEditChange} required style={{ width: '100%', marginBottom: 8 }}>
              <option value="">Select Status</option>
              <option value="Offered">Offered</option>
              <option value="Hired">Hired</option>
              <option value="Accepted">Accepted</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
            <button type="submit" disabled={savingEdit} style={{ width: '100%', padding: 8, backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 8 }}>
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default RecruitmentDashboard; 