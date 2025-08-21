import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Geolocation } from '@capacitor/geolocation';
import { BaseBuilder } from 'gpx-builder';
import mapboxgl from "mapbox-gl";
const { Point } = BaseBuilder.MODELS;

mapboxgl.accessToken = "pk.eyJ1IjoiY25vcHQiLCJhIjoiY21kZjVqcWE2MDhvNzJtcjFrdzVkeWZmOSJ9.6YvvBMhtSYQlWWebyg25eQ";

// Custom user location dot style
const userLocationDot = {
  width: 15,
  height: 15,
  borderRadius: '50%',
  backgroundColor: '#037bfc',
  border: '2px solid #fff',
  boxShadow: '0 0 2px rgba(0,0,0,0.25)'
};

const Recorder = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedDate = location.state?.selectedDate;
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const watchIdRef = useRef(null);
  const pointsRef = useRef([]);
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const geolocateControlRef = useRef(null);

  const requestLocationPermission = async () => {
    try {
      const permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        await Geolocation.requestPermissions();
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/cnopt/cmekhylis001z01sn9v8a5axs",
      zoom: 16,
      antialias: true,
      dragPan: true,
      dragRotate: true
    });

    // Add geolocate control
    geolocateControlRef.current = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true,
      showAccuracyCircle: true
    });

    mapRef.current.addControl(geolocateControlRef.current);

    mapRef.current.on("load", () => {
      mapRef.current.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxZoom: 14
      });
      mapRef.current.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
      
      // Trigger geolocation immediately after map loads
      geolocateControlRef.current.trigger();
    });

    // Listen for the geolocate events
    geolocateControlRef.current.on('geolocate', (position) => {
      const { latitude, longitude, altitude } = position.coords;
      setCurrentLocation({ latitude, longitude, altitude });
      
      if (isRecording && !isPaused) {
        const point = new Point(longitude, latitude, {
          ele: altitude,
          time: new Date()
        });
        pointsRef.current.push(point);
        console.log(`Recording point: ${latitude}, ${longitude}`);
      }
    });

    return () => {
      if (mapRef.current) mapRef.current.remove();
    };
  }, []);

  // Handle location permissions and tracking
  useEffect(() => {
    requestLocationPermission();
    return () => {
      if (watchIdRef.current) {
        Geolocation.clearWatch({ id: watchIdRef.current });
      }
    };
  }, []);

  const startRecording = () => {
    setIsRecording(true);
    setIsPaused(false);
  };

  const pauseRecording = () => {
    setIsPaused(true);
  };

  const resumeRecording = () => {
    setIsPaused(false);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    // Here we would save the GPX file, but we'll implement that later
  };



  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', backgroundColor: '#fff' }}>
        <h3>Record Walk for {selectedDate}</h3>
      </div>
      
      <div ref={mapContainer} style={{ flex: 1 }} />
      
      <div style={{ 
        padding: '20px',
        backgroundColor: '#fff',
        display: 'flex',
        gap: '10px',
        justifyContent: 'center'
      }}>
        {!isRecording ? (
          <button 
            onClick={startRecording}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Start Recording
          </button>
        ) : (
          <>
            {isPaused ? (
              <button 
                onClick={resumeRecording}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#037bfc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Resume
              </button>
            ) : (
              <button 
                onClick={pauseRecording}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Pause
              </button>
            )}
            <button 
              onClick={stopRecording}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Stop
            </button>
          </>
        )}
        <button 
          onClick={() => navigate(-1)}
          style={{
            padding: '10px 20px',
            backgroundColor: 'transparent',
            color: '#666',
            border: '1px solid #666',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default Recorder;
