import React, { useState } from 'react';
import axios from 'axios';

const MedicalDocumentViewer = ({ form, userRole = 'admin' }) => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  // Function to get file extension icon
  const getFileIcon = (filename) => {
    if (!filename) return '📄';
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf': return '📋';
      case 'doc':
      case 'docx': return '📝';
      case 'jpg':
      case 'jpeg':
      case 'png': return '🖼️';
      default: return '📄';
    }
  };

  // Function to download medical document
  const downloadDocument = async () => {
    if (!form.medicalDocument) return;
    
    setDownloading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      // Handle both forward slashes and backslashes in paths
      const filename = form.medicalDocument.split(/[/\\]/).pop();
      
      console.log('Downloading document:', {
        originalPath: form.medicalDocument,
        extractedFilename: filename,
        formId: form._id
      });
      
      const response = await axios.get(`http://localhost:5000/api/forms/document/${filename}`, {
        headers: {
          'x-auth-token': token
        },
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename for download
      const ext = filename.split('.').pop();
      link.setAttribute('download', `${form.user.name}-medical-document.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Download error:', err);
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      
      if (err.response?.status === 403) {
        setError('Not authorized to view this document');
      } else if (err.response?.status === 404) {
        setError('Document not found - File may have been moved or deleted');
      } else if (err.response?.data?.msg) {
        setError(err.response.data.msg);
      } else {
        setError('Error downloading document');
      }
    }
    
    setDownloading(false);
  };

  // Function to get document info
  const getDocumentInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/forms/document-info/${form._id}`, {
        headers: {
          'x-auth-token': token
        }
      });
      return response.data;
    } catch (err) {
      console.error('Error getting document info:', err);
      return null;
    }
  };

  if (!form.medicalDocument) {
    return (
      <div className="medical-document-viewer no-document">
        <span className="document-status">❌ No medical document attached</span>
      </div>
    );
  }

  const filename = form.medicalDocument.split(/[/\\]/).pop();
  const fileIcon = getFileIcon(filename);

  return (
    <div className="medical-document-viewer">
      <div className="document-info">
        <div className="document-header">
          <span className="document-icon">{fileIcon}</span>
          <div className="document-details">
            <div className="document-title">Medical Document</div>
            <div className="document-meta">
              Submitted by: {form.user.name}
            </div>
          </div>
        </div>
        
        <div className="document-actions">
          <button 
            className="download-btn"
            onClick={downloadDocument}
            disabled={downloading}
            title="Download medical document"
          >
            {downloading ? (
              <>
                <span className="loading-spinner">⏳</span>
                Downloading...
              </>
            ) : (
              <>
                <span className="download-icon">⬇️</span>
                Download
              </>
            )}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="document-error">
          <span className="error-icon">❌</span>
          {error}
        </div>
      )}
    </div>
  );
};

export default MedicalDocumentViewer; 