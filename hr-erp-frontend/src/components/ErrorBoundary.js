import React from 'react';
import logo from '../assets/njd-logo.png';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to external service if needed
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    // This could be sent to an error tracking service like Sentry
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: localStorage.getItem('userId'),
      userRole: localStorage.getItem('userRole')
    };

    console.error('Error logged:', errorData);
    
    // Could send to backend endpoint for logging
    // fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorData) })
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      return (
        <div className="error-boundary">
          <style>{`
            .error-boundary {
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-align: center;
              padding: 2rem;
              font-family: system-ui, -apple-system, sans-serif;
            }

            .error-content {
              max-width: 600px;
              background: rgba(0, 0, 0, 0.3);
              padding: 3rem;
              border-radius: 16px;
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.1);
              animation: fadeInUp 0.6s ease-out;
            }

            .error-logo {
              width: 100px;
              height: auto;
              margin-bottom: 2rem;
              filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
            }

            .error-title {
              font-size: 2.5rem;
              font-weight: 700;
              margin-bottom: 1rem;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
            }

            .error-subtitle {
              font-size: 1.2rem;
              margin-bottom: 2rem;
              opacity: 0.9;
              line-height: 1.5;
            }

            .error-message {
              background: rgba(244, 67, 54, 0.2);
              border: 1px solid rgba(244, 67, 54, 0.4);
              border-radius: 8px;
              padding: 1rem;
              margin: 1.5rem 0;
              font-family: monospace;
              font-size: 0.9rem;
              text-align: left;
              word-break: break-word;
            }

            .error-actions {
              display: flex;
              gap: 1rem;
              justify-content: center;
              flex-wrap: wrap;
              margin-top: 2rem;
            }

            .error-btn {
              padding: 12px 24px;
              border: 2px solid rgba(255, 255, 255, 0.3);
              background: rgba(255, 255, 255, 0.1);
              color: white;
              border-radius: 8px;
              cursor: pointer;
              font-size: 1rem;
              font-weight: 600;
              transition: all 0.3s ease;
              backdrop-filter: blur(5px);
            }

            .error-btn:hover {
              background: rgba(255, 255, 255, 0.2);
              border-color: rgba(255, 255, 255, 0.5);
              transform: translateY(-2px);
            }

            .error-btn.primary {
              background: rgba(76, 175, 80, 0.3);
              border-color: rgba(76, 175, 80, 0.6);
            }

            .error-btn.primary:hover {
              background: rgba(76, 175, 80, 0.5);
            }

            .error-details {
              margin-top: 2rem;
              padding: 1rem;
              background: rgba(0, 0, 0, 0.3);
              border-radius: 8px;
              font-family: monospace;
              font-size: 0.8rem;
              text-align: left;
              max-height: 200px;
              overflow-y: auto;
              border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .retry-info {
              margin-top: 1rem;
              font-size: 0.9rem;
              opacity: 0.8;
            }

            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            @media (max-width: 768px) {
              .error-content {
                padding: 2rem;
                margin: 1rem;
              }

              .error-title {
                font-size: 2rem;
              }

              .error-actions {
                flex-direction: column;
                align-items: center;
              }

              .error-btn {
                width: 100%;
                max-width: 200px;
              }
            }
          `}</style>

          <div className="error-content">
            <img src={logo} alt="NJD Logo" className="error-logo" />
            
            <h1 className="error-title">😔 Oops!</h1>
            <p className="error-subtitle">
              Something went wrong with the application. Don't worry, our team has been notified.
            </p>

            {this.state.error && (
              <div className="error-message">
                <strong>Error:</strong> {this.state.error.message}
              </div>
            )}

            {this.state.retryCount > 0 && (
              <div className="retry-info">
                Retry attempts: {this.state.retryCount}
              </div>
            )}

            <div className="error-actions">
              <button 
                className="error-btn primary" 
                onClick={this.handleRetry}
              >
                🔄 Try Again
              </button>
              <button 
                className="error-btn" 
                onClick={this.handleRefresh}
              >
                🔃 Refresh Page
              </button>
              <button 
                className="error-btn" 
                onClick={this.handleGoHome}
              >
                🏠 Go Home
              </button>
            </div>

            {isDevelopment && this.state.error && (
              <details className="error-details">
                <summary style={{ cursor: 'pointer', marginBottom: '1rem' }}>
                  🔍 Technical Details (Development Mode)
                </summary>
                <div>
                  <strong>Stack Trace:</strong>
                  <pre>{this.state.error.stack}</pre>
                </div>
                {this.state.errorInfo && (
                  <div style={{ marginTop: '1rem' }}>
                    <strong>Component Stack:</strong>
                    <pre>{this.state.errorInfo.componentStack}</pre>
                  </div>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export const withErrorBoundary = (Component, fallback = null) => {
  return function WrappedComponent(props) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

export default ErrorBoundary; 
