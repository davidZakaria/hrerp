import React from 'react';

const ExportPrintButtons = ({ 
  forms, 
  activeFormType, 
  sectionType, 
  sectionTitle 
}) => {
  
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFilteredForms = () => {
    switch (sectionType) {
      case 'pending':
        return forms.filter(f => f.type === activeFormType && f.status === 'pending');
      case 'awaiting':
        return forms.filter(f => f.type === activeFormType && (f.status === 'manager_approved' || f.status === 'manager_submitted'));
      case 'history':
        return forms.filter(f => f.type === activeFormType && ['approved', 'rejected', 'manager_rejected'].includes(f.status));
      default:
        return [];
    }
  };

  const handleExportCSV = () => {
    const filteredForms = getFilteredForms();
    const exportData = filteredForms.map(form => ({
      'Employee Name': form.user?.name || '',
      'Email': form.user?.email || '',
      'Department': form.user?.department || '',
      'Form Type': form.type,
      'Vacation Type': form.vacationType || '',
      'Start Date': form.startDate?.slice(0,10) || form.sickLeaveStartDate?.slice(0,10) || form.excuseDate?.slice(0,10) || '',
      'End Date': form.endDate?.slice(0,10) || form.sickLeaveEndDate?.slice(0,10) || '',
      'From Time': form.fromHour || '',
      'To Time': form.toHour || '',
      'WFH Hours': form.wfhHours || '',
      'WFH Description': form.wfhDescription || '',
      'Reason': form.reason || '',
      'Status': form.status,
      'Manager Comment': form.managerComment || '',
      'Admin Comment': form.adminComment || '',
      'Submitted Date': new Date(form.createdAt).toLocaleDateString(),
      'Completed Date': form.updatedAt ? new Date(form.updatedAt).toLocaleDateString() : ''
    }));
    
    const filename = `${sectionType}_${activeFormType}_${new Date().toISOString().slice(0,10)}.csv`;
    exportToCSV(exportData, filename);
  };

  const handlePrint = () => {
    const filteredForms = getFilteredForms();
    
    const getFormDetails = (form) => {
      if (activeFormType === 'vacation') return form.vacationType || '';
      if (activeFormType === 'wfh') return `${form.wfhHours || 0} hours`;
      if (activeFormType === 'sick_leave') return `${Math.ceil((new Date(form.sickLeaveEndDate) - new Date(form.sickLeaveStartDate)) / (1000 * 60 * 60 * 24)) + 1} days`;
      if (activeFormType === 'excuse') return 'Excuse Request';
      return '';
    };

    const getFormDatesTime = (form) => {
      if (activeFormType === 'vacation') {
        return `${form.startDate?.slice(0,10)} to ${form.endDate?.slice(0,10)}`;
      }
      if (activeFormType === 'sick_leave') {
        return `${form.sickLeaveStartDate?.slice(0,10)} to ${form.sickLeaveEndDate?.slice(0,10)}`;
      }
      if (activeFormType === 'excuse') {
        return `${form.excuseDate?.slice(0,10)} (${form.fromHour} - ${form.toHour})`;
      }
      if (activeFormType === 'wfh') {
        return `${form.wfhHours || 0} hours`;
      }
      return '';
    };

    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${sectionTitle} - ${activeFormType.toUpperCase()}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .company-name { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 10px; }
            .report-title { font-size: 18px; color: #666; margin-bottom: 5px; }
            .report-date { font-size: 14px; color: #999; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .status-approved { color: #4caf50; font-weight: bold; }
            .status-rejected { color: #f44336; font-weight: bold; }
            .status-pending { color: #ff9800; font-weight: bold; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">NEW JERSEY DEVELOPMENTS</div>
            <div class="report-title">${sectionTitle} - ${activeFormType.toUpperCase()}</div>
            <div class="report-date">Generated on: ${new Date().toLocaleDateString()}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Details</th>
                <th>Dates/Time</th>
                <th>Reason</th>
                <th>Status</th>
                ${sectionType === 'awaiting' ? '<th>Manager Comment</th>' : ''}
                ${sectionType === 'history' ? '<th>Comments</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${filteredForms.map(form => `
                <tr>
                  <td>${form.user?.name || ''}</td>
                  <td>${form.user?.department || ''}</td>
                  <td>${getFormDetails(form)}</td>
                  <td>${getFormDatesTime(form)}</td>
                  <td>${form.reason || ''}</td>
                  <td class="status-${form.status}">${form.status === 'manager_rejected' ? 'Rejected by Manager' : form.status}</td>
                  ${sectionType === 'awaiting' ? `<td>${form.managerComment || 'Approved by Manager'}</td>` : ''}
                  ${sectionType === 'history' ? `<td>${[form.managerComment, form.adminComment].filter(Boolean).join(' | ')}</td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button 
        className="btn-elegant btn-sm"
        onClick={handleExportCSV}
        style={{ 
          backgroundColor: '#4CAF50', 
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.85rem'
        }}
      >
        📥 Export CSV
      </button>
      <button 
        className="btn-elegant btn-sm"
        onClick={handlePrint}
        style={{ 
          backgroundColor: '#2196F3', 
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.85rem'
        }}
      >
        🖨️ Print
      </button>
    </div>
  );
};

export default ExportPrintButtons;