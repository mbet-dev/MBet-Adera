export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
}

import React, { ForwardedRef } from 'react';

export interface MapViewProps {
  markers?: MapMarker[];
  onMarkerPress?: (marker: MapMarker) => void;
  onMapPress?: (event: { latitude: number; longitude: number }) => void;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  children?: React.ReactNode;
  style?: any;
  provider?: any;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  followsUserLocation?: boolean;
  showsCompass?: boolean;
  showsTraffic?: boolean;
  showsBuildings?: boolean;
  showsIndoors?: boolean;
  zoomEnabled?: boolean;
  rotateEnabled?: boolean;
  scrollEnabled?: boolean;
  pitchEnabled?: boolean;
  toolbarEnabled?: boolean;
  ref?: React.RefObject<any>;
}
