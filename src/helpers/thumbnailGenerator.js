import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = "pk.eyJ1IjoiY25vcHQiLCJhIjoiY21kZjVqcWE2MDhvNzJtcjFrdzVkeWZmOSJ9.6YvvBMhtSYQlWWebyg25eQ";

export const generateWalkThumbnail = async (gpxSegments, fileName) => {
  return new Promise((resolve, reject) => {
    try {
      // Extract all coordinates from segments
      const allCoords = [];
      gpxSegments.forEach(segment => {
        segment.forEach(point => {
          if (typeof point.lat === 'number' && typeof point.lon === 'number') {
            allCoords.push([point.lon, point.lat]);
          }
        });
      });

      if (allCoords.length === 0) {
        reject(new Error('No valid coordinates found'));
        return;
      }

      // Calculate bounding box with padding
      const lngs = allCoords.map(coord => coord[0]);
      const lats = allCoords.map(coord => coord[1]);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);

      // Add 20% padding like in WalkView
      const lngDiff = maxLng - minLng;
      const latDiff = maxLat - minLat;
      const lngPadding = (lngDiff * 20) / 100;
      const latPadding = (latDiff * 20) / 100;

      const bounds = new mapboxgl.LngLatBounds([
        [minLng - lngPadding, minLat - latPadding],
        [maxLng + lngPadding, maxLat + latPadding]
      ]);

      // Create hidden canvas element for rendering
      const canvas = document.createElement('canvas');
      canvas.width = 400;  // Thumbnail size
      canvas.height = 400;
      canvas.style.display = 'none';
      document.body.appendChild(canvas);

      // Create headless map
      const map = new mapboxgl.Map({
        container: canvas,
        style: 'mapbox://styles/mapbox/outdoors-v12', // Good for walk thumbnails
        bounds: bounds,
        fitBoundsOptions: { padding: 20 },
        preserveDrawingBuffer: true, // Essential for canvas export
        antialias: true,
        attributionControl: false,
        logoControl: false,
        interactive: false
      });

      map.on('load', () => {
        // Add the walk path
        map.addSource('walkPath', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: allCoords
            }
          }
        });

        // Style the path for thumbnail (more visible)
        map.addLayer({
          id: 'walkPathLine',
          type: 'line',
          source: 'walkPath',
          paint: {
            'line-color': '#2da1ff',
            'line-width': 4,
            'line-opacity': 1
          }
        });

        // Add start/end markers
        if (allCoords.length > 0) {
          // Start marker (green)
          map.addSource('startPoint', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: allCoords[0]
              }
            }
          });

          map.addLayer({
            id: 'startMarker',
            type: 'circle',
            source: 'startPoint',
            paint: {
              'circle-radius': 6,
              'circle-color': '#4CAF50',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          });

          // End marker (red) - if different from start
          if (allCoords.length > 1) {
            const endCoord = allCoords[allCoords.length - 1];
            if (endCoord[0] !== allCoords[0][0] || endCoord[1] !== allCoords[0][1]) {
              map.addSource('endPoint', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: endCoord
                  }
                }
              });

              map.addLayer({
                id: 'endMarker',
                type: 'circle',
                source: 'endPoint',
                paint: {
                  'circle-radius': 6,
                  'circle-color': '#f44336',
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#ffffff'
                }
              });
            }
          }
        }

        // Wait for rendering to complete, then capture
        map.once('idle', () => {
          try {
            // Get canvas as base64 data URL
            const imageData = map.getCanvas().toDataURL('image/png', 0.9);
            
            // Cleanup
            document.body.removeChild(canvas);
            map.remove();
            
            resolve({
              imageData,
              fileName: fileName.replace('.gpx', '.png')
            });
          } catch (err) {
            document.body.removeChild(canvas);
            map.remove();
            reject(err);
          }
        });
      });

      map.on('error', (err) => {
        document.body.removeChild(canvas);
        reject(err);
      });

    } catch (err) {
      reject(err);
    }
  });
};
