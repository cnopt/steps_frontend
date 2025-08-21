import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import GPXParser from "gpxparser";
import { XMLParser } from "fast-xml-parser";
import { useLocation, useNavigate } from 'react-router-dom';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import '../styles/WalkView.css';
import XPBar from './XPBar';
import LoadingSpinner from './LoadingSpinner';

mapboxgl.accessToken = "pk.eyJ1IjoiY25vcHQiLCJhIjoiY21kZjVqcWE2MDhvNzJtcjFrdzVkeWZmOSJ9.6YvvBMhtSYQlWWebyg25eQ";

// Arrow configuration options
const ARROW_CONFIG = {
  spacing: 50, // Show an arrow every X pixels along the path
  size: 1, // Size multiplier for the arrows
  color: "#fff", // Arrow color matching the path
  opacity: 0.7, // Arrow opacity
};

export default function WalkView() {
  const location = useLocation();
  const navigate = useNavigate();
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gpxData, setGpxData] = useState(null);
  const [hasFadedIn, setHasFadedIn] = useState(false);
  const [showSpinner, setShowSpinner] = useState(true);
  const fadeTimeoutRef = useRef(null);
  
  // First useEffect to load and parse GPX data
  useEffect(() => {
    const loadGPXData = async () => {
      try {
        if (!location.state?.walkFile) {
          throw new Error('No walk file specified');
        }

        const result = await Filesystem.readFile({
          path: `walks/${location.state.walkFile}`,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });

        const gpxText = result.data;
        
        // Parse with GPXParser
        const gpx = new GPXParser();
        gpx.parse(gpxText);
        
        if (gpx.tracks.length === 0) {
          throw new Error("No tracks found in GPX file");
        }

        // log GPX data structure from GPXParser
        console.log('GPXParser result:', {
          metadata: gpx.metadata,
          tracks: gpx.tracks.map(track => ({
            name: track.name,
            distance: track.distance.total,
            elevation: track.elevation,
            slopes: track.slopes,
            points: track.points,
            points_length: track.points.length
          }))
        });

        // Parse with fast-xml-parser
        const xmlParser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: "@_",
          parseAttributeValue: true
        });
        const xmlResult = xmlParser.parse(gpxText);
        
        // Log the raw XML parsing result
        console.log('fast-xml-parser result:', xmlResult);

        console.log(xmlResult.gpx.name);
        console.log(xmlResult.gpx.extensions['os:distance']);

        
        setGpxData(gpx);
        setLoading(false);
      } catch (err) {
        console.error("Error loading or parsing GPX file:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadGPXData();
  }, [location.state]);

  // Second useEffect to initialize map after GPX data is loaded and container is ready
  useEffect(() => {
    if (!gpxData || !mapContainer.current || loading || error) return;

    try {
      const points = gpxData.tracks[0].points.map((pt) => [pt.lon, pt.lat]);
      const pointsWithElevation = gpxData.tracks[0].points.map((pt) => [pt.lon, pt.lat, pt.ele || 0]);
      
      const bounds = new mapboxgl.LngLatBounds();
      points.forEach((p) => bounds.extend(p));
      
      mapRef.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/cnopt/cmekhylis001z01sn9v8a5axs",
        center: bounds.getCenter().toArray(),
        // pitch: -90,
        // bearing: -90,
        zoom: 14,
        antialias: true,
        dragPan: true,
        dragRotate: true
      });
      
      mapRef.current.on("style.load", () => {
        mapRef.current.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxZoom: 14
        });
        mapRef.current.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
        
        const smoothPath = function(coordinates, interval = 10) {
          const smoothed = [];
          
          for (let i = 0; i < coordinates.length; i += interval) {
            const windowStart = Math.max(0, i - interval);
            const windowEnd = Math.min(coordinates.length, i + interval);
            const window = coordinates.slice(windowStart, windowEnd);
            
            let avgLng = 0, avgLat = 0, avgEle = 0;
            window.forEach(coord => {
              avgLng += coord[0];
              avgLat += coord[1];
              avgEle += coord[2] || 0;
            });
            
            avgLng /= window.length;
            avgLat /= window.length;
            avgEle /= window.length;
            
            smoothed.push([avgLng, avgLat, avgEle]);
          }
          
          return smoothed;
        };
        
        const smoothCoordinates = smoothPath(pointsWithElevation, 10);
        const smoothPoints = smoothCoordinates.map(coord => [coord[0], coord[1]]);

        // We no longer need per-point arrows; we'll draw arrows along the line geometry
        
        mapRef.current.addSource("gpxRoute", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: smoothPoints,
            },
          },
        });
        
        // Glow effect: add blurred, wider lines underneath the main line
        mapRef.current.addLayer({
          id: "gpxRouteGlowOuter",
          type: "line",
          source: "gpxRoute",
          paint: {
            "line-color": "#037bfc",
            "line-width": 40,
            "line-opacity": 0.35,
            "line-blur": 28
          }
        });

        mapRef.current.addLayer({
          id: "gpxRouteGlowInner",
          type: "line",
          source: "gpxRoute",
          paint: {
            "line-color": "#2da1ff",
            "line-width": 22,
            "line-opacity": 0.6,
            "line-blur": 12
          }
        });

        // Intense core glow to enhance prominence
        mapRef.current.addLayer({
          id: "gpxRouteCoreGlow",
          type: "line",
          source: "gpxRoute",
          paint: {
            "line-color": "#ffffff",
            "line-width": 8,
            "line-opacity": 0.45,
            "line-blur": 4
          }
        });

        // Main route line on top of the glows
        mapRef.current.addLayer({
          id: "gpxRouteLine",
          type: "line",
          source: "gpxRoute",
          paint: {
            "line-color": "#fff",
            "line-width": 1.5,
            "line-opacity": 0.3
          }
        });

        // Add arrows along the line itself using a text glyph. This auto-orients to line direction.
        mapRef.current.addLayer({
          id: "gpxRouteArrows",
          type: "symbol",
          source: "gpxRoute",
          layout: {
            "symbol-placement": "line",
            "symbol-spacing": ARROW_CONFIG.spacing,
            "text-field": "➤",
            "text-size": 12 * ARROW_CONFIG.size,
            "text-rotation-alignment": "map",
            "text-keep-upright": false,
            "text-allow-overlap": true
          },
          paint: {
            "text-color": ARROW_CONFIG.color,
            "text-opacity": ARROW_CONFIG.opacity,
            "text-halo-color": "rgba(0,0,0,0.25)",
            "text-halo-width": 1
          }
        });
        
        mapRef.current.fitBounds(bounds, { padding: 50 });
        //mapRef.current.easeTo({ pitch: 20, duration: 0 });
        setMapReady(true);

        // Fade in only when the map is fully idle (no ongoing rendering or tile requests)
        const handleIdle = () => {
          // Start fading overlay; keep spinner visible until fade completes
          setHasFadedIn(true);
          if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
          }
          fadeTimeoutRef.current = setTimeout(() => {
            setShowSpinner(false);
          }, 200); // matches CSS transition + small buffer
        };

        if (mapRef.current && typeof mapRef.current.once === 'function') {
          mapRef.current.once('idle', handleIdle);
        } else if (mapRef.current) {
          // Fallback: listen then remove listener
          const onIdle = () => {
            handleIdle();
            mapRef.current && mapRef.current.off('idle', onIdle);
          };
          mapRef.current.on('idle', onIdle);
        }
      });
    } catch (err) {
      console.error("Error initializing map:", err);
      setError(err.message);
    }

    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
      mapRef.current && mapRef.current.remove();
    };
  }, [gpxData, loading, error]);
  
  // Keep rendering the map container while loading, and place the spinner above it.

  if (error) {
    return (
      <>
        <XPBar />
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '80vh',
          gap: '20px'
        }}>
          <p style={{ color: '#f44336' }}>Error: {error}</p>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#037bfc',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '0.9em',
              fontFamily: 'sf'
            }}
          >
            Go Back
          </button>
        </div>
      </>
    );
  }
  
  return (
    <>
      <div ref={mapContainer} className="map-container">
        {showSpinner && (
          <div className="map-loading-spinner">
            <LoadingSpinner />
          </div>
        )}
        <div className={`map-fade-overlay ${hasFadedIn ? 'is-hidden' : ''}`} />
      </div>
    </>
  );
}