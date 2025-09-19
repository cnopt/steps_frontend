import React, { useState } from 'react';
import '../styles/WalkViewDetails.css';

const StatsPanel = ({ track, points, walkMetadata }) => {
  // Calculate duration
  const startTime = new Date(points[0].time);
  const endTime = new Date(points[points.length - 1].time);
  const durationMs = endTime - startTime;
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

  // Calculate elevation changes
  let totalAscent = 0;
  let totalDescent = 0;
  let minElevation = points[0].ele;
  let maxElevation = points[0].ele;

  for (let i = 1; i < points.length; i++) {
    const elevDiff = points[i].ele - points[i - 1].ele;
    if (elevDiff > 0) totalAscent += elevDiff;
    if (elevDiff < 0) totalDescent += Math.abs(elevDiff);
    
    minElevation = Math.min(minElevation, points[i].ele);
    maxElevation = Math.max(maxElevation, points[i].ele);
  }

  // Use stored distance from walk metadata (already in miles) if available,
  // otherwise convert from GPX parser distance (meters to miles)
  const distance = walkMetadata?.total_distance !== undefined 
    ? walkMetadata.total_distance 
    : (track.distance.total / 1609.34); // Convert meters to miles

  return (
    <div className="walk-details-container">
      <div className='row'>
        <div className='column'>
          <div className="walk-stat">
            <span className="stat-label">Distance</span>
            <p className="stat-value">{distance.toFixed(1)}<span>mi</span></p>
          </div>
        </div>
        <div className='column'>
          <div className="walk-stat">
            <span className="stat-label">Duration</span>
            <p className="stat-value">
              {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
            </p>
          </div>
        </div>
      </div>
      <div className='row'>
        <div className='column'>
          <div className="walk-stat">
            <span className="stat-label">Climbed</span>
            <p className="stat-value">{Math.round(totalAscent)}<span>m</span></p>
          </div>
        </div>
        <div className='column'>
          <div className="walk-stat">
            <span className="stat-label">Descended</span>
            <p className="stat-value">{Math.round(totalDescent)}<span>m</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

const PhotosPanel = () => {
  return (
    <div className="walk-details-container">
      <div className="row" style={{ justifyContent: 'center', marginTop: '2rem' }}>
        <p style={{ opacity: 0.6, fontFamily: 'sf' }}>No photos added yet</p>
      </div>
    </div>
  );
};

const SpotsPanel = ({ waypoints }) => {
  if (!waypoints || waypoints.length === 0) {
    return (
      <div className="walk-details-container">
        <div className="row" style={{ justifyContent: 'center', marginTop: '2rem' }}>
          <p style={{ opacity: 0.6, fontFamily: 'sf' }}>No spots marked yet</p>
        </div>
      </div>
    );
  }

  const getPoiIcon = (type) => {
    const iconMap = {
      bird: '🦅',
      wildlife: '🦌',
      insect: '🦋',
      flower: '🌸',
      tree: '🌳',
      view: '🏔️',
      water: '🏞️',
      landmark: '🏛️',
      photo: '📸',
      picnic: '🧺',
      rest: '🪑',
      trail: '🥾',
      memory: '💭',
      lost: '❗',
      building: '🏠',
      // Legacy types from old system
      plant: '🌿',
      bug: '🐛'
    };
    return iconMap[type] || '📍';
  };

  const getDisplayName = (waypoint) => {
    // Use comment (which contains the POI name) if available, otherwise fall back to type-based label
    if (waypoint.comment && waypoint.comment.trim()) {
      return waypoint.comment.trim();
    }
    
    // Fallback to type-based labels for older waypoints
    const typeLabels = {
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
      building: 'Interesting Building',
      // Legacy types
      plant: 'Plant',
      bug: 'Bug'
    };
    return typeLabels[waypoint.type] || 'Point of Interest';
  };

  return (
    <div className="walk-details-container">
      <div className="spots-list">
        {waypoints.map((waypoint, index) => (
          <div key={index} className="spot-item">
            <div className="spot-icon">
              <span>{getPoiIcon(waypoint.type)}</span>
            </div>
            <div className="spot-details">
              <div className="spot-title">{getDisplayName(waypoint)}</div>
              {waypoint.description && waypoint.description.trim() && (
                <div className="spot-description">{waypoint.description.trim()}</div>
              )}
              {waypoint.time && (
                <div className="spot-time">
                  {new Date(waypoint.time).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              )}
              <div className="spot-location">
                {waypoint.lat.toFixed(6)}, {waypoint.lng.toFixed(6)}
                {waypoint.ele && (
                  <span className="spot-elevation"> • {Math.round(waypoint.ele)}m</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function WalkViewDetails({ gpxData, walkMetadata, waypoints }) {
  const [activePanel, setActivePanel] = useState('stats');

  if (!gpxData || !gpxData.tracks || gpxData.tracks.length === 0) {
    return null;
  }

  const track = gpxData.tracks[0];
  const points = track.points;

  return (
    <>
      <div className='walk-bottom-panel'>
        <div className='bottom-panel-slider'>
          <p 
            className={`panel-item stats ${activePanel === 'stats' ? 'active' : ''}`}
            onClick={() => setActivePanel('stats')}
          >
            <span>{activePanel === 'stats' ? '󰋼' : '󰋽'}</span>
          </p>
          <p 
            className={`panel-item photos ${activePanel === 'photos' ? 'active' : ''}`}
            onClick={() => setActivePanel('photos')}
          >
            <span>{activePanel === 'photos' ? '󰄀' : '󰵝'}</span>
          </p>
          <p 
            className={`panel-item spots ${activePanel === 'spots' ? 'active' : ''}`}
            onClick={() => setActivePanel('spots')}
          >
            <span>{activePanel === 'spots' ? '󰍎' : '󰟙'}</span>
          </p>
        </div>
        {activePanel === 'stats' && <StatsPanel track={track} points={points} walkMetadata={walkMetadata} />}
        {activePanel === 'photos' && <PhotosPanel />}
        {activePanel === 'spots' && <SpotsPanel waypoints={waypoints} />}
      </div>
    </>
  );
}