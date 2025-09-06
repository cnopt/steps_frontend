import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import GPXParser from "gpxparser";
import { XMLParser } from "fast-xml-parser";
import { useLocation, useNavigate } from 'react-router-dom';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Camera, CameraResultType } from '@capacitor/camera';
import { App } from '@capacitor/app';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '../styles/WalkView.css';
import XPBar from './XPBar';
import MapComponent from './MapComponent';
import WalkViewDetails from './WalkViewDetails';
import exifr from 'exifr';

// Arrow configuration options
  const ARROW_CONFIG = {
    spacing: 30, // Show an arrow every X pixels along the path
    size: 1.1, // Size multiplier for the arrows
    color: "#fff", // Arrow color matching the path
    opacity: 0.7, // Arrow opacity
  };

  // Debug configuration flags
  const blockTimeByMinute = false;
  const DEBUG_BBOX_PADDING_PERCENT = 20; // Increase bounding box size by this percentage

  const easeToDuration = 50;
  const easeToCurve = 1.12;

export default function WalkView() {
  const location = useLocation();
  const navigate = useNavigate();
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const positionMarkerRef = useRef(null);
  const photoMarkerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gpxData, setGpxData] = useState(null);
  const [hasFadedIn, setHasFadedIn] = useState(false);
  const [showSpinner, setShowSpinner] = useState(true);
  const fadeTimeoutRef = useRef(null);
  const [imageMetadata, setImageMetadata] = useState(null);
  const [imageError, setImageError] = useState(null);



  const handleImageCapture = async () => {
    try {
      setImageError(null);
      setImageMetadata(null);
      
      // Clean up existing photo marker if any
      if (photoMarkerRef.current) {
        photoMarkerRef.current.remove();
        photoMarkerRef.current = null;
      }
  
      console.log('📱 Starting photo selection from gallery...');
      
      // Get photo from gallery
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false, // Set to false to preserve EXIF data
        resultType: CameraResultType.Uri,
        source: 'PHOTOS',
        saveToGallery: false,
        correctOrientation: true
      });
      
      console.log('📸 Photo selected! Full image object:', image);
      console.log('📸 Image properties:', {
        path: image.path,
        webPath: image.webPath,
        dataUrl: image.dataUrl,
        base64String: image.base64String,
        format: image.format,
        exif: image.exif
      });
  
      // First, try to use the built-in EXIF data from Camera API
      if (image.exif) {
        console.log('🔍 Built-in EXIF data found:', image.exif);
        
        // Check if GPS data is in the built-in EXIF
        let gpsData = null;
        
        // Try different possible GPS data structures
        if (image.exif.GPS) {
          console.log('🌍 GPS data in image.exif.GPS:', image.exif.GPS);
          gpsData = image.exif.GPS;
        } else if (image.exif.gps) {
          console.log('🌍 GPS data in image.exif.gps:', image.exif.gps);
          gpsData = image.exif.gps;
        } else if (image.exif.GPSLatitude && image.exif.GPSLongitude) {
          console.log('🌍 GPS data in root EXIF:', {
            lat: image.exif.GPSLatitude,
            lng: image.exif.GPSLongitude
          });
          gpsData = {
            GPSLatitude: image.exif.GPSLatitude,
            GPSLongitude: image.exif.GPSLongitude
          };
        }
        
        if (gpsData) {
          console.log('✅ GPS data extracted from built-in EXIF:', gpsData);
          
          // Try to extract lat/lng from GPS data
          let latitude, longitude;
          
          if (gpsData.latitude && gpsData.longitude) {
            latitude = gpsData.latitude;
            longitude = gpsData.longitude;
          } else if (gpsData.GPSLatitude && gpsData.GPSLongitude) {
            latitude = gpsData.GPSLatitude;
            longitude = gpsData.GPSLongitude;
          }
          
          if (latitude && longitude) {
            console.log('🎯 Location extracted from built-in EXIF:', { latitude, longitude });
            
            const isWithinBounds = isLocationWithinBounds(latitude, longitude);
            setImageMetadata({
              latitude,
              longitude,
              isWithinBounds,
              imagePath: image.webPath
            });
            
            if (isWithinBounds && mapRef.current) {
              // Create camera icon element
              const markerElement = document.createElement('div');
              markerElement.className = 'photo-marker';
              markerElement.innerHTML = '';
              markerElement.style.cursor = 'pointer';
              
              // Create and add the marker
              photoMarkerRef.current = new mapboxgl.Marker({
                element: markerElement,
              })
                .setLngLat([longitude, latitude])
                .addTo(mapRef.current);
              
              // Zoom and center on the photo location
              mapRef.current.easeTo({
                center: [longitude, latitude],
                zoom: mapRef.current.getZoom() + 2,
                duration: 1500,
                curve: 1.12
              });
            }
            return; // Successfully processed built-in EXIF data
          }
        }
      } else {
        console.log('❌ No built-in EXIF data found in Camera API response');
      }
      
      console.log('🔄 Falling back to manual EXIF reading with exifr...');
      
      // Fallback: Convert the image URI to a blob to read EXIF data manually
      const response = await fetch(image.webPath);
      console.log('📥 Fetch response:', {
        ok: response.ok,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      const blob = await response.blob();
      console.log('📦 Blob created:', {
        size: blob.size,
        type: blob.type
      });
      
      // Read the image metadata using exifr
      const metadata = await exifr.gps(blob);
      console.log('🔍 exifr GPS result:', metadata);
      
      // Also try to get all EXIF data for debugging
      const allExif = await exifr.parse(blob);
      console.log('🔍 exifr all EXIF data:', allExif);
      
      if (metadata && metadata.latitude && metadata.longitude) {
        console.log('✅ Location found with exifr:', metadata);
        
        const isWithinBounds = isLocationWithinBounds(metadata.latitude, metadata.longitude);
        setImageMetadata({
          latitude: metadata.latitude,
          longitude: metadata.longitude,
          isWithinBounds,
          imagePath: image.webPath
        });
  
        if (isWithinBounds && mapRef.current) {
          // Create camera icon element
          const markerElement = document.createElement('div');
          markerElement.className = 'photo-marker';
          markerElement.innerHTML = '';
          markerElement.style.cursor = 'pointer';
          
          // Create and add the marker
          photoMarkerRef.current = new mapboxgl.Marker({
            element: markerElement,
          })
            .setLngLat([metadata.longitude, metadata.latitude])
            .addTo(mapRef.current);
          
          // Zoom and center on the photo location
          mapRef.current.easeTo({
            center: [metadata.longitude, metadata.latitude],
            zoom: mapRef.current.getZoom() + 2, // Zoom in slightly
            duration: 1500,
            curve: 1.12
          });
        }
      } else {
        console.log('❌ No location data found in image EXIF');
        setImageError('No location data found in image');
      }
    } catch (err) {
      console.error('💥 Error handling image:', err);
      console.error('💥 Error stack:', err.stack);
      setImageError(err.message || 'Error processing image');
    }
  };
  
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

        // // log GPX data structure from GPXParser
        // console.log('GPXParser result:', {
        //   metadata: gpx.metadata,
        //   tracks: gpx.tracks.map(track => ({
        //     name: track.name,
        //     distance: track.distance.total,
        //     elevation: track.elevation,
        //     slopes: track.slopes,
        //     points: track.points,
        //     points_length: track.points.length
        //   }))
        // });

        // Parse with fast-xml-parser
        const xmlParser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: "@_",
          parseAttributeValue: true
        });
        const xmlResult = xmlParser.parse(gpxText);
        
        // Log the raw XML parsing result
        // console.log('fast-xml-parser result:', xmlResult);

        //console.log(xmlResult.gpx.name);
        //console.log(xmlResult.gpx.extensions['os:distance']);

        
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
        style: currentStyle.url,
        center: bounds.getCenter().toArray(),
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
        
        // Add the main route source
        mapRef.current.addSource("gpxRoute", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: points,
            },
          },
        });

        // Add bounding box source with padding
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        
        // Calculate the size of the current bounding box
        const lngDiff = ne.lng - sw.lng;
        const latDiff = ne.lat - sw.lat;
        
        // Calculate padding based on percentage
        const lngPadding = (lngDiff * DEBUG_BBOX_PADDING_PERCENT) / 100;
        const latPadding = (latDiff * DEBUG_BBOX_PADDING_PERCENT) / 100;
        
        // Create padded coordinates
        const paddedSW = { lng: sw.lng - lngPadding, lat: sw.lat - latPadding };
        const paddedNE = { lng: ne.lng + lngPadding, lat: ne.lat + latPadding };
        
        // mapRef.current.addSource("boundingBox", {
        //   type: "geojson",
        //   data: {
        //     type: "Feature",
        //     geometry: {
        //       type: "Polygon",
        //       coordinates: [[
        //         [paddedSW.lng, paddedSW.lat],
        //         [paddedNE.lng, paddedSW.lat],
        //         [paddedNE.lng, paddedNE.lat],
        //         [paddedSW.lng, paddedNE.lat],
        //         [paddedSW.lng, paddedSW.lat]
        //       ]]
        //     }
        //   }
        // });
        
        // Glow effect: add blurred, wider lines underneath the main line
        // mapRef.current.addLayer({
        //   id: "gpxRouteGlowOuter",
        //   type: "line",
        //   source: "gpxRoute",
        //   paint: {
        //     "line-color": "#037bfc",
        //     "line-width": 40,
        //     "line-opacity": 0.35,
        //     "line-blur": 28
        //   }
        // });

        // mapRef.current.addLayer({
        //   id: "gpxRouteGlowInner",
        //   type: "line",
        //   source: "gpxRoute",
        //   paint: {
        //     "line-color": "#2da1ff",
        //     "line-width": 22,
        //     "line-opacity": 0.6,
        //     "line-blur": 12
        //   }
        // });

        // Intense core glow to enhance prominence
        // mapRef.current.addLayer({
        //   id: "gpxRouteCoreGlow",
        //   type: "line",
        //   source: "gpxRoute",
        //   paint: {
        //     "line-color": "#ffffff",
        //     "line-width": 8,
        //     "line-opacity": 0.45,
        //     "line-blur": 4
        //   }
        // });

        // Main route line on top of the glows
        // Add bounding box layer
        // mapRef.current.addLayer({
        //   id: "boundingBox",
        //   type: "fill",
        //   source: "boundingBox",
        //   paint: {
        //     "fill-color": "#f5dd42",
        //     "fill-opacity": 0.3,
        //   }
        // });

        // Add bounding box outline
        // mapRef.current.addLayer({
        //   id: "boundingBoxOutline",
        //   type: "line",
        //   source: "boundingBox",
        //   paint: {
        //     "line-color": "#fcb72b",
        //     "line-width": 2,
        //     "line-opacity": 0.3,
        //     "line-dasharray": [2, 2]
        //   }
        // });

        // Add main route line
        mapRef.current.addLayer({
          id: "gpxRouteLine",
          type: "line",
          source: "gpxRoute",
          paint: {
            "line-color": "#2da1ff",
            "line-width": 2,
            "line-opacity": 1
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
        
        // Initialize position marker
        //console.log('Initializing marker with points:', points);
        const markerElement = document.createElement('div');
        markerElement.className = 'position-marker';
        
        // Ensure we have valid coordinates
        if (points.length > 0) {
          //console.log('Creating marker at coordinates:', points[0]);
          positionMarkerRef.current = new mapboxgl.Marker({
            element: markerElement,
          })
            .setLngLat(points[0])
            .addTo(mapRef.current);
          
          //console.log('Marker created:', positionMarkerRef.current);
        } else {
          console.error('No points available for marker initialization');
        }

        mapRef.current.fitBounds(bounds, { padding: 50 });
        // Ensure the camera centers on the position marker initially with a smooth ease
        // if (points.length > 0) {
        //   mapRef.current.easeTo({ center: points[0], duration: easeToDuration, curve: easeToCurve});
        // }
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
      if (positionMarkerRef.current) {
        positionMarkerRef.current.remove();
      }
      if (photoMarkerRef.current) {
        photoMarkerRef.current.remove();
      }
      if (mapRef.current) {
        // Remove bounding box layers and source before removing the map
        if (mapRef.current.getLayer('boundingBox')) mapRef.current.removeLayer('boundingBox');
        if (mapRef.current.getLayer('boundingBoxOutline')) mapRef.current.removeLayer('boundingBoxOutline');
        if (mapRef.current.getSource('boundingBox')) mapRef.current.removeSource('boundingBox');
        mapRef.current.remove();
      }
    };
  }, [gpxData, loading, error]);

  // Handle hardware back button
  useEffect(() => {
    const handleBackButton = () => {
      navigate(-1);
      return true; // Prevent default behavior
    };

    // Add back button listener
    const backButtonListener = App.addListener('backButton', handleBackButton);

    // Cleanup listener on component unmount
    return () => {
      backButtonListener.remove();
    };
  }, [navigate]);
  
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
  
  const formatElevation = (value) => {
    return `${value.toFixed(0)}m`;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isLocationWithinBounds = (lat, lon) => {
    if (!mapRef.current) return false;
    
    // Get the bounding box source
    const boundingBoxSource = mapRef.current.getSource('boundingBox');
    if (!boundingBoxSource) return false;
    
    // Get the coordinates from the bounding box source
    const coordinates = boundingBoxSource._data.geometry.coordinates[0];
    
    // Extract min/max coordinates from bounding box
    const lngs = coordinates.map(coord => coord[0]);
    const lats = coordinates.map(coord => coord[1]);
    
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    
    // Check if the point is within the bounds
    return lon >= minLng && lon <= maxLng && lat >= minLat && lat <= maxLat;
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageError('Please select an image file (jpg/png)');
      return;
    }

    try {
      setImageError(null);
      setImageMetadata(null);
      
      // Clean up existing photo marker if any
      if (photoMarkerRef.current) {
        photoMarkerRef.current.remove();
        photoMarkerRef.current = null;
      }
      
      // Read the image metadata
      const metadata = await exifr.gps(file);
      
      if (metadata && metadata.latitude && metadata.longitude) {
        const isWithinBounds = isLocationWithinBounds(metadata.latitude, metadata.longitude);
        setImageMetadata({
          latitude: metadata.latitude,
          longitude: metadata.longitude,
          isWithinBounds
        });

        if (isWithinBounds && mapRef.current) {
          // Create camera icon element
          const markerElement = document.createElement('div');
          markerElement.className = 'photo-marker';
          markerElement.innerHTML = '';
          markerElement.style.cursor = 'pointer';
          
          // Create and add the marker
          photoMarkerRef.current = new mapboxgl.Marker({
            element: markerElement,
          })
            .setLngLat([metadata.longitude, metadata.latitude])
            .addTo(mapRef.current);
          
          // Zoom and center on the photo location
          mapRef.current.easeTo({
            center: [metadata.longitude, metadata.latitude],
            zoom: mapRef.current.getZoom() + 2, // Zoom in slightly
            duration: 1500,
            curve: 1.12
          });
        }
      } else {
        setImageError('No location data found in image');
      }
    } catch (err) {
      console.error('Error reading image metadata:', err);
      setImageError('Error reading image metadata');
    }
  };

  return (
    <>
      
      <MapComponent
        initialCoords={gpxData ? {
          lng: gpxData.tracks[0].points[0].lon,
          lat: gpxData.tracks[0].points[0].lat
        } : null}
        onMapReady={(map) => {
          mapRef.current = map;
          
          // Add terrain and path layers
          map.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxZoom: 14
          });
          map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });

          const points = gpxData.tracks[0].points.map((pt) => [pt.lon, pt.lat]);
          const bounds = new mapboxgl.LngLatBounds();
          points.forEach((p) => bounds.extend(p));

          // Add the main route source
          map.addSource("gpxRoute", {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: points,
              },
            },
          });

          // Add bounding box source with padding
          const sw = bounds.getSouthWest();
          const ne = bounds.getNorthEast();
          const lngDiff = ne.lng - sw.lng;
          const latDiff = ne.lat - sw.lat;
          const lngPadding = (lngDiff * DEBUG_BBOX_PADDING_PERCENT) / 100;
          const latPadding = (latDiff * DEBUG_BBOX_PADDING_PERCENT) / 100;
          const paddedSW = { lng: sw.lng - lngPadding, lat: sw.lat - latPadding };
          const paddedNE = { lng: ne.lng + lngPadding, lat: ne.lat + latPadding };

          // map.addSource("boundingBox", {
          //   type: "geojson",
          //   data: {
          //     type: "Feature",
          //     geometry: {
          //       type: "Polygon",
          //       coordinates: [[
          //         [paddedSW.lng, paddedSW.lat],
          //         [paddedNE.lng, paddedSW.lat],
          //         [paddedNE.lng, paddedNE.lat],
          //         [paddedSW.lng, paddedNE.lat],
          //         [paddedSW.lng, paddedSW.lat]
          //       ]]
          //     }
          //   }
          // });

          // Add layers
          // map.addLayer({
          //   id: "boundingBox",
          //   type: "fill",
          //   source: "boundingBox",
          //   paint: {
          //     "fill-color": "#f5dd42",
          //     "fill-opacity": 0.3,
          //   }
          // });

          // map.addLayer({
          //   id: "boundingBoxOutline",
          //   type: "line",
          //   source: "boundingBox",
          //   paint: {
          //     "line-color": "#fcb72b",
          //     "line-width": 2,
          //     "line-opacity": 0.3,
          //     "line-dasharray": [2, 2]
          //   }
          // });

          map.addLayer({
            id: "gpxRouteLine",
            type: "line",
            source: "gpxRoute",
            paint: {
              "line-color": "#2da1ff",
              "line-width": 2,
              "line-opacity": 1
            }
          });

          map.addLayer({
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

          // Initialize position marker
          const markerElement = document.createElement('div');
          markerElement.className = 'position-marker';
          
          if (points.length > 0) {
            positionMarkerRef.current = new mapboxgl.Marker({
              element: markerElement,
            })
              .setLngLat(points[0])
              .addTo(map);
          }

          map.fitBounds(bounds, { padding: 50 });
          setMapReady(true);
        }}
        onStyleChange={(style, map) => {
          // Re-add terrain and layers after style change
          map.once('style.load', () => {
            map.addSource('mapbox-dem', {
              type: 'raster-dem',
              url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
              tileSize: 512,
              maxZoom: 14
            });
            map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });

            const points = gpxData.tracks[0].points.map((pt) => [pt.lon, pt.lat]);
            
            // Re-add sources and layers
            map.addSource("gpxRoute", {
              type: "geojson",
              data: {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: points,
                },
              },
            });

            const bounds = new mapboxgl.LngLatBounds();
            points.forEach((p) => bounds.extend(p));
            const sw = bounds.getSouthWest();
            const ne = bounds.getNorthEast();
            const lngDiff = ne.lng - sw.lng;
            const latDiff = ne.lat - sw.lat;
            const lngPadding = (lngDiff * DEBUG_BBOX_PADDING_PERCENT) / 100;
            const latPadding = (latDiff * DEBUG_BBOX_PADDING_PERCENT) / 100;
            const paddedSW = { lng: sw.lng - lngPadding, lat: sw.lat - latPadding };
            const paddedNE = { lng: ne.lng + lngPadding, lat: ne.lat + latPadding };

            // map.addSource("boundingBox", {
            //   type: "geojson",
            //   data: {
            //     type: "Feature",
            //     geometry: {
            //       type: "Polygon",
            //       coordinates: [[
            //         [paddedSW.lng, paddedSW.lat],
            //         [paddedNE.lng, paddedSW.lat],
            //         [paddedNE.lng, paddedNE.lat],
            //         [paddedSW.lng, paddedNE.lat],
            //         [paddedSW.lng, paddedSW.lat]
            //       ]]
            //     }
            //   }
            // });

            // Re-add all layers
            // map.addLayer({
            //   id: "boundingBox",
            //   type: "fill",
            //   source: "boundingBox",
            //   paint: {
            //     "fill-color": "#f5dd42",
            //     "fill-opacity": 0.3,
            //   }
            // });

            // map.addLayer({
            //   id: "boundingBoxOutline",
            //   type: "line",
            //   source: "boundingBox",
            //   paint: {
            //     "line-color": "#fcb72b",
            //     "line-width": 2,
            //     "line-opacity": 0.3,
            //     "line-dasharray": [2, 2]
            //   }
            // });

            map.addLayer({
              id: "gpxRouteLine",
              type: "line",
              source: "gpxRoute",
              paint: {
                "line-color": "#2da1ff",
                "line-width": 2,
                "line-opacity": 1
              }
            });

            map.addLayer({
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

            // Re-add position marker
            if (positionMarkerRef.current) {
              positionMarkerRef.current.addTo(map);
            }
          });
        }}
      />
      
      {gpxData && (
        <div className="elevation-chart">
          {/* <p className="chart-title">Elevation Profile</p> */}
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              onMouseMove={(e) => {
                //console.log('AreaChart mouse move:', e);
                if (e && e.activePayload && e.activePayload[0]) {
                  const payload = e.activePayload[0].payload;
                  const hoveredTime = payload.time;
                  const pointIndex = payload.pointIndex;
                  
                  // console.log('Chart hover event:', {
                  //   hoveredTime: new Date(hoveredTime).toISOString(),
                  //   pointIndex,
                  //   payload
                  // });
                  
                  // Use the stored index to get the exact corresponding point
                  const point = gpxData.tracks[0].points[pointIndex];
                  
                  if (point && positionMarkerRef.current) {
                    const coords = [point.lon, point.lat];
                    //console.log('Moving marker to coordinates:', coords, 'from point:', point);
                    positionMarkerRef.current.setLngLat(coords);
                    // Keep the camera centered on the marker while scrubbing
                    if (mapRef.current) {
                      mapRef.current.easeTo({ center: coords, duration: easeToDuration, curve: easeToCurve});
                    }
                  } else {
                    console.warn('Failed to update marker position:', {
                      hasPoint: !!point,
                      hasMarker: !!positionMarkerRef.current,
                      pointIndex,
                      totalPoints: gpxData.tracks[0].points.length
                    });
                  }
                }
              }}
              data={(() => {
                if (blockTimeByMinute) {
                  // Group points by minute and take one point per minute
                  const pointsByMinute = {};
                  gpxData.tracks[0].points.forEach((point, index) => {
                    const timestamp = new Date(point.time);
                    // Format the date to YYYY-MM-DDTHH:mm
                    const minuteKey = timestamp.toISOString().slice(0, 16);
                    
                    // Only store the first point we encounter for each minute
                    if (!pointsByMinute[minuteKey]) {
                      pointsByMinute[minuteKey] = {
                        time: timestamp.getTime(),
                        elevation: point.ele || 0,
                        pointIndex: index // Store the original index
                      };
                    }
                  });

                  // Convert the object back to an array and sort by time
                  return Object.values(pointsByMinute).sort((a, b) => a.time - b.time);
                } else {
                  // Use all data points with their original indices
                  return gpxData.tracks[0].points.map((point, index) => ({
                    time: new Date(point.time).getTime(),
                    elevation: point.ele || 0,
                    pointIndex: index
                  }));
                }
              })()}
              margin={{
                top: 5,
                right: 15,
                left: -15,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id="colorElevation" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--theme-day-filled)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4CAF50" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#222"
                vertical={false}
              />
              {/* <XAxis 
                dataKey="time" 
                stroke="#666"
                tick={{ fill: '#666' }}
                fontFamily='sf'
                fontSize={'0.8em'}
                tickFormatter={formatTime}
                // ticks={(() => {
                //   const data = gpxData.tracks[0].points;
                //   return [
                //     new Date(data[0].time).getTime(),
                //     new Date(data[data.length - 1].time).getTime()
                //   ];
                // })()}
                // show first time and last time value for the ticks
                ticks={[gpxData.tracks[0].points[0].time, gpxData.tracks[0].points[2*Math.round(gpxData.tracks[0].points.length/2)/2].time ,gpxData.tracks[0].points[gpxData.tracks[0].points.length -1].time]}
              /> */}
              <YAxis 
                stroke="#666"
                tick={{ fill: '#666' }}
                fontFamily='sf'
                fontSize={'0.8em'}
                tickFormatter={formatElevation}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  fontFamily:'sf',
                  display:'inline-block',
                  whiteSpace:'nowrap'
                }}
                formatter={(value, name) => {
                  if (name === 'elevation') {
                    return [`${value.toFixed(0)}m`];
                  }
                  return [formatTime(value), 'Time'];
                }}
                labelFormatter={(value) => formatTime(value)}
              />
              <Area 
                type="natural"
                dataKey="elevation"
                stroke="var(--theme-day-filled)"
                strokeOpacity={1}
                fill="url(#colorElevation)"
                fillOpacity={1}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 , fill:'#037bfc' ,stroke:'white'}}
                animationDuration={800}
                animationEasing="ease-in-out"
                isAnimationActive={false}
                onMouseMove={(data) => {
                  //console.log('Area onMouseMove triggered');
                  if (data.activePayload && data.activePayload[0]) {
                    const payload = data.activePayload[0].payload;
                    const hoveredTime = payload.time;
                    const pointIndex = payload.pointIndex;
                    
                    // console.log('Chart hover event:', {
                    //   hoveredTime: new Date(hoveredTime).toISOString(),
                    //   pointIndex,
                    //   payload
                    // });
                    
                    // Use the stored index to get the exact corresponding point
                    const point = gpxData.tracks[0].points[pointIndex];
                    
                    if (point && positionMarkerRef.current) {
                      const coords = [point.lon, point.lat];
                      //console.log('Moving marker to coordinates:', coords, 'from point:', point);
                      positionMarkerRef.current.setLngLat(coords);
                      // Keep the camera centered on the marker while scrubbing
                      if (mapRef.current) {
                        mapRef.current.easeTo({ center: coords, duration: easeToDuration, curve: easeToCurve});
                      }
                    } else {
                      console.warn('Failed to update marker position:', {
                        hasPoint: !!point,
                        hasMarker: !!positionMarkerRef.current,
                        pointIndex,
                        totalPoints: gpxData.tracks[0].points.length
                      });
                    }
                  }
                }}
                onMouseLeave={() => {
                  // Optionally hide or reset the marker when not hovering
                  if (positionMarkerRef.current && gpxData) {
                    const firstPoint = gpxData.tracks[0].points[0];
                    positionMarkerRef.current.setLngLat([firstPoint.lon, firstPoint.lat]);
                    if (mapRef.current) {
                      mapRef.current.easeTo({ center: [firstPoint.lon, firstPoint.lat], duration: easeToDuration, curve: easeToCurve});
                    }
                  }
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* <div style={{ padding: '20px' }}>
        <button
          onClick={handleImageCapture}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '0.9em',
            fontFamily: 'sf',
            marginBottom: '20px'
          }}
        >
          Select Photo from Gallery
        </button>
        {imageError && (
          <p style={{ color: 'red', marginBottom: '10px' }}>{imageError}</p>
        )}
        {imageMetadata && (
          <div>
            <p style={{ marginBottom: '5px' }}>Image Location:</p>
            <p style={{ marginBottom: '5px' }}>Latitude: {imageMetadata.latitude}</p>
            <p style={{ marginBottom: '5px' }}>Longitude: {imageMetadata.longitude}</p>
            <p style={{ marginBottom: '5px' }}>Within Walk Area: {imageMetadata.isWithinBounds ? 'Yes' : 'No'}</p>
            {imageMetadata.imagePath && (
              <img 
                src={imageMetadata.imagePath} 
                alt="Captured location" 
                style={{ 
                  maxWidth: '100%', 
                  height: 'auto', 
                  marginTop: '10px',
                  borderRadius: '5px'
                }} 
              />
            )}
          </div>
        )}
      </div> */}

      <WalkViewDetails gpxData={gpxData} />

      {/* <div className='cancel-div'>
        <button
            onClick={() => navigate(-1)}
            className="exit-btn"
          ><span></span>
        </button>
      </div> */}
    </>
  );
}