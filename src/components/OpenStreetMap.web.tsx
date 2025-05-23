import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Location from 'expo-location';

interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  color: string;
  size?: number;
  icon?: string;
  description?: string;
  zIndex?: number;
}

export interface OpenStreetMapProps {
  markers: MarkerData[];
  initialLocation: {
    latitude: number;
    longitude: number;
  };
  onMarkerPress?: (marker: MarkerData) => void;
  onMapPress?: (location: { latitude: number; longitude: number }) => void;
  style?: any;
  zoomLevel?: number;
  showLabels?: boolean;
  showCurrentLocation?: boolean;
  showZoomControls?: boolean;
  hideIndicator?: boolean;
}

export function OpenStreetMap({
  markers,
  initialLocation,
  onMarkerPress,
  onMapPress,
  style,
  zoomLevel = 12,
  showLabels = false,
  showCurrentLocation = false,
  showZoomControls = true,
  hideIndicator = false,
}: OpenStreetMapProps) {
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [mapHtml, setMapHtml] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Get user's current location
  useEffect(() => {
    if (showCurrentLocation) {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permission to access location was denied');
          return;
        }

        try {
          // Request high accuracy location with faster updates
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
            mayShowUserSettingsDialog: true,
          });
          
          console.log("Web location obtained:", location.coords);
          
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
          
          // Set up continuous location updates
          const watchId = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              distanceInterval: 10, // Update if moved at least 10 meters
              timeInterval: 5000, // Update at least every 5 seconds
            },
            (location) => {
              console.log("Web location updated:", location.coords);
              setCurrentLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
              });
            }
          );
          
          return () => {
            // Clean up the subscription
            watchId.remove();
          };
        } catch (error) {
          console.error('Error getting location:', error);
        }
      })();
    }
  }, [showCurrentLocation]);

  // Generate HTML for the map
  useEffect(() => {
    console.log("Rendering map with markers:", markers);
    console.log("Current location:", currentLocation);
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            #map { 
              height: 100%; 
              width: 100%; 
            }
            body { 
              margin: 0; 
              padding: 0; 
            }
            html, body { 
              height: 100%; 
              width: 100%;
            }
            .custom-marker {
              display: flex;
              justify-content: center;
              align-items: center;
              color: white;
              font-weight: bold;
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 0 5px rgba(0,0,0,0.3);
            }
            .current-location-marker {
              display: flex;
              justify-content: center;
              align-items: center;
              background-color: #ff3b30;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 0 5px rgba(0,0,0,0.5);
            }
            .current-location-pulse {
              background-color: rgba(255, 59, 48, 0.2);
              border-radius: 50%;
              height: 40px;
              width: 40px;
              position: absolute;
              left: -10px;
              top: -10px;
              animation: pulse 2s infinite;
            }
            @keyframes pulse {
              0% {
                transform: scale(0.5);
                opacity: 0.5;
              }
              70% {
                transform: scale(1.5);
                opacity: 0;
              }
              100% {
                transform: scale(0.5);
                opacity: 0;
              }
            }
            .locate-button {
              position: absolute;
              bottom: 30px;
              right: 10px;
              background-color: white;
              width: 40px;
              height: 40px;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 1000;
              box-shadow: 0 2px 5px rgba(0,0,0,0.3);
              cursor: pointer;
            }
            .locate-button svg {
              fill: #3880ff;
              width: 24px;
              height: 24px;
            }
            .locate-button:hover {
              background-color: #f5f5f5;
            }
            .zoom-controls {
              position: absolute;
              bottom: 30px;
              left: 10px;
              display: flex;
              flex-direction: column;
              z-index: 1000;
            }
            .zoom-button {
              background-color: white;
              width: 40px;
              height: 40px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 5px rgba(0,0,0,0.3);
              cursor: pointer;
              font-size: 24px;
              font-weight: bold;
            }
            .zoom-button:first-child {
              border-top-left-radius: 4px;
              border-top-right-radius: 4px;
              border-bottom: 1px solid #eee;
            }
            .zoom-button:last-child {
              border-bottom-left-radius: 4px;
              border-bottom-right-radius: 4px;
            }
            .zoom-button:hover {
              background-color: #f5f5f5;
            }
            .content-indicator {
              position: absolute;
              bottom: 80px;
              left: 50%;
              transform: translateX(-50%);
              background-color: rgba(0, 0, 0, 0.7);
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              z-index: 999;
              display: none; /* Always hidden on web */
              flex-direction: column;
              align-items: center;
              pointer-events: none;
            }
            .indicator-bar {
              width: 40px;
              height: 4px;
              background-color: white;
              border-radius: 2px;
              margin-bottom: 5px;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <div id="locate-button" class="locate-button">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V2c0-.55-.45-1-1-1s-1 .45-1 1v1.06C6.83 3.52 3.52 6.83 3.06 11H2c-.55 0-1 .45-1 1s.45 1 1 1h1.06c.46 4.17 3.77 7.48 7.94 7.94V22c0 .55.45 1 1 1s1-.45 1-1v-1.06c4.17-.46 7.48-3.77 7.94-7.94H22c.55 0 1-.45 1-1s-.45-1-1-1h-1.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
            </svg>
          </div>
          ${showZoomControls ? `
          <div class="zoom-controls">
            <div id="zoom-in" class="zoom-button">+</div>
            <div id="zoom-out" class="zoom-button">-</div>
          </div>
          ` : ''}
          <script>
            // Initialize map with center based on props
            const initialLat = ${currentLocation ? currentLocation.latitude : initialLocation.latitude};
            const initialLng = ${currentLocation ? currentLocation.longitude : initialLocation.longitude};
            
            const map = L.map('map', {
              zoomControl: false // Disable the default zoom control
            }).setView([initialLat, initialLng], ${zoomLevel});
            
            // Add OpenStreetMap tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);

            // Variables for location tracking
            let currentLocationMarker;
            let currentLocationCircle;
            let isFollowingLocation = false;
            let currentPosition = null;
            
            // Set up the locate button click handler
            document.getElementById('locate-button').addEventListener('click', function() {
              if (currentPosition) {
                map.setView([currentPosition.latitude, currentPosition.longitude], ${zoomLevel});
              } else {
                beginLocationTracking();
              }
            });

            ${showZoomControls ? `
            // Set up zoom control handlers
            document.getElementById('zoom-in').addEventListener('click', function() {
              map.zoomIn();
            });
            
            document.getElementById('zoom-out').addEventListener('click', function() {
              map.zoomOut();
            });
            ` : ''}

            // Function to add or update the current location marker
            function updateLocationMarker(position) {
              currentPosition = position;
              
              const lat = position.latitude;
              const lng = position.longitude;
              
              if (!currentLocationMarker) {
                // Create a custom marker for current location
                const currentLocationIcon = L.divIcon({
                  className: 'current-location-container',
                  html: \`
                    <div class="current-location-pulse"></div>
                    <div class="current-location-marker"></div>
                  \`,
                  iconSize: [20, 20]
                });
                
                currentLocationMarker = L.marker([lat, lng], {
                  title: "Your location",
                  icon: currentLocationIcon,
                  zIndexOffset: 1000
                }).addTo(map);
                
                // Add accuracy circle
                if (position.accuracy) {
                  currentLocationCircle = L.circle([lat, lng], {
                    radius: position.accuracy,
                    fillColor: 'rgba(255, 59, 48, 0.1)',
                    fillOpacity: 0.3,
                    stroke: false
                  }).addTo(map);
                }
                
                // Center map on first position
                map.setView([lat, lng], ${zoomLevel});
              } else {
                // Update existing marker position
                currentLocationMarker.setLatLng([lat, lng]);
                
                // Update accuracy circle if it exists
                if (currentLocationCircle && position.accuracy) {
                  currentLocationCircle.setLatLng([lat, lng]);
                  currentLocationCircle.setRadius(position.accuracy);
                }
                
                // If following is enabled, center the map
                if (isFollowingLocation) {
                  map.setView([lat, lng]);
                }
              }
              
              // Send the location to React Native
              window.parent.postMessage(JSON.stringify({
                type: 'currentLocation',
                location: position
              }), '*');
            }
            
            // Function to start location tracking with the browser's Geolocation API
            function beginLocationTracking() {
              if (navigator.geolocation) {
                isFollowingLocation = true;
                
                // Get initial location
                navigator.geolocation.getCurrentPosition(
                  function(position) {
                    updateLocationMarker({
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude,
                      accuracy: position.coords.accuracy
                    });
                  },
                  function(error) {
                    console.error('Geolocation error:', error);
                  },
                  {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                  }
                );
                
                // Start watching location
                const watchId = navigator.geolocation.watchPosition(
                  function(position) {
                    updateLocationMarker({
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude,
                      accuracy: position.coords.accuracy
                    });
                  },
                  function(error) {
                    console.error('Geolocation watch error:', error);
                  },
                  {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                  }
                );
                
                // Save watchId to potentially clear it later
                window.locationWatchId = watchId;
              } else {
                console.error('Geolocation is not supported by this browser.');
              }
            }
            
            // Start location tracking if enabled
            if (${showCurrentLocation}) {
              beginLocationTracking();
            }
            
            // Handle user stopping the page - clear the watch to save battery
            window.addEventListener('pagehide', function() {
              if (window.locationWatchId) {
                navigator.geolocation.clearWatch(window.locationWatchId);
              }
            });
            
            // Also add existing markers from props
            const markers = ${JSON.stringify(markers)};
            console.log("Markers to render in Leaflet:", markers);
            
            markers.forEach(marker => {
              // Default size if not specified
              const size = marker.size || 30;
              
              // Get icon based on marker type
              let iconHTML = '';
              
              // Handle different icon types (support for MaterialIcons)
              if (marker.icon === 'local-shipping') {
                // Truck icon for shipping/facility
                iconHTML = \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="\${size*0.6}" height="\${size*0.6}" fill="white">
                  <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                </svg>\`;
              } else if (marker.icon === 'add-location') {
                // Pickup point icon
                iconHTML = \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="\${size*0.6}" height="\${size*0.6}" fill="white">
                  <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm4 8h-3v3h-2v-3H8V8h3V5h2v3h3v2z"/>
                </svg>\`;
              } else if (marker.icon === 'flag') {
                // Dropoff point icon
                iconHTML = \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="\${size*0.6}" height="\${size*0.6}" fill="white">
                  <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>
                </svg>\`;
              } else if (marker.icon === 'store') {
                // Both pickup and dropoff point icon
                iconHTML = \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="\${size*0.6}" height="\${size*0.6}" fill="white">
                  <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/>
                </svg>\`;
              } else {
                // Default to showing the title text
                iconHTML = marker.title;
              }
              
              // Create a custom div icon for the marker
              const markerIcon = L.divIcon({
                className: 'custom-marker',
                html: \`<div style="
                  width: \${size}px; 
                  height: \${size}px; 
                  background-color: \${marker.color}; 
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  font-size: \${size/2}px;
                  ">\${iconHTML}</div>\`,
                iconSize: [size, size]
              });
              
              // Create the marker with the custom icon
              const leafletMarker = L.marker(
                [marker.latitude, marker.longitude], 
                { 
                  icon: markerIcon,
                  title: marker.description || marker.title,
                  zIndexOffset: marker.zIndex || 0
                }
              ).addTo(map);
              
              // Add a popup with the description if available
              if (marker.description) {
                leafletMarker.bindPopup(marker.description);
              }
              
              // Add click handler to send message to React Native
              leafletMarker.on('click', function() {
                window.parent.postMessage(JSON.stringify({
                  type: 'markerPress',
                  marker: marker
                }), '*');
              });
            });

            map.on('click', function(e) {
              window.parent.postMessage(JSON.stringify({
                type: 'mapClick',
                location: {
                  latitude: e.latlng.lat,
                  longitude: e.latlng.lng
                }
              }), '*');
            });
            
            // When the user moves the map, disable auto-following
            map.on('dragstart', function() {
              isFollowingLocation = false;
            });
          </script>
        </body>
      </html>
    `;
    setMapHtml(html);
  }, [markers, initialLocation, zoomLevel, showLabels, currentLocation, showCurrentLocation, showZoomControls, hideIndicator]);

  // Handle messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        // Handle both string and object data formats
        const data = typeof event.data === 'string' 
          ? JSON.parse(event.data) 
          : event.data;

        // Match the property names in the data explicitly
        if (data.type === 'markerPress' && onMarkerPress) {
          if (data.marker) {
            // Direct marker object
            onMarkerPress(data.marker);
          } else if (data.markerId) {
            // Find the marker by ID
            const marker = markers.find(m => m.id === data.markerId);
            if (marker) {
              onMarkerPress(marker);
            }
          }
        } else if (data.type === 'mapClick' && onMapPress) {
          onMapPress(data.location);
        } else if (data.type === 'currentLocation') {
          // Update location state with browser-provided coordinates
          setCurrentLocation(data.location);
        }
      } catch (error) {
        // Log error but don't crash
        console.error('Error handling message:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onMarkerPress, onMapPress]);

  return (
    <View style={[styles.container, style]}>
      <iframe
        ref={iframeRef}
        srcDoc={mapHtml}
        style={styles.map}
        title="OpenStreetMap"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
}); 