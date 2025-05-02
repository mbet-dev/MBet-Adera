// This is an empty module to replace react-native-maps on web
import React from 'react';

const EmptyComponent = () => null;

// Default export as a component
const Map = () => null;
export default Map;

// Export all possible components and functions that might be imported
export const Marker = EmptyComponent;
export const Callout = EmptyComponent;
export const Circle = EmptyComponent;
export const Overlay = EmptyComponent;
export const Polygon = EmptyComponent;
export const Polyline = EmptyComponent;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';
export const createNativeCommandsRef = () => ({});
export const codegenNativeCommands = {
  createNativeCommandsRef: () => ({}),
};
export const MapMarkerNativeComponent = {
  default: EmptyComponent,
};

// Add any additional exports that might be needed
export const AnimatedRegion = class {
  constructor() {}
  timing() { return { start: () => {} }; }
};