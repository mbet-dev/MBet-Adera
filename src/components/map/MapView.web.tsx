import React, { useEffect, useRef } from 'react';
import { MapViewProps } from './types';
import { Loader } from '@googlemaps/js-api-loader';

type GoogleMap = google.maps.Map;
type GoogleMarker = google.maps.Marker;
type LatLngLiteral = google.maps.LatLngLiteral;

export function MapView({ markers = [], initialRegion, onMarkerPress, onMapPress }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<GoogleMap | null>(null);
  const markersRef = useRef<GoogleMarker[]>([]);
  const loader = useRef<Loader>();

  useEffect(() => {
    const loadMap = async () => {
      if (!loader.current) {
        loader.current = new Loader({
          apiKey: 'AIzaSyAxqOQntNMYnJvbRIX4xY-W45mT8hIZVkc',
          version: 'weekly',
        });
      }

      try {
        const google = await loader.current.load();
        if (!mapRef.current || mapInstanceRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: { 
            lat: initialRegion?.latitude ?? 0, 
            lng: initialRegion?.longitude ?? 0 
          },
          zoom: initialRegion ? 15 : 2,
          mapTypeControl: false,
          fullscreenControl: false,
        });

        mapInstanceRef.current = map;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        if (onMapPress) {
          map.addListener('click', (e: google.maps.MapMouseEvent) => {
            const latLng = e.latLng;
            if (latLng) {
              onMapPress({
                latitude: latLng.lat(),
                longitude: latLng.lng(),
              });
            }
          });
        }

        // Add new markers
        markers.forEach((marker) => {
          const googleMarker = new google.maps.Marker({
            position: { 
              lat: marker.latitude, 
              lng: marker.longitude 
            },
            map,
            title: marker.title,
          });

          if (onMarkerPress) {
            googleMarker.addListener('click', () => onMarkerPress(marker));
          }

          markersRef.current.push(googleMarker);
        });
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    loadMap();

    return () => {
      // Clean up markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, [initialRegion, markers, onMarkerPress, onMapPress]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        borderRadius: 8,
      }} 
    />
  );
}
