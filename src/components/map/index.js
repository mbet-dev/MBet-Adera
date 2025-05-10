// Platform-specific map component
// Using plain JS to avoid TypeScript errors with native modules on web
import React from 'react';
import { Platform } from 'react-native';
import WebMap from './WebMap';

// For web, use the WebMap component
// For native, dynamically import react-native-maps to avoid web bundling issues
const Map = (props) => {
  // Always use WebMap on web platform
  if (Platform.OS === 'web') {
    return <WebMap {...props} />;
  }
  
  // For native platforms, try to use react-native-maps
  try {
    // Only import on native platforms
    const MapView = require('react-native-maps').default;
    return <MapView {...props} />;
  } catch (error) {
    console.error('Error loading react-native-maps:', error);
    return <WebMap {...props} />;
  }
};

// Export named for compatibility with existing imports
export const MapView = Map;

// Also export as default
export default Map;
