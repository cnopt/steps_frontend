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
import { useStepsData } from '../hooks/useStepsData';

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
  const stepsQuery = useStepsData();
  const mapRef = useRef(null);
  const positionMarkerRef = useRef(null);
  const photoMarkerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gpxData, setGpxData] = useState(null);
  const [walkMetadata, setWalkMetadata] = useState(null);
  const [hasFadedIn, setHasFadedIn] = useState(false);
  const [showSpinner, setShowSpinner] = useState(true);
  const fadeTimeoutRef = useRef(null);
  const [imageMetadata, setImageMetadata] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [waypoints, setWaypoints] = useState([]);
  const poiMarkersRef = useRef([]);



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

  // Add POI markers to the map
  const addPOIMarkers = (map, waypoints) => {
    // Clean up existing POI markers
    poiMarkersRef.current.forEach(marker => marker.remove());
    poiMarkersRef.current = [];

    waypoints.forEach((waypoint, index) => {
      const getPoiIcon = (type) => {
        const iconMap = {
          bird: '🦅',
          wildlife: '🦌',
          insect: '🦋',
          flower: '🌸',
          tree: '🌳',
          view: '🏔️',
          water: '🏞️',
          landmark: '🏛️',
          photo: '📸',
          picnic: '🧺',
          rest: '🪑',
          trail: '🥾',
          memory: '💭',
          lost: '❗',
          building: '🏠',
          // Legacy types from old system
          plant: '🌿',
          bug: '🐛'
        };
        return iconMap[type] || '📍';
      };

      // Create marker element
      const markerElement = document.createElement('div');
      markerElement.className = 'poi-marker';
      markerElement.innerHTML = getPoiIcon(waypoint.type);
      markerElement.style.cursor = 'pointer';
      markerElement.style.fontSize = '20px';
      markerElement.style.textShadow = '0 0 3px rgba(0,0,0,0.8)';

      // Create and add the marker
      const marker = new mapboxgl.Marker({
        element: markerElement,
      })
        .setLngLat([waypoint.lng, waypoint.lat])
        .addTo(map);

      // Add click event to show popup
      markerElement.addEventListener('click', () => {
        // Use comment (POI name) if available, otherwise fall back to type
        const displayName = waypoint.comment && waypoint.comment.trim() 
          ? waypoint.comment.trim()
          : waypoint.type.charAt(0).toUpperCase() + waypoint.type.slice(1);
          
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setLngLat([waypoint.lng, waypoint.lat])
          .setHTML(`
            <div style="font-family: sf; color: #333;">
              <div style="font-weight: bold; margin-bottom: 5px;">
                ${getPoiIcon(waypoint.type)} ${displayName}
              </div>
              ${waypoint.description && waypoint.description.trim() ? `<div style="margin-bottom: 5px;">${waypoint.description.trim()}</div>` : ''}
              ${waypoint.time ? `<div style="font-size: 0.8em; color: #888; margin-bottom: 5px;">
                ${new Date(waypoint.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>` : ''}
              <div style="font-size: 0.8em; color: #666;">
                ${waypoint.lat.toFixed(6)}, ${waypoint.lng.toFixed(6)}
                ${waypoint.ele ? ` • ${Math.round(waypoint.ele)}m` : ''}
              </div>
            </div>
          `)
          .addTo(map);
      });

      poiMarkersRef.current.push(marker);
    });
  };
  
  // Load walk metadata from steps data
  useEffect(() => {
    if (stepsQuery.data && location.state?.walkFile) {
      // Find the walk metadata from the steps data
      const walkFile = location.state.walkFile;
      
      // Search through all dates to find the walk
      for (const dayEntry of stepsQuery.data) {
        if (dayEntry.walks && dayEntry.walks.length > 0) {
          const walk = dayEntry.walks.find(w => w.filename === walkFile);
          if (walk) {
            setWalkMetadata(walk);
            break;
          }
        }
      }
    }
  }, [stepsQuery.data, location.state?.walkFile]);

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

        // Parse with fast-xml-parser to extract waypoints
        const xmlParser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: "@_",
          parseAttributeValue: true
        });
        const xmlResult = xmlParser.parse(gpxText);
        
        // Extract waypoints (POIs) from GPX
        const extractedWaypoints = [];
        if (xmlResult.gpx && xmlResult.gpx.wpt) {
          const wptArray = Array.isArray(xmlResult.gpx.wpt) ? xmlResult.gpx.wpt : [xmlResult.gpx.wpt];
          
          wptArray.forEach(wpt => {
            if (wpt['@_lat'] && wpt['@_lon']) {
              const waypoint = {
                lat: parseFloat(wpt['@_lat']),
                lng: parseFloat(wpt['@_lon']),
                ele: wpt.ele ? parseFloat(wpt.ele) : undefined,
                comment: wpt.cmt || '',
                description: wpt.desc || '',
                time: wpt.time || null,
              };
              
              // Use explicit type field if available (for newer GPX files), otherwise fall back to keyword detection
              if (wpt.type) {
                waypoint.type = wpt.type;
              } else {
                // Legacy: Determine POI type from comment or description for older files
                const commentLower = (waypoint.comment || '').toLowerCase();
                const descLower = (waypoint.description || '').toLowerCase();
                
                // Check for specific POI types based on keywords in comment/description
                if (commentLower.includes('bird') || descLower.includes('bird')) {
                  waypoint.type = 'bird';
                } else if (commentLower.includes('wildlife') || descLower.includes('wildlife')) {
                  waypoint.type = 'wildlife';
                } else if (commentLower.includes('insect') || commentLower.includes('bug') || descLower.includes('insect') || descLower.includes('bug')) {
                  waypoint.type = 'insect';
                } else if (commentLower.includes('flower') || descLower.includes('flower')) {
                  waypoint.type = 'flower';
                } else if (commentLower.includes('tree') || descLower.includes('tree')) {
                  waypoint.type = 'tree';
                } else if (commentLower.includes('view') || commentLower.includes('scenic') || descLower.includes('view') || descLower.includes('scenic')) {
                  waypoint.type = 'view';
                } else if (commentLower.includes('water') || descLower.includes('water')) {
                  waypoint.type = 'water';
                } else if (commentLower.includes('landmark') || descLower.includes('landmark')) {
                  waypoint.type = 'landmark';
                } else if (commentLower.includes('photo') || descLower.includes('photo')) {
                  waypoint.type = 'photo';
                } else if (commentLower.includes('picnic') || descLower.includes('picnic')) {
                  waypoint.type = 'picnic';
                } else if (commentLower.includes('rest') || descLower.includes('rest')) {
                  waypoint.type = 'rest';
                } else if (commentLower.includes('trail') || descLower.includes('trail')) {
                  waypoint.type = 'trail';
                } else if (commentLower.includes('memory') || descLower.includes('memory')) {
                  waypoint.type = 'memory';
                } else if (commentLower.includes('lost') || descLower.includes('lost')) {
                  waypoint.type = 'lost';
                } else if (commentLower.includes('building') || descLower.includes('building')) {
                  waypoint.type = 'building';
                } else if (commentLower.includes('plant') || descLower.includes('plant')) {
                  waypoint.type = 'plant';
                } else {
                  waypoint.type = 'unknown';
                }
              }
              
              extractedWaypoints.push(waypoint);
            }
          });
        }
        
        console.log('Extracted waypoints:', extractedWaypoints);
        setWaypoints(extractedWaypoints);
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
      
      {gpxData && gpxData.tracks[0].points[0].time && (
        <div className="walk-date-overlay">
          <div className="date">
            {new Date(gpxData.tracks[0].points[0].time).toLocaleDateString('en-US', {
              weekday: 'short',
              day: 'numeric',
              month: 'short'
            })}
          </div>
          <div className="time">
            {new Date(gpxData.tracks[0].points[0].time).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: false
            })} - {new Date(gpxData.tracks[0].points[gpxData.tracks[0].points.length - 1].time).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: false
            })}
          </div>
        </div>
      )}
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

          // Add POI markers if waypoints exist
          if (waypoints && waypoints.length > 0) {
            addPOIMarkers(map, waypoints);
          }
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

            // Re-add POI markers
            if (waypoints && waypoints.length > 0) {
              addPOIMarkers(map, waypoints);
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

      <WalkViewDetails gpxData={gpxData} walkMetadata={walkMetadata} waypoints={waypoints} />

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