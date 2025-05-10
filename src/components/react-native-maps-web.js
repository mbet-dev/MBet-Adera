import React from 'react';
import { View, Text } from 'react-native';

const MapViewComponent = (props) => {
  // Return a placeholder div for web
  return (
    <View style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#f0f0f0',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 8,
      padding: 16,
    }}>
      <Text style={{ color: '#666', fontSize: 14 }}>
        Map not available on web
      </Text>
      {props.children}
    </View>
  );
};

// Export a fake MapView component
export default MapViewComponent;

// Export all the components and constants that might be imported
export const Marker = (props) => null;
export const Callout = (props) => null;
export const Circle = (props) => null;
export const Overlay = (props) => null;
export const Polygon = (props) => null;
export const Polyline = (props) => null;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

// Export native commands
export const createNativeCommandsRef = () => ({});
export const codegenNativeCommands = {
  createNativeCommandsRef: () => ({}),
};

// Export any animated components
export const AnimatedRegion = class {
  constructor() {}
  timing() { return { start: () => {} }; }
};

// Export MapMarkerNativeComponent
export const MapMarkerNativeComponent = () => null; 