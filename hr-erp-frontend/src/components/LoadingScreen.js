import React, { useState } from 'react';

// Try to import logo - will use fallback if not available
let logo;
try {
  logo = require('../assets/njd-logo.png');
} catch (e) {
  logo = null;
}

const LoadingScreen = ({ message = "Loading...", size = "default", overlay = true }) => {
  const [logoError, setLogoError] = useState(false);
  const sizeConfig = {
    small: { logo: '80px', title: '1.5rem', spinner: '40px' },
    default: { logo: '120px', title: '2rem', spinner: '60px' },
    large: { logo: '160px', title: '2.5rem', spinner: '80px' }
  };

  const config = sizeConfig[size];

  return (
    <div className={`loading-screen ${overlay ? 'overlay' : 'inline'}`}>
      <style>{`
        .loading-screen {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          z-index: 9999;
          color: white;
        }
        
        .loading-screen.overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        
        .loading-screen.inline {
          min-height: 400px;
          border-radius: 12px;
          margin: 1rem;
        }
        
        .loading-content {
          text-align: center;
          animation: fadeInUp 0.6s ease-out;
          max-width: 90%;
        }
        
        .loading-logo {
          width: ${config.logo};
          height: auto;
          margin-bottom: 1.5rem;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
          animation: pulse 2.5s ease-in-out infinite;
        }
        
        .loading-title {
          font-size: ${config.title};
          font-weight: 700;
          color: white;
          margin-bottom: 0.5rem;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
          letter-spacing: 1px;
        }
        
        .loading-subtitle {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 1rem;
          font-style: italic;
        }
        
        .loading-message {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 2rem;
          font-weight: 500;
        }
        
        .loading-spinner {
          width: ${config.spinner};
          height: ${config.spinner};
          border: 4px solid rgba(255, 255, 255, 0.2);
          border-top: 4px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem auto;
        }
        
        .progress-indicator {
          width: 200px;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          margin: 1.5rem auto;
          overflow: hidden;
          position: relative;
        }
        
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 1));
          border-radius: 3px;
          animation: progress 2s ease-in-out infinite;
        }
        
        .loading-dots {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-top: 1rem;
        }
        
        .loading-dot {
          width: 10px;
          height: 10px;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 50%;
          animation: bounce 1.4s ease-in-out infinite both;
        }
        
        .loading-dot:nth-child(1) { animation-delay: -0.32s; }
        .loading-dot:nth-child(2) { animation-delay: -0.16s; }
        .loading-dot:nth-child(3) { animation-delay: 0s; }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
        
        @keyframes progress {
          0% {
            width: 0%;
            transform: translateX(-100%);
          }
          50% {
            width: 100%;
            transform: translateX(0%);
          }
          100% {
            width: 100%;
            transform: translateX(100%);
          }
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .loading-title {
            font-size: 1.5rem;
          }
          .loading-logo {
            width: 100px;
          }
          .loading-spinner {
            width: 50px;
            height: 50px;
          }
          .progress-indicator {
            width: 150px;
          }
        }
      `}</style>
      
      <div className="loading-content">
        {logo && !logoError ? (
          <img 
            src={logo} 
            alt="NJD Logo" 
            className="loading-logo" 
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="loading-logo-fallback" style={{
            width: config.logo,
            height: config.logo,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            fontSize: '3rem',
            marginBottom: '1.5rem',
            animation: 'pulse 2.5s ease-in-out infinite'
          }}>
            🏢
          </div>
        )}
        <h1 className="loading-title">NEW JERSEY DEVELOPMENTS</h1>
        <p className="loading-subtitle">It's all about The Experience</p>
        <p className="loading-message">{message}</p>
        
        <div className="loading-spinner"></div>
        
        <div className="progress-indicator">
          <div className="progress-bar"></div>
        </div>
        
        <div className="loading-dots">
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(LoadingScreen); 
