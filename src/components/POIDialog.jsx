import React from 'react';
import '../styles/POIDialog.css';

const POIDialog = ({ isOpen, onClose, onSelectPOI }) => {
  if (!isOpen) return null;

  const handlePOISelect = (type) => {
    onSelectPOI(type);
    onClose();
  };

  return (
    <div className="poi-dialog-overlay" onClick={onClose}>
      <div className="poi-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="poi-dialog__header">
          <h3>Record Point of Interest</h3>
          <button className="poi-dialog__close" onClick={onClose}>×</button>
        </div>
        <div className="poi-dialog__content">
          <p>What did you find?</p>
          <div className="poi-options">
            <button 
              className="poi-option poi-option--plant"
              onClick={() => handlePOISelect('plant')}
            >
              <span className="poi-icon">🌿</span>
            </button>
            <button 
              className="poi-option poi-option--bug"
              onClick={() => handlePOISelect('bug')}
            >
              <span className="poi-icon">🐛</span>
            </button>
            <button 
              className="poi-option poi-option--view"
              onClick={() => handlePOISelect('view')}
            >
              <span className="poi-icon">🏞️</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POIDialog;
