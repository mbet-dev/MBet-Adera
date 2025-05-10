import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { MapViewProps } from './types';

export function WebMapView(props: MapViewProps) {
  const [mapHtml, setMapHtml] = useState('');
  
  useEffect(() => {
    const markers = props.markers || [];
    const initialRegion = props.initialRegion || {
      latitude: 9.005401, // Default to Addis Ababa
      longitude: 38.763611,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };
    
    // Generate Leaflet HTML for OpenStreetMap
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
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 0 5px rgba(0,0,0,0.3);
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            // Initialize map with center based on props
            const initialLat = ${initialRegion.latitude};
            const initialLng = ${initialRegion.longitude};
            const zoomLevel = 13;
            
            const map = L.map('map').setView([initialLat, initialLng], zoomLevel);
            
            // Add OpenStreetMap tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);
            
            // Add markers from props
            const markers = ${JSON.stringify(markers)};
            
            markers.forEach(marker => {
              const customIcon = L.divIcon({
                className: 'custom-marker',
                html: \`<div style="background-color: #1976D2; width: 20px; height: 20px; border-radius: 50%; display: flex; justify-content: center; align-items: center;"></div>\`,
                iconSize: [20, 20]
              });

              const leafletMarker = L.marker([marker.latitude, marker.longitude], {
                title: marker.title || '',
                icon: customIcon
              });

              leafletMarker.bindTooltip(marker.title || '', {
                permanent: false, 
                direction: 'top'
              });

              leafletMarker.addTo(map);
            });
            
            // Add lines between markers if we have pickup and dropoff
            if (markers.length >= 2) {
              try {
                const coordinates = markers.map(marker => [marker.latitude, marker.longitude]);
                L.polyline(coordinates, {
                  color: '#1976D2',
                  weight: 3,
                  opacity: 0.7,
                  dashArray: '5, 10'
                }).addTo(map);
                
                // Fit map to show all markers
                if (markers.length > 0) {
                  const bounds = L.latLngBounds(coordinates);
                  map.fitBounds(bounds, { padding: [50, 50] });
                }
              } catch (error) {
                console.error('Error drawing route:', error);
              }
            }
          </script>
        </body>
      </html>
    `;
    
    setMapHtml(html);
  }, [props.markers, props.initialRegion]);

  return (
    <View style={[styles.container, props.style]}>
      <WebView
        source={{ html: mapHtml }}
        style={styles.map}
        scrollEnabled={false}
        javaScriptEnabled={true}
      />
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 8,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
