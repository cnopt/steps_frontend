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
      bird: 'Bird Sighting',
      wildlife: 'Wildlife Sighting',
      insect: 'Insect Observation',
      flower: 'Beautiful Flower',
      tree: 'Notable Tree',
      view: 'Scenic View',
      water: 'Water Feature',
      landmark: 'Landmark',
      photo: 'Photo Spot',
      picnic: 'Picnic Spot',
      rest: 'Rest Stop',
      trail: 'Trail Point',
      memory: 'Special Memory',
      lost: 'Lost Item',
      building: 'Interesting Building'
    };
    return names[type] || 'Point of Interest';
  };

  const getDefaultDescription = (type) => {
    const descriptions = {
      bird: 'Spotted an interesting bird during the walk',
      wildlife: 'Wildlife spotted during the walk',
      insect: 'Observed interesting insect or small creature',
      flower: 'Beautiful flowers worth remembering',
      tree: 'Notable tree - large, old, or unusual species',
      view: 'Beautiful view worth remembering',
      water: 'Water feature or source encountered',
      landmark: 'Notable landmark or structure',
      photo: 'Perfect spot for photos',
      picnic: 'Great place to stop and eat',
      rest: 'Good rest stop with seating',
      trail: 'Important trail junction or feature',
      memory: 'Special moment or memory from the walk',
      lost: 'Location where item was lost',
      building: 'Interesting architecture or building'
    };
    return descriptions[type] || 'Interesting location during walk';
  };

  return (
    <div className="poi-dialog-overlay" onClick={handleCancel}>
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
            <div className={`poi-options${selectedType ? ' has-selection' : ''}`}>
              <button 
                className={`poi-option poi-option--bird ${selectedType === 'bird' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('bird')}
              >
                <span className="poi-icon">🦅</span>
              </button>
              <button 
                className={`poi-option poi-option--wildlife ${selectedType === 'wildlife' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('wildlife')}
              >
                <span className="poi-icon">🦌</span>
              </button>
              <button 
                className={`poi-option poi-option--insect ${selectedType === 'insect' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('insect')}
              >
                <span className="poi-icon">🦋</span>
              </button>
              <button 
                className={`poi-option poi-option--flower ${selectedType === 'flower' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('flower')}
              >
                <span className="poi-icon">🌸</span>
              </button>
              <button 
                className={`poi-option poi-option--tree ${selectedType === 'tree' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('tree')}
              >
                <span className="poi-icon">🌳</span>
              </button>
              <button 
                className={`poi-option poi-option--view ${selectedType === 'view' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('view')}
              >
                <span className="poi-icon">🏔️</span>
              </button>
              <button 
                className={`poi-option poi-option--water ${selectedType === 'water' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('water')}
              >
                <span className="poi-icon">🏞️</span>
              </button>
              <button 
                className={`poi-option poi-option--landmark ${selectedType === 'landmark' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('landmark')}
              >
                <span className="poi-icon">🏛️</span>
              </button>
              <button 
                className={`poi-option poi-option--photo ${selectedType === 'photo' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('photo')}
              >
                <span className="poi-icon">📸</span>
              </button>
              <button 
                className={`poi-option poi-option--picnic ${selectedType === 'picnic' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('picnic')}
              >
                <span className="poi-icon">🧺</span>
              </button>
              <button 
                className={`poi-option poi-option--rest ${selectedType === 'rest' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('rest')}
              >
                <span className="poi-icon">🪑</span>
              </button>
              <button 
                className={`poi-option poi-option--trail ${selectedType === 'trail' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('trail')}
              >
                <span className="poi-icon">🥾</span>
              </button>
              <button 
                className={`poi-option poi-option--memory ${selectedType === 'memory' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('memory')}
              >
                <span className="poi-icon">💭</span>
              </button>
              <button 
                className={`poi-option poi-option--lost ${selectedType === 'lost' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('lost')}
              >
                <span className="poi-icon">❗</span>
              </button>
              <button 
                className={`poi-option poi-option--building ${selectedType === 'building' ? 'selected' : ''}`}
                onClick={() => handlePOISelect('building')}
              >
                <span className="poi-icon">🏠</span>
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
