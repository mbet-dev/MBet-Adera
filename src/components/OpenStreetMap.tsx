import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Platform, 
  TouchableOpacity, 
  Alert, 
  Text 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  color: string;
  size?: number;
  icon?: string;
  zIndex?: number;
  description?: string;
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

// Import platform-specific components
let MapView: any;
let Marker: any;
let WebView: any;

// Native-specific imports
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
} else {
  // Web-specific imports
  WebView = require('react-native-webview').default;
}

// Export a forwardRef version of the OpenStreetMap component
export const OpenStreetMap = React.forwardRef<
  { centerOnLocation: (location: { latitude: number; longitude: number }) => void },
  OpenStreetMapProps
>(({
  markers,
  initialLocation,
  onMarkerPress,
  onMapPress,
  style,
  zoomLevel = 12,
  showLabels = false,
  showCurrentLocation = false,
}, ref) => {
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  
  // Get user's current location
  useEffect(() => {
    if (showCurrentLocation) {
      getCurrentLocation();
    }
  }, [showCurrentLocation]);

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Permission to access location was denied');
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  // Create refs for native and web map implementations
  const nativeMapRef = React.useRef<any>(null);
  const webViewRef = React.useRef<any>(null);

  // Calculate delta based on zoom level (lower delta = higher zoom)
  const getRegionForZoomLevel = (location: typeof initialLocation, zoom: number) => {
    const latitudeDelta = 0.0922 / (zoom / 10);
    const longitudeDelta = 0.0421 / (zoom / 10);
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta,
      longitudeDelta,
    };
  };

  // Center the map on a specific location
  const centerOnLocation = (location: {latitude: number, longitude: number}) => {
    if (Platform.OS !== 'web' && nativeMapRef.current) {
      // Native platform - use the native map reference
      const region = getRegionForZoomLevel(location, zoomLevel);
      nativeMapRef.current.animateToRegion(region, 500);
    } else if (Platform.OS === 'web' && webViewRef.current) {
      // Web platform - use the WebView reference
      webViewRef.current.injectJavaScript(`
        if (typeof map !== 'undefined') {
          map.setView([${location.latitude}, ${location.longitude}], ${zoomLevel});
        }
        true;
      `);
    }
  };

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    centerOnLocation
  }));

  // Initialize browser geolocation when component mounts
  useEffect(() => {
    if (Platform.OS === 'web' && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (typeof initBrowserGeolocation === 'function') {
          initBrowserGeolocation();
        }
        true;
      `);
    }
  }, []);

  // Platform-specific implementation
  if (Platform.OS !== 'web') {
    return <NativeMap 
      ref={nativeMapRef}
      markers={markers} 
      initialLocation={initialLocation}
      currentLocation={currentLocation}
      onMarkerPress={onMarkerPress}
      onMapPress={onMapPress}
      showLabels={showLabels}
      zoomLevel={zoomLevel}
      showCurrentLocation={showCurrentLocation}
      style={style}
      getCurrentLocation={getCurrentLocation}
    />;
  } else {
    return <WebMap 
      ref={webViewRef}
      markers={markers} 
      initialLocation={initialLocation}
      currentLocation={currentLocation}
      onMarkerPress={onMarkerPress}
      onMapPress={onMapPress}
      showLabels={showLabels}
      zoomLevel={zoomLevel}
      style={style}
      getCurrentLocation={getCurrentLocation}
    />;
  }
});

// Native implementation - convert to forwardRef
const NativeMap = React.forwardRef<any, OpenStreetMapProps & { 
  currentLocation: {latitude: number, longitude: number} | null;
  getCurrentLocation: () => Promise<void>;
}>((props, ref) => {
  const { 
    markers, 
    initialLocation, 
    currentLocation, 
    onMarkerPress, 
    onMapPress,
    showLabels,
    zoomLevel,
    showCurrentLocation,
    style,
    getCurrentLocation
  } = props;

  // Calculate delta based on zoom level (lower delta = higher zoom)
  const getRegionForZoomLevel = (location: typeof initialLocation, zoom: number) => {
    const latitudeDelta = 0.0922 / (zoom / 10);
    const longitudeDelta = 0.0421 / (zoom / 10);
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta,
      longitudeDelta,
    };
  };

  // Use current location for initial region if available
  const locationToUse = currentLocation || initialLocation;
  const region = getRegionForZoomLevel(locationToUse, zoomLevel || 12);

  // Function to center the map on current location
  const centerOnCurrentLocation = () => {
    if (currentLocation && ref && typeof ref !== 'function') {
      const region = getRegionForZoomLevel(currentLocation, zoomLevel || 12);
      if (ref.current) {
        ref.current.animateToRegion(region, 500);
      }
    } else {
      getCurrentLocation();
    }
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={ref}
        style={styles.map}
        provider="google"
        initialRegion={region}
        onPress={(e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => 
          onMapPress && onMapPress(e.nativeEvent.coordinate)
        }
      >
        {/* Regular markers */}
        {markers.map((marker) => {
          // Check if this is the MBet-Adera Sorting Facility Hub
          const isSortingFacility = marker.description?.includes('MBet-Adera Sorting Facility Hub') || 
                                   marker.title?.includes('Sorting Facility');
          
          // Use black color specifically for sorting facility
          const markerColor = isSortingFacility ? '#000000' : marker.color;
          
          return (
            <Marker
              key={marker.id}
              coordinate={{
                latitude: marker.latitude,
                longitude: marker.longitude,
              }}
              title={marker.title}
              description={marker.description}
              onPress={() => onMarkerPress && onMarkerPress(marker)}
              zIndex={marker.zIndex}
            >
              <View>
                {/* Marker icon/circle */}
                <View style={[
                  styles.markerContainer, 
                  { 
                    backgroundColor: markerColor,
                    width: marker.size || 30,
                    height: marker.size || 30,
                    borderRadius: (marker.size || 30) / 2,
                  }
                ]}>
                  {marker.icon ? (
                    <MaterialIcons 
                      name={marker.icon as any} 
                      size={(marker.size || 30) * 0.6} 
                      color="#FFF" 
                    />
                  ) : (
                    <Text style={styles.markerText}>{marker.title}</Text>
                  )}
                </View>
                
                {/* Caption below the marker */}
                {showLabels && (
                  <View style={styles.captionContainer}>
                    <Text style={[
                      styles.captionText,
                      isSortingFacility ? styles.sortingFacilityCaption : null
                    ]}>
                      {isSortingFacility ? 'MBet-Adera Sorting Facility' : marker.title}
                    </Text>
                  </View>
                )}
              </View>
            </Marker>
          );
        })}
        
        {/* Current location marker (blue dot) */}
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="Your Location"
          >
            <View style={styles.currentLocationMarker}>
              <View style={styles.currentLocationDot} />
            </View>
          </Marker>
        )}
      </MapView>
      
      {/* Map controls (recenter button) */}
      <TouchableOpacity
        style={styles.recenterButton}
        onPress={centerOnCurrentLocation}
      >
        <MaterialIcons name="my-location" size={20} color="#4CAF50" />
      </TouchableOpacity>
    </View>
  );
});

// Web implementation - convert to forwardRef
const WebMap = React.forwardRef<any, OpenStreetMapProps & { 
  currentLocation: {latitude: number, longitude: number} | null;
  getCurrentLocation: () => Promise<void>;
}>((props, ref) => {
  const {
    markers, 
    initialLocation,
    currentLocation,
    onMarkerPress, 
    onMapPress,
    showLabels,
    zoomLevel,
    style,
    getCurrentLocation
  } = props;
  const [locationRequested, setLocationRequested] = useState(false);
  const [browserLocation, setBrowserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  
  // Transfer ref
  React.useImperativeHandle(ref, () => ({
    injectJavaScript: (script: string) => {
      if (ref && typeof ref !== 'function' && ref.current) {
        ref.current.injectJavaScript(script);
      }
    }
  }));
  
  // Initialize browser geolocation immediately
  useEffect(() => {
    if (ref && typeof ref !== 'function' && ref.current) {
      ref.current.injectJavaScript(`
        if (typeof initBrowserGeolocation === 'function') {
          initBrowserGeolocation();
        }
        true;
      `);
    }
  }, []);
  
  // Build HTML for web-based map
  const getMapHTML = () => {
    const markersJson = JSON.stringify(markers.map(marker => {
      // Check if this is the MBet-Adera Sorting Facility Hub
      const isSortingFacility = marker.description?.includes('MBet-Adera Sorting Facility Hub') || 
                                marker.title?.includes('Sorting Facility');
                                
      // Use black color specifically for sorting facility
      const markerColor = isSortingFacility ? '#000000' : marker.color;
      
      return {
        id: marker.id,
        latitude: marker.latitude,
        longitude: marker.longitude,
        title: marker.title,
        color: markerColor,
        size: marker.size || 30,
        icon: marker.icon,
        zIndex: marker.zIndex || 1,
        description: marker.description || '',
        isSortingFacility
      };
    }));

    const currentLocationJson = currentLocation ? 
      JSON.stringify(currentLocation) : 'null';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
        <style>
          body, html, #map {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
          }
          .marker-pin {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 5px rgba(0,0,0,0.3);
            color: white;
            font-weight: bold;
            text-align: center;
          }
          .current-location {
            background-color: #007AFF;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 0 7px rgba(0,0,0,0.5);
          }
          .current-location-pulse {
            background-color: rgba(0, 122, 255, 0.2);
            border-radius: 50%;
            position: absolute;
            transform: translate(-50%, -50%);
            z-index: -1;
          }
          .marker-popup-content {
            padding: 8px;
          }
          .marker-popup-title {
            font-weight: bold;
            margin-bottom: 5px;
          }
          .marker-popup-description {
            font-size: 12px;
            color: #666;
          }
          .marker-caption {
            background-color: rgba(255, 255, 255, 0.8);
            color: #000;
            padding: 2px 4px;
            font-size: 10px;
            border-radius: 4px;
            text-align: center;
            font-weight: bold;
            margin-top: 2px;
            white-space: nowrap;
            max-width: 100px;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .sorting-facility-caption {
            color: #000;
            font-weight: bold;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const markers = ${markersJson};
          const currentLocation = ${currentLocationJson};
          const initialLocation = ${JSON.stringify(initialLocation)};
          const zoomLevel = ${zoomLevel};
          const showLabels = ${showLabels};

          // Initialize the map
          const map = L.map('map').setView([initialLocation.latitude, initialLocation.longitude], zoomLevel);
          
          // Add OpenStreetMap tile layer
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(map);

          // Add markers
          markers.forEach(marker => {
            // Create marker element
            const markerSize = marker.size;
            
            // Determine caption text
            const captionText = marker.isSortingFacility 
              ? 'MBet-Adera Sorting Facility'
              : marker.title;
              
            // Add caption class
            const captionClass = marker.isSortingFacility
              ? 'marker-caption sorting-facility-caption'
              : 'marker-caption';
            
            const markerIcon = L.divIcon({
              className: '',
              iconSize: [markerSize, markerSize + 20], // Added height for caption
              iconAnchor: [markerSize/2, markerSize/2],
              html: \`
                <div style="display: flex; flex-direction: column; align-items: center;">
                  <div 
                    class="marker-pin" 
                    style="
                      background-color: \${marker.color}; 
                      width: \${markerSize}px; 
                      height: \${markerSize}px;
                      line-height: \${markerSize}px;
                      z-index: \${marker.zIndex || 1};
                    "
                  >
                    \${marker.title && marker.title.substring(0, 2)}
                  </div>
                  <div class="\${captionClass}">\${captionText}</div>
                </div>
              \`
            });
            
            // Create popup content with title and description
            const popupContent = \`
              <div class="marker-popup-content">
                <div class="marker-popup-title">\${marker.title}</div>
                \${marker.description ? \`<div class="marker-popup-description">\${marker.description}</div>\` : ''}
              </div>
            \`;

            // Add marker to map
            const mapMarker = L.marker([marker.latitude, marker.longitude], { 
              icon: markerIcon,
              zIndexOffset: marker.zIndex || 0
            }).addTo(map);
            
            // Only show popup with title and description on click
            mapMarker.bindPopup(popupContent);
            
            // Handle marker click
            mapMarker.on('click', () => {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'markerPress',
                markerId: marker.id
              }));
            });
          });

          // Function to initialize browser geolocation with high accuracy
          function initBrowserGeolocation() {
            if (navigator.geolocation) {
              // Set up a watch for location updates with high accuracy
              navigator.geolocation.watchPosition(
                function(position) {
                  const lat = position.coords.latitude;
                  const lng = position.coords.longitude;
                  const accuracy = position.coords.accuracy;
                  
                  // Send location back to React Native
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'locationUpdate',
                    latitude: lat,
                    longitude: lng,
                    accuracy: accuracy
                  }));
                  
                  // Update or create the user location marker
                  updateUserLocationMarker(lat, lng, accuracy);
                },
                function(error) {
                  console.error('Error getting browser location:', error);
                  // Try to fall back to the React Native provided location
                  if (${currentLocation ? 'true' : 'false'}) {
                    updateUserLocationMarker(
                      ${currentLocation ? currentLocation.latitude : 0}, 
                      ${currentLocation ? currentLocation.longitude : 0}, 
                      100
                    );
                  }
                },
                { 
                  enableHighAccuracy: true, 
                  maximumAge: 0, 
                  timeout: 5000 
                }
              );
            }
          }
          
          // Update the user location marker on the map
          function updateUserLocationMarker(lat, lng, accuracy) {
            if (userLocationMarker) {
              userLocationMarker.setLatLng([lat, lng]);
              if (userLocationAccuracy) {
                userLocationAccuracy.setLatLng([lat, lng]);
                userLocationAccuracy.setRadius(accuracy);
              }
            } else {
              // Create a custom user location marker
              const userIcon = L.divIcon({
                className: 'user-marker',
                html: '<div class="user-marker-pulse"></div><div class="user-marker-dot"></div>',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
              });
              
              userLocationMarker = L.marker([lat, lng], { 
                icon: userIcon,
                zIndexOffset: 1000
              }).addTo(map);
              
              userLocationMarker.bindTooltip('You', { permanent: ${showLabels} });
              
              // Add accuracy circle
              userLocationAccuracy = L.circle([lat, lng], {
                radius: accuracy,
                color: '#ff3b30',
                fillColor: '#ff3b30',
                fillOpacity: 0.15,
                weight: 1
              }).addTo(map);
            }
          }
          
          // Handle map clicks
          map.on('click', function(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapClick',
              latitude: e.latlng.lat,
              longitude: e.latlng.lng
            }));
          });
          
          // Function to center on user location
          function centerOnUserLocation() {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                function(position) {
                  // Center the map on user's location with accurate zoom
                  map.setView([position.coords.latitude, position.coords.longitude], 16);
                  
                  // Update the location marker
                  updateUserLocationMarker(
                    position.coords.latitude, 
                    position.coords.longitude,
                    position.coords.accuracy
                  );
                },
                function(error) {
                  console.error('Error centering on location:', error);
                  // Let the user know there was an error
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'locationError',
                    message: error.message
                  }));
                },
                { 
                  enableHighAccuracy: true, 
                  maximumAge: 0, 
                  timeout: 5000 
                }
              );
            }
          }
        </script>
      </body>
      </html>
    `;
  };

  // Handle messages from WebView
  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'markerPress' && onMarkerPress) {
        const marker = markers.find(m => m.id === data.markerId);
        if (marker) {
          onMarkerPress(marker);
        }
      } else if (data.type === 'mapClick' && onMapPress) {
        onMapPress({
          latitude: data.latitude,
          longitude: data.longitude
        });
      } else if (data.type === 'locationUpdate') {
        // Update the React Native state with browser location
        setBrowserLocation({
          latitude: data.latitude,
          longitude: data.longitude
        });
      } else if (data.type === 'locationError') {
        console.error('Browser location error:', data.message);
        Alert.alert('Location Error', 'Unable to get your precise location. Try enabling location services in your browser settings.');
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  // Center map on user's location
  const centerOnCurrentLocation = () => {
    setLocationRequested(true);
    if (ref && typeof ref !== 'function' && ref.current) {
      ref.current.injectJavaScript(`
        if (typeof centerOnUserLocation === 'function') {
          centerOnUserLocation();
        }
        true;
      `);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={ref}
        originWhitelist={['*']}
        source={{ html: getMapHTML() }}
        style={styles.map}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
      />
      
      <TouchableOpacity 
        style={styles.locationButton} 
        onPress={centerOnCurrentLocation}
      >
        <View style={styles.locationButtonInner}>
          <MaterialIcons name="my-location" size={24} color="#007AFF" />
        </View>
      </TouchableOpacity>
      
      {locationRequested && (
        <View style={styles.permissionNote}>
          <Text style={styles.permissionText}>
            Please allow location access in your browser if prompted
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    overflow: 'hidden',
  },
  markerText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'white',
  },
  calloutContainer: {
    width: 140,
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 8,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  calloutDescription: {
    fontSize: 12,
    color: '#666',
  },
  currentLocationMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  currentLocationPulse: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  currentLocationDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    borderWidth: 3,
    borderColor: 'white',
  },
  locationButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionNote: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 10,
    zIndex: 1000,
  },
  permissionText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
  captionContainer: {
    alignItems: 'center',
    marginTop: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  captionText: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sortingFacilityCaption: {
    color: '#000000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  recenterButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
}); 