import React from 'react';
import '../styles/WalkViewDetails.css';

export default function WalkViewDetails({ gpxData }) {
  if (!gpxData || !gpxData.tracks || gpxData.tracks.length === 0) {
    return null;
  }

  const track = gpxData.tracks[0];
  const points = track.points;

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

  // Get distance from GPXParser (it's already calculated)
  const distance = track.distance.total;

  return (
    <div className="walk-details-container">
      <div className="walk-stat">
        <span className="stat-value">{(distance / 1000).toFixed(2)}</span>
        <span className="stat-label">kilometers</span>
      </div>
      <div className="walk-stat">
        <span className="stat-value">
          {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
        </span>
        <span className="stat-label">duration</span>
      </div>
      <div className="walk-stat">
        <span className="stat-value">{Math.round(totalAscent)}</span>
        <span className="stat-label">meters climbed</span>
      </div>
      <div className="walk-stat">
        <span className="stat-value">{Math.round(totalDescent)}</span>
        <span className="stat-label">meters descended</span>
      </div>
    </div>
  );
}
