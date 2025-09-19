import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from "mapbox-gl";
import 'mapbox-gl/dist/mapbox-gl.css';
import LoadingSpinner from './LoadingSpinner';
import { useUserSettings } from '../hooks/useUserSettings';

mapboxgl.accessToken = "pk.eyJ1IjoiY25vcHQiLCJhIjoiY21kZjVqcWE2MDhvNzJtcjFrdzVkeWZmOSJ9.6YvvBMhtSYQlWWebyg25eQ";

const MAP_STYLES = [
  { id: 'outdoors-v12', name: 'Outdoors', url: 'mapbox://styles/mapbox/outdoors-v12' },
  { id: 'satellite-streets-v12', name: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  { id: 'dark-v11', name: 'Dark', url: 'mapbox://styles/mapbox/dark-v11' },
  { id: 'light-v11', name: 'Light', url: 'mapbox://styles/mapbox/light-v11' },
];

export default function MapComponent({
  initialCoords,
  onMapReady,
  onStyleChange,
  showStyleControl = true,
  showLoadingSpinner = true,
  className = "map-container",
  children
}) {
  const { settings, updateSettings } = useUserSettings();
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  
  // Initialize currentStyle based on user's saved preference
  const getInitialStyle = () => {
    return MAP_STYLES.find(style => style.id === settings.mapLayer) || MAP_STYLES[0];
  };
  
  const [currentStyle, setCurrentStyle] = useState(getInitialStyle);
  const [showStyleOptions, setShowStyleOptions] = useState(false);
  const [hasFadedIn, setHasFadedIn] = useState(false);
  const [showSpinner, setShowSpinner] = useState(showLoadingSpinner);
  const fadeTimeoutRef = useRef(null);

  const handleStyleChange = (style) => {
    setCurrentStyle(style);
    // Save the map layer preference
    updateSettings({ mapLayer: style.id });
    
    if (mapRef.current) {
      mapRef.current.setStyle(style.url);
      if (onStyleChange) {
        onStyleChange(style, mapRef.current);
      }
    }
  };

  // Update currentStyle when settings change (e.g., from other components)
  useEffect(() => {
    const newStyle = MAP_STYLES.find(style => style.id === settings.mapLayer);
    if (newStyle && newStyle.id !== currentStyle.id) {
      setCurrentStyle(newStyle);
      if (mapRef.current) {
        mapRef.current.setStyle(newStyle.url);
        if (onStyleChange) {
          onStyleChange(newStyle, mapRef.current);
        }
      }
    }
  }, [settings.mapLayer]);

  useEffect(() => {
    if (!mapContainer.current || !initialCoords) return;

    // Create map with appropriate style based on connection status
    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: currentStyle.url,
      center: [initialCoords.lng, initialCoords.lat],
      zoom: 15,
      attributionControl: false
    });

    // Handle online/offline status changes
    const handleOnlineStatus = () => {
      if (mapRef.current) {
        mapRef.current.setStyle('mapbox://styles/mapbox/dark-v11');
      }
    };

    const handleOfflineStatus = () => {
      if (mapRef.current) {
        // Create a complete offline style
        const offlineStyle = {
          version: 8,
          sources: {},
          layers: [
            {
              id: 'background',
              type: 'background',
              paint: {
                'background-color': '#ffffff'
              }
            }
          ]
        };
        mapRef.current.setStyle(offlineStyle);
      }
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);

    // Notify parent when map is ready
    mapRef.current.on('load', () => {
      if (onMapReady) {
        onMapReady(mapRef.current);
      }

      // Fade in only when the map is fully idle
      const handleIdle = () => {
        setHasFadedIn(true);
        if (fadeTimeoutRef.current) {
          clearTimeout(fadeTimeoutRef.current);
        }
        fadeTimeoutRef.current = setTimeout(() => {
          setShowSpinner(false);
        }, 200);
      };

      mapRef.current.once('idle', handleIdle);
    });

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, [initialCoords]);

  return (
    <div ref={mapContainer} className={className}>
      {showSpinner && showLoadingSpinner && (
        <div className="map-loading-spinner">
          <LoadingSpinner />
        </div>
      )}
      <div className={`map-fade-overlay ${hasFadedIn ? 'is-hidden' : ''}`} />
      
      {showStyleControl && (
        <div className="map-style-control">
          <button 
            className="map-style-toggle"
            onClick={() => setShowStyleOptions(!showStyleOptions)}
          >
            󰌨
          </button>
          
          {showStyleOptions && (
            <div className="map-style-options">
              {MAP_STYLES.map(style => (
                <button
                  key={style.id}
                  className={`map-style-button ${style.id === currentStyle.id ? 'active' : ''}`}
                  onClick={() => {
                    handleStyleChange(style);
                    setShowStyleOptions(false);
                  }}
                >
                  {style.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {children}
    </div>
  );
}
