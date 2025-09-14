import React from 'react';
import '../styles/StopRecordingDialogue.css';

function StopRecordingDialogue({ isOpen, onDiscard, onFinishWalk }) {
  if (!isOpen) return null;

  return (
    <div className="stop-recording-dialogue-overlay">
      <div className="stop-recording-dialogue">
        <div className="stop-recording-dialogue__content">
          <h3>Recording Stopped</h3>
          
          <div className="stop-recording-dialogue__buttons">
            <button 
              className="stop-recording-dialogue__button stop-recording-dialogue__button--discard"
              onClick={onDiscard}
            >
              <span>🗑</span>
              Discard Walk
            </button>
            
            <button 
              className="stop-recording-dialogue__button stop-recording-dialogue__button--finish"
              onClick={onFinishWalk}
            >
              <span>✓</span>
              Finish Walk
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StopRecordingDialogue;
