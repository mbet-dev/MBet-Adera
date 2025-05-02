import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocation } from '../../hooks/useLocation';

interface MapProps {
  partnerLocations?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title: string;
  }>;
  onLocationSelect?: (location: { latitude: number; longitude: number }) => void;
}

export const Map: React.FC<MapProps> = ({ partnerLocations = [], onLocationSelect }) => {
  const { location, error } = useLocation();
  const webViewRef = useRef<WebView>(null);
  const [mapHtml, setMapHtml] = useState<string>('');

  useEffect(() => {
    // Default to Addis Ababa if location is not available
    const defaultLocation = {
      latitude: 9.005401,
      longitude: 38.763611
    };

    const currentLocation = location || defaultLocation;

    const markers = [
      {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        title: 'You',
        color: 'red'
      },
      ...partnerLocations.map(loc => ({
        lat: loc.latitude,
        lng: loc.longitude,
        title: loc.title,
        color: 'blue'
      }))
    ];

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
          <style>
            #map { 
              height: 100vh; 
              width: 100vw; 
              position: fixed;
              top: 0;
              left: 0;
            }
            body { 
              margin: 0; 
              padding: 0; 
              overflow: hidden;
            }
            html, body { 
              height: 100%; 
              width: 100%;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            const map = L.map('map').setView([${currentLocation.latitude}, ${currentLocation.longitude}], 13);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);

            const markers = ${JSON.stringify(markers)};
            markers.forEach(marker => {
              const markerIcon = L.divIcon({
                className: 'custom-marker',
                html: \`<div style="background-color: \${marker.color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>\`,
                iconSize: [20, 20]
              });

              L.marker([marker.lat, marker.lng], {
                title: marker.title,
                icon: markerIcon
              })
              .bindPopup(marker.title)
              .addTo(map);
            });

            map.on('click', function(e) {
              const lat = e.latlng.lat;
              const lng = e.latlng.lng;
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'locationSelect',
                latitude: lat,
                longitude: lng
              }));
            });

            // Force map to resize after load
            setTimeout(() => {
              map.invalidateSize();
            }, 100);
          </script>
        </body>
      </html>
    `;
    setMapHtml(html);
  }, [location, partnerLocations]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'locationSelect' && onLocationSelect) {
        onLocationSelect({
          latitude: data.latitude,
          longitude: data.longitude
        });
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  };

  if (error) {
    console.error('Location error:', error);
    // Don't return empty view, show map with default location
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        style={styles.webview}
        source={{ html: mapHtml }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleMessage}
        onLoadEnd={() => {
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`
              document.body.style.margin = '0';
              document.body.style.padding = '0';
              document.body.style.height = '100%';
              document.body.style.width = '100%';
              document.documentElement.style.height = '100%';
              document.documentElement.style.width = '100%';
              true;
            `);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  webview: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
}); 