export { MapView } from './MapView';
export type { MapMarker, MapViewProps } from './types';

// Force OpenStreetMap usage for all platforms
// This ensures we don't fallback to Google Maps on any platform
export const FORCE_OPENSTREETMAP = true;
