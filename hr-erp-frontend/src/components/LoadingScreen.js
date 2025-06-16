import React from 'react';
import logo from '../assets/njd-logo.png';

const LoadingScreen = ({ message = "Loading..." }) => {
  return (
    <div className="loading-screen">
      <style>{`
        .loading-screen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }
        
        .loading-content {
          text-align: center;
          animation: fadeInUp 0.8s ease-out;
        }
        
        .loading-logo {
          width: 120px;
          height: auto;
          margin-bottom: 2rem;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
          animation: pulse 2s ease-in-out infinite;
        }
        
        .loading-title {
          font-size: 2rem;
          font-weight: 700;
          color: white;
          margin-bottom: 1rem;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .loading-message {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 2rem;
        }
        
        .loading-spinner {
          width: 60px;
          height: 60px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        
        .loading-dots {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-top: 1rem;
        }
        
        .loading-dot {
          width: 12px;
          height: 12px;
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
            transform: translateY(30px);
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
        
        .progress-bar {
          width: 200px;
          height: 4px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
          margin: 1rem auto;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 1));
          border-radius: 2px;
          animation: progress 2s ease-in-out infinite;
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
      `}</style>
      
      <div className="loading-content">
        <img src={logo} alt="NJD Logo" className="loading-logo" />
        <h1 className="loading-title">NEW JERSEY DEVELOPMENTS</h1>
        <p className="loading-message">{message}</p>
        
        <div className="loading-spinner"></div>
        
        <div className="progress-bar">
          <div className="progress-fill"></div>
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

export default LoadingScreen; 