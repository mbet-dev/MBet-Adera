import React from 'react';
import NativeMapView, { Marker } from 'react-native-maps';
import { MapViewProps } from './types.js';

export function MapView({ markers = [], onMarkerPress, onMapPress, initialRegion }: MapViewProps) {
  return (
    <NativeMapView
      style={{ flex: 1 }}
      initialRegion={initialRegion || {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }}
      onPress={(e: any) => onMapPress?.(e.nativeEvent.coordinate)}
    >
      {markers.map((marker: any) => (
        <Marker
          key={marker.id}
          coordinate={{
            latitude: marker.latitude,
            longitude: marker.longitude,
          }}
          title={marker.title}
          description={marker.description}
          onPress={() => onMarkerPress?.(marker)}
        />
      ))}
    </NativeMapView>
  );
}
