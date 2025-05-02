import React, { forwardRef } from 'react';
import { MapViewProps } from './types';
import { MapViewWrapper } from './MapViewWrapper';

// This is now just a simple forwardRef wrapper around our MapViewWrapper component
// The actual implementation is split between MapViewWrapper, WebMapView, and NativeMapComponent
// This prevents any native module imports from being included in the web bundle
export const MapView = forwardRef<any, MapViewProps>((props, ref) => {
  // Pass the ref as a prop instead of using the ref attribute directly
  // This avoids the TypeScript error with ForwardedRef vs RefObject
  return <MapViewWrapper {...props} forwardedRef={ref} />;
});
