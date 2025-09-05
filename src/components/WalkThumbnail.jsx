import React, { useState, useEffect } from 'react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const WalkThumbnail = ({ walkFileName, className = '', style = {}, alt = 'Walk thumbnail' }) => {
  const [thumbnailSrc, setThumbnailSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
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
      } catch (err) {
        console.warn('Could not load thumbnail for', walkFileName, err);
        setError(true);
        setLoading(false);
      }
    };

    if (walkFileName) {
      loadThumbnail();
    }
  }, [walkFileName]);

  if (loading) {
    return (
      <div 
        className={`walk-thumbnail-placeholder ${className}`}
        style={{ 
          backgroundColor: '#f0f0f0', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          ...style 
        }}
      >
        <span style={{ color: '#999', fontSize: '12px' }}>Loading...</span>
      </div>
    );
  }

  if (error || !thumbnailSrc) {
    return (
      <div 
        className={`walk-thumbnail-placeholder ${className}`}
        style={{ 
          backgroundColor: '#e0e0e0', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          ...style 
        }}
      >
        <span style={{ color: '#999', fontSize: '24px' }}>🚶</span>
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
