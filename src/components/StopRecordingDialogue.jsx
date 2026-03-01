import React, { useState, useLayoutEffect } from 'react';
import '../styles/StopRecordingDialogue.css';

function StopRecordingDialogue({ isOpen, onClose, onDiscard, onFinishWalk }) {
  const [closing, setClosing] = useState(false);

  useLayoutEffect(() => {
    if (isOpen) setClosing(false);
  }, [isOpen]);

  const handleClose = (callback) => {
    setClosing(true);
    setTimeout(() => callback(), 200);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`stop-recording-overlay ${closing ? 'closing' : ''}`}
      onClick={() => onClose && handleClose(onClose)}
    >
      <div
        className={`stop-recording-sheet ${closing ? 'closing' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="stop-recording-handle" />

        <div className="stop-recording-header">
          <h3>Recording Paused</h3>
        </div>

        <div className="stop-recording-buttons">
          <button
            className="stop-recording-btn stop-recording-btn--finish"
            onClick={() => handleClose(onFinishWalk)}
          >
            <span>✓</span>
            Finish Walk
          </button>

          <button
            className="stop-recording-btn stop-recording-btn--discard"
            onClick={() => handleClose(onDiscard)}
          >
            <span>🗑</span>
            Discard Walk
          </button>
        </div>
      </div>
    </div>
  );
}

export default StopRecordingDialogue;
