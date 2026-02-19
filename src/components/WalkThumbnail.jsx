import React, { useState, useEffect } from 'react';
import { Encoding } from '@capacitor/filesystem';
import { generateWalkThumbnail } from '../helpers/thumbnailGenerator';
import {
  ensureWalksDirectory,
  writeFileToWalkDirectories,
  readFileFromWalkDirectories
} from '../helpers/walkStorage';

const WalkThumbnail = ({ walkFileName, className = '', style = {}, alt = 'Walk thumbnail' }) => {
  const [thumbnailSrc, setThumbnailSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const loadThumbnail = async () => {
    try {
      const thumbnailFileName = walkFileName.replace('.gpx', '.png');
      const result = await readFileFromWalkDirectories({
        path: `walks/thumbnails/${thumbnailFileName}`,
        encoding: Encoding.Base64
      });
      
      setThumbnailSrc(`data:image/png;base64,${result.data}`);
      setLoading(false);
      setError(false);
    } catch (err) {
      console.warn('Could not load thumbnail for', walkFileName, err);
      setError(true);
      setLoading(false);
    }
  };

  const parseGPXData = (gpxText) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxText, 'text/xml');
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Invalid GPX file format');
    }
    
    const segments = [];
    const trksegs = xmlDoc.querySelectorAll('trkseg');
    
    trksegs.forEach(trkseg => {
      const points = [];
      const trkpts = trkseg.querySelectorAll('trkpt');
      
      trkpts.forEach(trkpt => {
        const lat = parseFloat(trkpt.getAttribute('lat'));
        const lon = parseFloat(trkpt.getAttribute('lon'));
        
        if (isNaN(lat) || isNaN(lon)) return;
        
        const point = { lat, lon };
        
        // Get elevation if present
        const eleElement = trkpt.querySelector('ele');
        if (eleElement && eleElement.textContent) {
          const ele = parseFloat(eleElement.textContent);
          if (!isNaN(ele)) {
            point.ele = ele;
          }
        }
        
        // Get time if present
        const timeElement = trkpt.querySelector('time');
        if (timeElement && timeElement.textContent) {
          point.time = timeElement.textContent;
        }
        
        points.push(point);
      });
      
      if (points.length > 0) {
        segments.push(points);
      }
    });
    
    return segments;
  };

  const regenerateThumbnail = async () => {
    try {
      setRegenerating(true);
      setError(false);
      
      // Read the GPX file
      const gpxResult = await readFileFromWalkDirectories({
        path: `walks/${walkFileName}`,
        encoding: Encoding.UTF8
      });
      
      // Parse GPX data using simple DOM parsing
      const gpxSegments = parseGPXData(gpxResult.data);
      
      if (gpxSegments.length === 0) {
        throw new Error('No tracks found in GPX file');
      }
      
      // Generate thumbnail
      const thumbnail = await generateWalkThumbnail(gpxSegments, walkFileName);
      
      // Ensure thumbnails directory exists
      try {
        await ensureWalksDirectory('walks/thumbnails');
      } catch {
        // If directory prep fails, write call below will report error.
      }
      
      // Save thumbnail to filesystem
      await writeFileToWalkDirectories({
        path: `walks/thumbnails/${thumbnail.fileName}`,
        data: thumbnail.imageData.split(',')[1], // Remove data:image/png;base64, prefix
        encoding: Encoding.Base64
      });
      
      // Update the thumbnail display
      setThumbnailSrc(thumbnail.imageData);
      setRegenerating(false);
      setError(false);
      
    } catch (err) {
      console.error('Failed to regenerate thumbnail:', err);
      setRegenerating(false);
      setError(true);
    }
  };

  useEffect(() => {
    if (walkFileName) {
      loadThumbnail();
    }
  }, [walkFileName, loadThumbnail]);

  if (loading) {
    return (
      <div 
        className={`walk-thumbnail-placeholder ${className}`}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          ...style 
        }}
      >
      </div>
    );
  }

  if (error || !thumbnailSrc) {
    const handleRetry = (e) => {
      e.stopPropagation();
      if (!regenerating) {
        regenerateThumbnail();
      }
    };

    return (
      <button
        type="button"
        className={`walk-thumbnail-placeholder walk-thumbnail-retry ${className}`}
        onClick={handleRetry}
        aria-label={regenerating ? 'Generating thumbnail' : 'Retry thumbnail generation'}
        title={regenerating ? 'Generating thumbnail' : 'Retry thumbnail generation'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          cursor: regenerating ? 'default' : 'pointer',
          ...style
        }}
      >
        <span
          aria-hidden="true"
          style={{
            fontSize: '22px',
            lineHeight: 1,
            color: '#a85200',
            transform: regenerating ? 'rotate(0deg)' : 'none',
            animation: regenerating ? 'spin 1s linear infinite' : 'none'
          }}
        >
          ↻
        </span>
      </button>
    );
  }

  return (
    <img
      src={thumbnailSrc}
      alt={alt}
      className={className}
      style={{
        objectFit: 'cover',
        ...style
      }}
      onError={() => setError(true)}
    />
  );
};

export default WalkThumbnail;
