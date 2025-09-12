import React, { useState, useEffect } from 'react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { generateWalkThumbnail } from '../helpers/thumbnailGenerator';

const WalkThumbnail = ({ walkFileName, className = '', style = {}, alt = 'Walk thumbnail' }) => {
  const [thumbnailSrc, setThumbnailSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const loadThumbnail = async () => {
    try {
      const thumbnailFileName = walkFileName.replace('.gpx', '.png');
      const result = await Filesystem.readFile({
        path: `walks/thumbnails/${thumbnailFileName}`,
        directory: Directory.Documents,
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
      const gpxResult = await Filesystem.readFile({
        path: `walks/${walkFileName}`,
        directory: Directory.Documents,
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
        await Filesystem.readdir({
          path: 'walks/thumbnails',
          directory: Directory.Documents
        });
      } catch {
        await Filesystem.mkdir({ 
          path: 'walks/thumbnails', 
          directory: Directory.Documents, 
          recursive: true 
        });
      }
      
      // Save thumbnail to filesystem
      await Filesystem.writeFile({
        path: `walks/thumbnails/${thumbnail.fileName}`,
        data: thumbnail.imageData.split(',')[1], // Remove data:image/png;base64, prefix
        directory: Directory.Documents,
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
    return (
      <div 
        className={`walk-thumbnail-placeholder ${className}`}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '8px',
          ...style 
        }}
      >
        {regenerating ? (
          <>
            <div className="loading-spinner" style={{
              width: '24px',
              height: '24px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTop: '2px solid rgba(255,255,255,0.8)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.7)',
              textAlign: 'center'
            }}>Generating...</span>
          </>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              regenerateThumbnail();
            }}
            style={{
              color: 'rgba(255,255,255,0.8)',
              padding: '8px 12px',
              fontSize: '12px',
              transition: 'all 0.2s ease'
            }}
          >
            Generate Thumbnail
          </button>
        )}
      </div>
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
