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
          </style>
        </head>
        <body>
          <div id="map"></div>
          <div id="locate-button" class="locate-button">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V2c0-.55-.45-1-1-1s-1 .45-1 1v1.06C6.83 3.52 3.52 6.83 3.06 11H2c-.55 0-1 .45-1 1s.45 1 1 1h1.06c.46 4.17 3.77 7.48 7.94 7.94V22c0 .55.45 1 1 1s1-.45 1-1v-1.06c4.17-.46 7.48-3.77 7.94-7.94H22c.55 0 1-.45 1-1s-.45-1-1-1h-1.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
            </svg>
          </div>
          <script>
            // Initialize map with center based on props
            const initialLat = ${currentLocation ? currentLocation.latitude : initialLocation.latitude};
            const initialLng = ${currentLocation ? currentLocation.longitude : initialLocation.longitude};
            
            const map = L.map('map').setView([initialLat, initialLng], ${zoomLevel});
            
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
              const customIcon = L.divIcon({
                className: 'custom-marker',
                html: \`<div style="background-color: \${marker.color}; width: \${marker.size || 30}px; height: \${marker.size || 30}px; display: flex; justify-content: center; align-items: center;"><span>\${marker.icon ? marker.icon : ''}</span></div>\`,
                iconSize: [marker.size || 30, marker.size || 30]
              });

              const leafletMarker = L.marker([marker.latitude, marker.longitude], {
                title: marker.title,
                icon: customIcon
              });

              if (${showLabels}) {
                leafletMarker.bindTooltip(marker.title, {
                  permanent: true, 
                  direction: 'top'
                });
              }

              leafletMarker.on('click', () => {
                window.parent.postMessage(JSON.stringify({
                  type: 'markerClick',
                  marker: marker
                }), '*');
              });

              leafletMarker.addTo(map);
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
  }, [markers, initialLocation, zoomLevel, showLabels, currentLocation, showCurrentLocation]);

  // Handle messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        // Handle both string and object data formats
        const data = typeof event.data === 'string' 
          ? JSON.parse(event.data) 
          : event.data;

        if (data.type === 'markerClick' && onMarkerPress) {
          onMarkerPress(data.marker);
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