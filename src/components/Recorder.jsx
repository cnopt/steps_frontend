import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Geolocation } from '@capacitor/geolocation';
import { BaseBuilder } from 'gpx-builder';
import mapboxgl from "mapbox-gl";
import 'mapbox-gl/dist/mapbox-gl.css';
import '../styles/Recorder.css';
const { Point } = BaseBuilder.MODELS;

mapboxgl.accessToken = "pk.eyJ1IjoiY25vcHQiLCJhIjoiY21kZjVqcWE2MDhvNzJtcjFrdzVkeWZmOSJ9.6YvvBMhtSYQlWWebyg25eQ";

function Recorder() {
  const location = useLocation();
  const navigate = useNavigate();

  const selectedDate = location.state?.selectedDate || new Date().toLocaleDateString();

  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const geolocateControlRef = useRef(null);
  const watchIdRef = useRef(null);
  const pathCoordsRef = useRef([]);

  const PATH_SOURCE_ID = 'recordedPath';
  const PATH_LAYER_ID = 'recordedPathLine';

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [initialCoords, setInitialCoords] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const ensurePathSourceAndLayer = () => {
    const map = mapRef.current;
    if (!map) return;
    const add = () => {
      if (!map.getSource(PATH_SOURCE_ID)) {
        map.addSource(PATH_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: pathCoordsRef.current },
            properties: {}
          }
        });
      }
      if (!map.getLayer(PATH_LAYER_ID)) {
        map.addLayer({
          id: PATH_LAYER_ID,
          type: 'line',
          source: PATH_SOURCE_ID,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#2da1ff',
            'line-width': 4,
            'line-opacity': 0.9
          }
        });
      }
    };
    if (map.isStyleLoaded && map.isStyleLoaded()) {
      add();
    } else {
      map.once('load', add);
    }
  };

  const updatePathSourceData = () => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource(PATH_SOURCE_ID);
    if (src && src.setData) {
      src.setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: pathCoordsRef.current },
        properties: {}
      });
    }
  };

  const pushCoordinateIfNew = (lng, lat) => {
    const coords = pathCoordsRef.current;
    const last = coords[coords.length - 1];
    if (!last || last[0] !== lng || last[1] !== lat) {
      coords.push([lng, lat]);
    }
  };

  const startPositionWatcher = async () => {
    if (watchIdRef.current != null) return;
    ensurePathSourceAndLayer();
    // Seed with current map center (which should be at/near user location)
    if (mapRef.current) {
      const c = mapRef.current.getCenter();
      pushCoordinateIfNew(c.lng, c.lat);
      updatePathSourceData();
    }
    watchIdRef.current = await Geolocation.watchPosition(
      { enableHighAccuracy: true, distanceFilter: 1 },
      (position, err) => {
        if (err) {
          console.error('[watchPosition] error', err);
          return;
        }
        if (!position || isPaused) return;
        const { longitude, latitude } = position.coords || {};
        if (typeof longitude !== 'number' || typeof latitude !== 'number') return;
        pushCoordinateIfNew(longitude, latitude);
        updatePathSourceData();
      }
    );
  };

  const stopPositionWatcher = async () => {
    if (watchIdRef.current != null) {
      try {
        await Geolocation.clearWatch({ id: watchIdRef.current });
      } catch (e) {
        console.error('clearWatch error', e);
      }
      watchIdRef.current = null;
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    setIsPaused(false);
    pathCoordsRef.current = [];
    startPositionWatcher();
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
    stopPositionWatcher();
  };

  const watchPosition = () => {
    try {
      const geolocate = geolocateControlRef.current;
      if (geolocate && typeof geolocate.trigger === 'function') {
        geolocate.trigger();
      }
    } catch (e) {
      console.error('Failed to re-enable tracking mode:', e);
    }
  };


  // Ask for location permission up front (Capacitor Android)
  useEffect(() => {
    const ensurePermissions = async () => {
      try {
        const status = await Geolocation.checkPermissions();
        if (status.location !== 'granted') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted') {
            return;
          }
        }
        setPermissionGranted(true);
      } catch (e) {
        console.error('Geolocation permission error:', e);
      }
    };
    ensurePermissions();
  }, []);

  // Get initial position once permission is granted
  useEffect(() => {
    if (!permissionGranted) return;
    let cancelled = false;
    (async () => {
      try {
        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        if (cancelled) return;
        setInitialCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
      } catch (e) {
        console.error('Failed to get current position:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [permissionGranted]);

  // Initialize Mapbox map centered on current location and add GeolocateControl
  useEffect(() => {
    if (!mapContainer.current || !initialCoords) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [initialCoords.lng, initialCoords.lat],
      zoom: 16,
      attributionControl: false
    });

    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
      // Ensure no animated transition when the control updates the camera
      fitBoundsOptions: { maxZoom: 16, duration: 0 }
    });
    geolocateControlRef.current = geolocate;
    mapRef.current.addControl(geolocate);

    // Let GeolocateControl manage camera per its active/passive states; just log updates
    geolocate.on('geolocate', (e) => {
      console.log('[GeolocateControl] geolocate', e.coords);
    });

    geolocate.on('trackuserlocationstart', () => {
      console.log('[GeolocateControl] track user location started');
    });

    geolocate.on('trackuserlocationend', () => {
      console.log('[GeolocateControl] track user location ended');
    });

    geolocate.on('error', (err) => {
      console.error('[GeolocateControl] error', err);
    });

    // immediate location fetch to see the blue dot
    if (mapRef.current && typeof mapRef.current.once === 'function') {
      mapRef.current.once('load', () => geolocate.trigger());
    } else {
      geolocate.trigger();
    }

    return () => {
      mapRef.current && mapRef.current.remove();
    };
  }, [initialCoords]);

  // cleanup watcher on unmount
  useEffect(() => {
    return () => {
      stopPositionWatcher();
    };
  }, []);

  return (
    <div className="recorder">
      <div ref={mapContainer} className="recorder__map" />
      <div className="recorder__controls">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="recorder__button recorder__button--start"
          >
            Start Recording
          </button>
        ) : (
          <>
            {isPaused ? (
              <button
                onClick={resumeRecording}
                className="recorder__button recorder__button--resume"
              >
                Resume
              </button>
            ) : (
              <button
                onClick={pauseRecording}
                className="recorder__button recorder__button--pause"
              >
                Pause
              </button>
            )}
            <button
              onClick={stopRecording}
              className="recorder__button recorder__button--stop"
            >
              Stop
            </button>
          </>
        )}
        <button
          onClick={() => navigate(-1)}
          className="recorder__button recorder__button--cancel"
        >
          Cancel
        </button>

        <button
          onClick={watchPosition}
          className="recorder__button recorder__button--cancel"
        >
          Track
        </button>
      </div>
    </div>
  );
}

export default Recorder;
