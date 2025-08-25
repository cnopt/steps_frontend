import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Geolocation } from '@capacitor/geolocation';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor, registerPlugin } from '@capacitor/core';
import localDataService from '../services/localDataService';
import { BaseBuilder, buildGPX } from 'gpx-builder';
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
  const latestCoordsRef = useRef(null);
  const bgWatcherIdRef = useRef(null);
  const bgPluginRef = useRef(null);
  const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');
  const LocalNotifications = registerPlugin('LocalNotifications');
  const controlNotifIdRef = useRef(1001);
  const notifListenerRef = useRef(null);
  const ENABLE_CONTROL_NOTIFICATION = false;

  // GPX building
  const gpxBuilderRef = useRef(null);
  const gpxPointsRef = useRef([]);
  const gpxIntervalRef = useRef(null);

  const PATH_SOURCE_ID = 'recordedPath';
  const PATH_LAYER_ID = 'recordedPathLine';

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [initialCoords, setInitialCoords] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const pushLog = (msg) => {
    setLogs((prev) => {
      const next = [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  };

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
     
     try {
       // Get the actual current position to start the path
       const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
       if (position && position.coords) {
         const { longitude, latitude } = position.coords;
         pushCoordinateIfNew(longitude, latitude);
         updatePathSourceData();
       }
     } catch (e) {
       console.error('Failed to get initial position for recording:', e);
       pushLog('Warning: Could not get precise starting position');
     }
     
     watchIdRef.current = await Geolocation.watchPosition(
      { enableHighAccuracy: true, distanceFilter: 1 },
      (position, err) => {
        if (err) {
          console.error('[watchPosition] error', err);
          pushLog(`watchPosition error: ${String(err && err.message || err)}`);
          return;
        }
        if (!position || isPaused) return;
        const { longitude, latitude, altitude } = position.coords || {};
        if (typeof longitude !== 'number' || typeof latitude !== 'number') return;
        pushCoordinateIfNew(longitude, latitude);
        updatePathSourceData();
        latestCoordsRef.current = { lat: latitude, lng: longitude, ele: typeof altitude === 'number' ? altitude : undefined };
      }
    );
  };

  // Resolve plugin instance only if available on native side (sync)
  const getBackgroundGeolocation = () => {
    if (bgPluginRef.current !== null) return bgPluginRef.current;
    try {
      if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable && Capacitor.isPluginAvailable('BackgroundGeolocation')) {
        bgPluginRef.current = BackgroundGeolocation;
      } else {
        bgPluginRef.current = null;
      }
    } catch {
      bgPluginRef.current = null;
    }
    return bgPluginRef.current;
  };

  const getLocalNotifications = () => {
    try {
      if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable && Capacitor.isPluginAvailable('LocalNotifications')) {
        return LocalNotifications;
      }
    } catch {}
    return null;
  };

  const ensureNotificationPermission = async () => {
    if (Capacitor.getPlatform() !== 'android') return true;
    const LN = getLocalNotifications();
    if (!LN) return true;
    try {
      const status = await LN.checkPermissions();
      if (status && status.display === 'granted') return true;
      const req = await LN.requestPermissions();
      return !!(req && req.display === 'granted');
    } catch {
      return true;
    }
  };

  const registerNotificationActions = async () => {
    const LN = getLocalNotifications();
    if (!LN) return;
    try {
      await LN.registerActionTypes({
        types: [
          {
            id: 'RECORDING_CONTROLS',
            actions: [
              { id: 'PAUSE', title: 'Pause' },
              { id: 'STOP', title: 'Stop' }
            ]
          },
          {
            id: 'PAUSED_CONTROLS',
            actions: [
              { id: 'RESUME', title: 'Resume' },
              { id: 'STOP', title: 'Stop' }
            ]
          }
        ]
      });
    } catch {}
  };

  const scheduleControlNotification = async (state /* 'recording' | 'paused' */) => {
    const LN = getLocalNotifications();
    if (!LN) return;
    try {
      const granted = await ensureNotificationPermission();
      if (!granted) return;
      const actionTypeId = state === 'paused' ? 'PAUSED_CONTROLS' : 'RECORDING_CONTROLS';
      await LN.schedule({
        notifications: [
          {
            id: controlNotifIdRef.current,
            title: 'Walk recording',
            body: state === 'paused' ? 'Paused' : 'Recording in background',
            actionTypeId
          }
        ]
      });
    } catch {}
  };

  const cancelControlNotification = async () => {
    const LN = getLocalNotifications();
    if (!LN) return;
    try {
      await LN.cancel({ notifications: [{ id: controlNotifIdRef.current }] });
    } catch {}
  };

  const startBackgroundWatcher = async () => {
    if (bgWatcherIdRef.current != null) return;
    // Only attempt on Android native
    if (Capacitor.getPlatform() !== 'android') return;
    const BG = getBackgroundGeolocation();
    if (!BG) {
      pushLog('BackgroundGeolocation native plugin not available; background tracking disabled');
      return;
    }
    try {
      const notifGranted = await ensureNotificationPermission();
      if (!notifGranted) {
        pushLog('Notification permission denied; background notification may not appear');
      }
      const id = await BG.addWatcher(
        {
          requestPermissions: true,
          stale: false,
          distanceFilter: 1,
          backgroundTitle: 'Stepno',
          backgroundMessage: 'Recording walk in background'
        },
        async (result, error) => {
          if (error) {
            if (error.code === 'NOT_AUTHORIZED') {
              pushLog('Background location not authorized');
            } else {
              pushLog(`Background watcher error: ${String(error.code || error)}`);
            }
            return;
          }
          if (!result || isPaused) return;
          const { latitude, longitude, altitude } = result;
          if (typeof longitude !== 'number' || typeof latitude !== 'number') return;
          pushCoordinateIfNew(longitude, latitude);
          updatePathSourceData();
          latestCoordsRef.current = { lat: latitude, lng: longitude, ele: typeof altitude === 'number' ? altitude : undefined };
        }
      );
      bgWatcherIdRef.current = id;
      pushLog('Background tracking started');
    } catch (e) {
      console.error('BackgroundGeolocation.addWatcher error', e);
      pushLog('Failed to start background tracking');
    }
  };

  const stopBackgroundWatcher = async () => {
    if (bgWatcherIdRef.current == null) return;
    const BG = getBackgroundGeolocation();
    if (!BG) {
      bgWatcherIdRef.current = null;
      return;
    }
    try {
      await BG.removeWatcher({ id: bgWatcherIdRef.current });
    } catch (e) {
      console.warn('BackgroundGeolocation.removeWatcher error', e);
    }
    bgWatcherIdRef.current = null;
    pushLog('Background tracking stopped');
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
     
     // Clear all coordinate references
     pathCoordsRef.current = [];
     gpxPointsRef.current = [];
     latestCoordsRef.current = null;
     gpxBuilderRef.current = new BaseBuilder();
     
     // Clear any existing path from the map
     const map = mapRef.current;
     if (map) {
       const source = map.getSource(PATH_SOURCE_ID);
       if (source) {
         source.setData({
           type: 'Feature',
           geometry: { type: 'LineString', coordinates: [] },
           properties: {}
         });
       }
     }
     
     pushLog('Recording started');
    startPositionWatcher();
    // Start background watcher (Android)
    startBackgroundWatcher();
    if (ENABLE_CONTROL_NOTIFICATION) {
      scheduleControlNotification('recording');
    }
    // Start per-second GPX point capture
    if (gpxIntervalRef.current) clearInterval(gpxIntervalRef.current);
    gpxIntervalRef.current = setInterval(() => {
      if (!isPaused && latestCoordsRef.current) {
        const { lat, lng, ele } = latestCoordsRef.current;
        const point = new Point(lat, lng, {
          time: new Date(),
          ...(typeof ele === 'number' ? { ele } : {})
        });
        gpxPointsRef.current.push(point);
        // Keep builder updated (single segment)
        try {
          gpxBuilderRef.current && gpxBuilderRef.current.setSegmentPoints(gpxPointsRef.current);
        } catch (e) {
          console.error('GPX builder setSegmentPoints error', e);
        }
      }
    }, 1000);
  };

  const pauseRecording = () => {
    setIsPaused(true);
    pushLog('Recording paused');
    if (ENABLE_CONTROL_NOTIFICATION) {
      scheduleControlNotification('paused');
    }
  };

  const resumeRecording = () => {
    setIsPaused(false);
    pushLog('Recording resumed');
    if (ENABLE_CONTROL_NOTIFICATION) {
      scheduleControlNotification('recording');
    }
  };

     const stopRecording = () => {
     setIsRecording(false);
     setIsPaused(false);
     stopPositionWatcher();
     stopBackgroundWatcher();
     if (ENABLE_CONTROL_NOTIFICATION) {
       cancelControlNotification();
     }
     if (gpxIntervalRef.current) {
       clearInterval(gpxIntervalRef.current);
       gpxIntervalRef.current = null;
     }
     
     // Clear all coordinate references
     latestCoordsRef.current = null;
     
     // Clear the path from the map if it exists
     const map = mapRef.current;
     if (map) {
       const source = map.getSource(PATH_SOURCE_ID);
       if (source) {
         source.setData({
           type: 'Feature',
           geometry: { type: 'LineString', coordinates: [] },
           properties: {}
         });
       }
     }
     
     pushLog('Recording stopped');

    const pointsLen = gpxPointsRef.current.length;
    if (!pointsLen) {
      pushLog('No points captured. Skipping GPX save.');
      return;
    }

    // Build GPX and save
    try {
      const builder = gpxBuilderRef.current || new BaseBuilder();
      builder.setSegmentPoints(gpxPointsRef.current);
      const xml = buildGPX(builder.toObject());

      // Prepare filename as in InsertWalk
      const date = new Date(selectedDate);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const fileName = `${day}-${month}-${year}-w1.gpx`;

      // Ensure walks directory
      Filesystem.mkdir({ path: 'walks', directory: Directory.Documents, recursive: true })
        .catch(() => {})
        .finally(async () => {
          try {
            await Filesystem.writeFile({
              path: `walks/${fileName}`,
              data: xml,
              directory: Directory.Documents,
              encoding: Encoding.UTF8
            });
            pushLog(`GPX saved to walks/${fileName}`);

            try {
              const result = await localDataService.addWalkToDate(selectedDate, fileName);
              if (result && result.success) {
                pushLog('Steps data updated with new walk file');
                // Optional: navigate back after short delay
                setTimeout(() => navigate(-1), 1500);
              } else {
                throw new Error('Failed to update steps data');
              }
            } catch (e) {
              console.error('Error updating steps data:', e);
              pushLog('Error updating steps data. Please ensure steps exist for this date.');
              // Attempt cleanup
              try {
                await Filesystem.deleteFile({ path: `walks/${fileName}`, directory: Directory.Documents });
                pushLog('Saved file removed due to metadata update failure');
              } catch (cleanupError) {
                console.error('Cleanup error:', cleanupError);
                pushLog('Failed to remove saved file after metadata error');
              }
            }
          } catch (writeErr) {
            console.error('File write error:', writeErr);
            pushLog('Error saving GPX file.');
          }
        });
    } catch (e) {
      console.error('GPX build error:', e);
      pushLog('Failed to build GPX data');
    }
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

    // Handle online/offline status changes
    const handleOnlineStatus = () => {
      setIsOnline(true);
      if (mapRef.current) {
        const map = mapRef.current;
        // Store current coordinates before style change
        const currentCoords = pathCoordsRef.current.slice();
        
        map.setStyle('mapbox://styles/mapbox/standard');
        
        // Re-add path source and layer after style loads
        map.once('style.load', () => {
          // Ensure we're working with the latest coordinates
          pathCoordsRef.current = currentCoords;
          
          // Force recreation of source and layer
          if (map.getSource(PATH_SOURCE_ID)) {
            map.removeSource(PATH_SOURCE_ID);
          }
          if (map.getLayer(PATH_LAYER_ID)) {
            map.removeLayer(PATH_LAYER_ID);
          }
          
          map.addSource(PATH_SOURCE_ID, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: currentCoords },
              properties: {}
            }
          });
          
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
        });
        pushLog('Network connection restored, switching to online map');
      }
    };

    const handleOfflineStatus = () => {
      setIsOnline(false);
      if (mapRef.current) {
        const map = mapRef.current;
        // Store current coordinates before style change
        const currentCoords = pathCoordsRef.current.slice();
        
        // Create a complete offline style that includes our path
        const offlineStyle = {
          version: 8,
          sources: {
            [PATH_SOURCE_ID]: {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: currentCoords },
                properties: {}
              }
            }
          },
          layers: [
            {
              id: 'background',
              type: 'background',
              paint: {
                'background-color': '#ffffff'
              }
            },
            {
              id: PATH_LAYER_ID,
              type: 'line',
              source: PATH_SOURCE_ID,
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: {
                'line-color': '#2da1ff',
                'line-width': 4,
                'line-opacity': 0.9
              }
            }
          ]
        };
        
        map.setStyle(offlineStyle);
        
        // After style loads, ensure our data is up to date
        map.once('style.load', () => {
          // Ensure we're working with the latest coordinates
          pathCoordsRef.current = currentCoords;
          
          // Force recreation of source and layer
          if (map.getSource(PATH_SOURCE_ID)) {
            map.removeSource(PATH_SOURCE_ID);
          }
          if (map.getLayer(PATH_LAYER_ID)) {
            map.removeLayer(PATH_LAYER_ID);
          }
          
          map.addSource(PATH_SOURCE_ID, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: currentCoords },
              properties: {}
            }
          });
          
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
        });
        pushLog('Network connection lost, switching to offline map');
      }
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);

    // Create map with appropriate style based on connection status
    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: isOnline ? 'mapbox://styles/mapbox/standard' : {
        version: 8,
        sources: {
          [PATH_SOURCE_ID]: {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: pathCoordsRef.current },
              properties: {}
            }
          }
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#ffffff'
            }
          },
          {
            id: PATH_LAYER_ID,
            type: 'line',
            source: PATH_SOURCE_ID,
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': '#2da1ff',
              'line-width': 4,
              'line-opacity': 0.9
            }
          }
        ]
      },
      center: [initialCoords.lng, initialCoords.lat],
      zoom: 14,
      attributionControl: false
    });

    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
      // Ensure no animated transition when the control updates the camera
      fitBoundsOptions: { maxZoom: 14, duration: 0 }
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
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
      mapRef.current && mapRef.current.remove();
    };
  }, [initialCoords]);

  // cleanup watcher on unmount
  useEffect(() => {
    if (ENABLE_CONTROL_NOTIFICATION) {
      (async () => {
        await registerNotificationActions();
        const LN = getLocalNotifications();
        if (LN && !notifListenerRef.current) {
          notifListenerRef.current = await LN.addListener('localNotificationActionPerformed', (event) => {
            try {
              if (!event || !event.notification) return;
              if (event.notification.id !== controlNotifIdRef.current) return;
              const actionId = event.actionId;
              if (actionId === 'PAUSE') {
                pauseRecording();
              } else if (actionId === 'RESUME') {
                resumeRecording();
              } else if (actionId === 'STOP') {
                stopRecording();
              }
            } catch {}
          });
        }
      })();
    }
    return () => {
      stopPositionWatcher();
      stopBackgroundWatcher();
      if (notifListenerRef.current && typeof notifListenerRef.current.remove === 'function') {
        notifListenerRef.current.remove();
        notifListenerRef.current = null;
      }
    };
  }, []);

  // Notification text customization can be configured via Android resources per plugin docs

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
      <div style={{
        marginTop: '10px',
        padding: '8px',
        backgroundColor: '#0f172a',
        color: '#cbd5e1',
        borderRadius: '6px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: '12px',
        maxHeight: '160px',
        overflowY: 'auto'
      }}>
        {logs.length === 0 ? (
          <div>Logs will appear here…</div>
        ) : (
          logs.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))
        )}
      </div>
    </div>
  );
}

export default Recorder;
