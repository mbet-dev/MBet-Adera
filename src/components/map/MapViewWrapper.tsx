import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { MapViewProps } from './types';
import { WebMapView } from './WebMapView';

// This wrapper component completely avoids importing react-native-maps on web
// It only imports the native map component on native platforms
export function MapViewWrapper(props: MapViewProps) {
  // For web platform, always use the web placeholder
  if (Platform.OS === 'web') {
    return <WebMapView {...props} />;
  }

  // For native platforms, dynamically import and use react-native-maps
  // This import is isolated in a separate component to prevent web bundlers from trying to include it
  const NativeMapComponent = require('./NativeMapComponent').default;
  return <NativeMapComponent {...props} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
