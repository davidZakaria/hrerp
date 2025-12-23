import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

const NotificationItem = ({ notification, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (notification.autoClose !== false) {
      const timer = setTimeout(() => {
        handleRemove();
      }, notification.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleRemove = useCallback(() => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(notification.id);
    }, 300);
  }, [notification.id, onRemove]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  const getColorClass = () => {
    switch (notification.type) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  return (
    <div 
      className={`notification-item ${getColorClass()} ${isVisible ? 'visible' : ''} ${isRemoving ? 'removing' : ''}`}
      onClick={notification.clickable ? handleRemove : undefined}
      style={{ cursor: notification.clickable ? 'pointer' : 'default' }}
    >
      <style>{`
        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px 20px;
          margin-bottom: 12px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
          overflow: hidden;
          transform: translateX(400px);
          opacity: 0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          max-width: 400px;
          word-wrap: break-word;
        }

        .notification-item.visible {
          transform: translateX(0);
          opacity: 1;
        }

        .notification-item.removing {
          transform: translateX(400px);
          opacity: 0;
        }

        .notification-item.success {
          background: linear-gradient(135deg, rgba(76, 175, 80, 0.9), rgba(56, 142, 60, 0.8));
          border-color: rgba(76, 175, 80, 0.4);
        }

        .notification-item.error {
          background: linear-gradient(135deg, rgba(244, 67, 54, 0.9), rgba(211, 47, 47, 0.8));
          border-color: rgba(244, 67, 54, 0.4);
        }

        .notification-item.warning {
          background: linear-gradient(135deg, rgba(255, 152, 0, 0.9), rgba(245, 124, 0, 0.8));
          border-color: rgba(255, 152, 0, 0.4);
        }

        .notification-item.info {
          background: linear-gradient(135deg, rgba(33, 150, 243, 0.9), rgba(25, 118, 210, 0.8));
          border-color: rgba(33, 150, 243, 0.4);
        }

        .notification-item.default {
          background: linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(26, 26, 26, 0.8));
          border-color: rgba(255, 255, 255, 0.2);
        }

        .notification-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .notification-content {
          flex: 1;
          color: white;
        }

        .notification-title {
          font-weight: 600;
          font-size: 1rem;
          margin-bottom: 4px;
          line-height: 1.3;
        }

        .notification-message {
          font-size: 0.9rem;
          line-height: 1.4;
          opacity: 0.95;
        }

        .notification-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .notification-btn {
          padding: 6px 12px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border-radius: 6px;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .notification-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .notification-btn.primary {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .close-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          transition: background-color 0.2s ease;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .progress-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: rgba(255, 255, 255, 0.3);
          animation: progress ${notification.duration || 5000}ms linear;
        }

        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }

        @media (max-width: 768px) {
          .notification-item {
            max-width: calc(100vw - 32px);
            margin-left: 16px;
            margin-right: 16px;
          }
        }
      `}</style>

      <div className="notification-icon">{getIcon()}</div>
      
      <div className="notification-content">
        {notification.title && (
          <div className="notification-title">{notification.title}</div>
        )}
        <div className="notification-message">{notification.message}</div>
        
        {notification.actions && (
          <div className="notification-actions">
            {notification.actions.map((action, index) => (
              <button
                key={index}
                className={`notification-btn ${action.primary ? 'primary' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                  if (action.closeOnClick !== false) {
                    handleRemove();
                  }
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {notification.closable !== false && (
        <button className="close-btn" onClick={handleRemove}>
          ×
        </button>
      )}

      {notification.autoClose !== false && (
        <div className="progress-bar"></div>
      )}
    </div>
  );
};

const NotificationContainer = ({ notifications, removeNotification }) => {
  return (
    <div className="notification-container">
      <style>{`
        .notification-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          pointer-events: none;
        }

        .notification-container > * {
          pointer-events: auto;
        }

        @media (max-width: 768px) {
          .notification-container {
            top: 10px;
            right: 0;
            left: 0;
          }
        }
      `}</style>

      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </div>
  );
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: 'info',
      duration: 5000,
      autoClose: true,
      closable: true,
      clickable: true,
      ...notification
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep max 5 notifications
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const success = useCallback((message, options = {}) => {
    return addNotification({ ...options, message, type: 'success' });
  }, [addNotification]);

  const error = useCallback((message, options = {}) => {
    return addNotification({ 
      ...options, 
      message, 
      type: 'error',
      duration: 8000 // Errors stay longer
    });
  }, [addNotification]);

  const warning = useCallback((message, options = {}) => {
    return addNotification({ ...options, message, type: 'warning' });
  }, [addNotification]);

  const info = useCallback((message, options = {}) => {
    return addNotification({ ...options, message, type: 'info' });
  }, [addNotification]);

  const loading = useCallback((message, options = {}) => {
    return addNotification({ 
      ...options, 
      message, 
      type: 'info',
      autoClose: false,
      closable: false,
      clickable: false
    });
  }, [addNotification]);

  const contextValue = {
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info,
    loading
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationContainer 
        notifications={notifications}
        removeNotification={removeNotification}
      />
    </NotificationContext.Provider>
  );
};

export default NotificationProvider; 
