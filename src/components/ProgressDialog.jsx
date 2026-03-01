import React, { useState, useLayoutEffect } from 'react';
import '../styles/ProgressDialog.css';

const ProgressDialog = ({ isOpen, stages, onClose }) => {
  const [closing, setClosing] = useState(false);

  useLayoutEffect(() => {
    if (isOpen) setClosing(false);
  }, [isOpen]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose(), 220);
  };

  if (!isOpen) return null;

  const isComplete = stages.every(stage => stage.status === 'completed' || stage.status === 'error');

  return (
    <div className={`progress-overlay ${closing ? 'closing' : ''}`}>
      <div
        className={`progress-sheet ${closing ? 'closing' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="progress-handle" />

        <div className="progress-header">
          <h3>Processing Walk</h3>
        </div>

        <div className="progress-stages">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className={`progress-stage-box progress-stage-box--${stage.status}`}
            >
              <span className={`progress-stage-icon progress-stage-icon--${stage.status}`} />
              <div className="progress-stage-box-content">
                <div className="progress-stage-box-title">{stage.title}</div>
              </div>
            </div>
          ))}
        </div>

        {isComplete && (
          <div className="progress-footer">
            <button className="progress-continue-btn" onClick={handleClose}>
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressDialog;
