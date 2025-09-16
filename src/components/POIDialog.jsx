import React from 'react';
import '../styles/POIDialog.css';

const POIDialog = ({ isOpen, onClose, onSelectPOI, pendingPOICoords }) => {
  const [selectedType, setSelectedType] = React.useState(null);
  const [poiName, setPoiName] = React.useState('');
  const [poiDescription, setPoiDescription] = React.useState('');

  if (!isOpen) return null;

  const formatTime = (timestamp) => {
    if (!timestamp) return '--';
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const formatElevation = (elevation) => {
    if (typeof elevation !== 'number') return '--';
    return `${Math.round(elevation)}m`;
  };

  const handlePOISelect = (type) => {
    setSelectedType(type);
  };

  const handleSavePOI = () => {
    if (!selectedType) return;
    
    const poiData = {
      type: selectedType,
      name: poiName.trim() || getDefaultName(selectedType),
      description: poiDescription.trim() // Use empty string if no description entered
    };
    
    onSelectPOI(poiData);
    
    // Reset form
    setSelectedType(null);
    setPoiName('');
    setPoiDescription('');
    onClose();
  };

  const handleCancel = () => {
    setSelectedType(null);
    setPoiName('');
    setPoiDescription('');
    onClose();
  };

  const getDefaultName = (type) => {
    const names = {
      plant: 'Interesting Plant',
      bug: 'Bug Observation', 
      view: 'Scenic View',
      water: 'Water Feature',
      animal: 'Animal Sighting',
      landmark: 'Landmark'
    };
    return names[type] || 'Point of Interest';
  };

  const getDefaultDescription = (type) => {
    const descriptions = {
      plant: 'Found an interesting plant species during the walk',
      bug: 'Observed interesting insect or small creature',
      view: 'Beautiful view worth remembering',
      water: 'Water feature or source encountered',
      animal: 'Wildlife spotted during the walk',
      landmark: 'Notable landmark or structure'
    };
    return descriptions[type] || 'Interesting location during walk';
  };

  return (
    <div className="poi-dialog-overlay" onClick={onClose}>
      <div className="poi-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="poi-dialog__header">
          <h3>Add Marker</h3>
          {pendingPOICoords && (
            <>
              <span className="poi-info-value">@</span>
              <span className="poi-info-value">{formatTime(pendingPOICoords.timestamp)}</span>
              <span className="poi-info-value">{formatElevation(pendingPOICoords.ele)}</span>
            </>
          )}
          {/* <button className="poi-dialog__close" onClick={onClose}>×</button> */}
        </div>
        <div className="poi-dialog__content">
          {pendingPOICoords && (
            <>
              <div className="poi-info-item">
              </div>
              <div className="poi-info-item">
              </div>
            </>
          )}
          <div className="poi-options-container">
            <div className="poi-options">
              <button 
                className={`poi-option poi-option--plant ${selectedType === 'plant' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('plant')}
              >
                <span className="poi-icon">¥</span>
              </button>
              <button 
                className={`poi-option poi-option--bug ${selectedType === 'bug' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('bug')}
              >
                <span className="poi-icon">O</span>
              </button>
              <button 
                className={`poi-option poi-option--view ${selectedType === 'view' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('view')}
              >
                <span className="poi-icon">@</span>
              </button>
              <button 
                className={`poi-option poi-option--water ${selectedType === 'water' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('water')}
              >
                <span className="poi-icon">#</span>
              </button>
              <button 
                className={`poi-option poi-option--animal ${selectedType === 'animal' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('animal')}
              >
                <span className="poi-icon">:::</span>
              </button>
              <button 
                className={`poi-option poi-option--landmark ${selectedType === 'landmark' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('landmark')}
              >
                <span className="poi-icon">/</span>
              </button>
              <button 
                className={`poi-option poi-option--landmark ${selectedType === 'landmark' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('landmark')}
              >
                <span className="poi-icon">+</span>
              </button>
              <button 
                className={`poi-option poi-option--landmark ${selectedType === 'landmark' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('landmark')}
              >
                <span className="poi-icon">$</span>
              </button>
              <button 
                className={`poi-option poi-option--landmark ${selectedType === 'landmark' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('landmark')}
              >
                <span className="poi-icon">&</span>
              </button>
            </div>
          </div>
          
          <div className="poi-form">
            <div className="poi-form-field">
              {/* <label htmlFor="poi-name">Name (optional):</label> */}
              <input
                id="poi-name"
                type="text"
                value={poiName}
                onChange={(e) => setPoiName(e.target.value)}
                placeholder="Name"
                className="poi-input"
              />
            </div>
            
            <div className="poi-form-field">
              <textarea
                id="poi-description"
                value={poiDescription}
                onChange={(e) => setPoiDescription(e.target.value)}
                placeholder="Description (optional)"
                className="poi-textarea"
                rows="2"
              />
            </div>
            
            <div className="poi-form-actions">
              <button 
                className="poi-action-button poi-action-button--cancel"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button 
                className="poi-action-button poi-action-button--save"
                onClick={handleSavePOI}
                disabled={!selectedType}
              >
                Save Marker
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POIDialog;
