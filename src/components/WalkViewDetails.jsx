import React, { useState } from 'react';
import '../styles/WalkViewDetails.css';

const StatsPanel = ({ track, points }) => {
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

  const distance = track.distance.total;

  return (
    <div className="walk-details-container">
      <div className='row'>
        <div className='column'>
          <div className="walk-stat">
            <span className="stat-label">Distance</span>
            <p className="stat-value">{(distance / 1000).toFixed(2)}<span>mi</span></p>
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

const SpotsPanel = () => {
  return (
    <div className="walk-details-container">
      <div className="row" style={{ justifyContent: 'center', marginTop: '2rem' }}>
        <p style={{ opacity: 0.6, fontFamily: 'sf' }}>No spots marked yet</p>
      </div>
    </div>
  );
};

export default function WalkViewDetails({ gpxData }) {
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
        {activePanel === 'stats' && <StatsPanel track={track} points={points} />}
        {activePanel === 'photos' && <PhotosPanel />}
        {activePanel === 'spots' && <SpotsPanel />}
      </div>
    </>
  );
}