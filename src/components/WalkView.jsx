import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import GPXParser from "gpxparser";
import { useLocation, useNavigate } from 'react-router-dom';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import '../styles/WalkView.css';
import XPBar from './XPBar';
import LoadingSpinner from './LoadingSpinner';

mapboxgl.accessToken = "pk.eyJ1IjoiY25vcHQiLCJhIjoiY21kZjVqcWE2MDhvNzJtcjFrdzVkeWZmOSJ9.6YvvBMhtSYQlWWebyg25eQ";

export default function WalkView() {
  const location = useLocation();
  const navigate = useNavigate();
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gpxData, setGpxData] = useState(null);
  
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
        const gpx = new GPXParser();
        gpx.parse(gpxText);
        
        if (gpx.tracks.length === 0) {
          throw new Error("No tracks found in GPX file");
        }
        
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
        style: "mapbox://styles/cnopt/cmej4wg2l00od01s68j5r2h12/draft",
        center: bounds.getCenter().toArray(),
        pitch: -90,
        bearing: -90,
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
        
        mapRef.current.addLayer({
          id: "gpxRouteLine",
          type: "line",
          source: "gpxRoute",
          paint: {
            "line-color": "#037bfc",
            "line-width": 4,
            "line-opacity": 0.9,
          },
        });
        
        mapRef.current.fitBounds(bounds, { padding: 30 });
        setMapReady(true);
      });
    } catch (err) {
      console.error("Error initializing map:", err);
      setError(err.message);
    }

    return () => mapRef.current && mapRef.current.remove();
  }, [gpxData, loading, error]);
  
  if (loading) {
    return (
      <>
        <XPBar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <LoadingSpinner />
        </div>
      </>
    );
  }

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
      <XPBar />
      <div ref={mapContainer} className="map-container" />
    </>
  );
}