import React, { useState } from 'react';
import axios from 'axios';
import API_URL from '../config/api';
import logger from '../utils/logger';

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
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Handle both forward slashes and backslashes in paths
      const filename = form.medicalDocument.split(/[/\\]/).pop();
      
      logger.log('Downloading document:', {
        originalPath: form.medicalDocument,
        extractedFilename: filename,
        formId: form._id,
        userRole: userRole
      });
      
      const response = await axios.get(`${API_URL}/api/forms/document/${filename}`, {
        headers: {
          'x-auth-token': token
        },
        responseType: 'blob',
        timeout: 30000 // 30 second timeout
      });

      // Check if response is valid
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if we got a valid blob
      if (!response.data || response.data.size === 0) {
        throw new Error('Empty file received from server');
      }

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename for download
      const ext = filename.split('.').pop();
      const downloadName = `${form.user.name}-medical-document.${ext}`;
      link.setAttribute('download', downloadName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      logger.log('Document downloaded successfully:', downloadName);
      
    } catch (err) {
      logger.error('Download error:', err);
      logger.error('Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
        code: err.code
      });
      
      let errorMessage = 'Error downloading document';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Download timed out - File may be too large or server is slow';
      } else if (err.response) {
        // Server responded with error status
        const status = err.response.status;
        if (status === 403) {
          errorMessage = 'Not authorized to view this document';
        } else if (status === 404) {
          errorMessage = 'Document not found - File may have been moved or deleted';
        } else if (status === 500) {
          errorMessage = 'Server error while retrieving document';
        } else if (err.response.data?.msg) {
          errorMessage = err.response.data.msg;
        } else {
          errorMessage = `Server error: ${status}`;
        }
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'No response from server - Please check your connection';
      } else if (err.message.includes('No authentication token')) {
        errorMessage = 'Please log in again to download documents';
      } else {
        errorMessage = `Network error: ${err.message}`;
      }
      
      setError(errorMessage);
    }
    
    setDownloading(false);
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
