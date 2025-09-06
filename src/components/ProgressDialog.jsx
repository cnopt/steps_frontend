import React from 'react';
import '../styles/ProgressDialog.css';

const ProgressDialog = ({ isOpen, stages, onClose }) => {
  if (!isOpen) return null;

  const getStageIcon = (status) => {
    if (status === 'loading') return '⏳';
    if (status === 'completed') return '✅';
    if (status === 'error') return '❌';
    return '⭕';
  };

  const getStageClass = (status) => {
    return `progress-stage progress-stage--${status}`;
  };

  // Find the current active stage
  const currentStage = stages.find(stage => stage.status === 'loading') || 
                      stages.find(stage => stage.status === 'error') ||
                      stages[stages.length - 1];

  const isComplete = stages.every(stage => stage.status === 'completed' || stage.status === 'error');

  return (
    <div className="progress-dialog-overlay">
      <div className="progress-dialog">
        <div className="progress-dialog-header">
          <h3>Processing Your Walk</h3>
        </div>
        
        <div className="progress-dialog-content">
          {currentStage && (
            <div className={getStageClass(currentStage.status)}>
              <div className="progress-stage-icon">
                {getStageIcon(currentStage.status)}
              </div>
              <div className="progress-stage-content">
                <div className="progress-stage-title">{currentStage.title}</div>
                <div className="progress-stage-description">{currentStage.description}</div>
                {currentStage.status === 'error' && currentStage.error && (
                  <div className="progress-stage-error">{currentStage.error}</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="progress-dialog-footer">
          {isComplete && (
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
