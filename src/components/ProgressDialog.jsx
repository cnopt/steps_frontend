import React from 'react';
import '../styles/ProgressDialog.css';

const ProgressDialog = ({ isOpen, stages, onClose }) => {
  if (!isOpen) return null;

  const getStageIcon = (stage, status) => {
    if (status === 'loading') return '⏳';
    if (status === 'completed') return '✅';
    if (status === 'error') return '❌';
    return '⭕';
  };

  const getStageClass = (status) => {
    return `progress-stage progress-stage--${status}`;
  };

  return (
    <div className="progress-dialog-overlay">
      <div className="progress-dialog">
        <div className="progress-dialog-header">
          <h3>Processing Your Walk</h3>
        </div>
        
        <div className="progress-dialog-content">
          {stages.map((stage, index) => (
            <div key={stage.id} className={getStageClass(stage.status)}>
              <div className="progress-stage-icon">
                {getStageIcon(stage, stage.status)}
              </div>
              <div className="progress-stage-content">
                <div className="progress-stage-title">{stage.title}</div>
                <div className="progress-stage-description">{stage.description}</div>
                {stage.status === 'error' && stage.error && (
                  <div className="progress-stage-error">{stage.error}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="progress-dialog-footer">
          {stages.every(stage => stage.status === 'completed' || stage.status === 'error') && (
            <button 
              className="progress-dialog-close-btn"
              onClick={onClose}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressDialog;
