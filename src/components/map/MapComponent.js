// This is a platform-specific map component implementation in plain JS
// Using JS instead of TS to avoid TypeScript errors
import React from 'react';
import { Platform, View, Text, StyleSheet, Image } from 'react-native';

// For web, we'll use a simple placeholder
const WebMapPlaceholder = (props) => (
  <View style={[styles.container, props.style]}>
    <View style={styles.mapPlaceholder}>
      <Image 
        source={{ uri: 'https://maps.googleapis.com/maps/api/staticmap?center=0,0&zoom=2&size=600x300&maptype=roadmap' }} 
        style={styles.placeholderImage} 
        resizeMode="cover"
      />
      <View style={styles.overlay}>
        <Text style={styles.text}>Interactive map not available on web</Text>
        <Text style={styles.subText}>A static map is shown instead</Text>
      </View>
    </View>
    {props.children}
  </View>
);

// Create a component that renders the appropriate map based on platform
const MapComponent = (props) => {
  // For web, return the placeholder
  if (Platform.OS === 'web') {
    return <WebMapPlaceholder {...props} />;
  }
  
  // For native platforms, dynamically import react-native-maps
  // This ensures the native module is never imported on web
  try {
    // Only import on native platforms
    const MapView = require('react-native-maps').default;
    const Marker = require('react-native-maps').Marker;
    
    const { markers = [], onMarkerPress, onMapPress, initialRegion, children, ...otherProps } = props;

    return (
      <MapView
        style={[styles.container, props.style]}
        initialRegion={initialRegion || {
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onPress={(e) => onMapPress?.(e.nativeEvent.coordinate)}
        {...otherProps}
      >
        {markers.map((marker) => (
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
        {children}
      </MapView>
    );
  } catch (error) {
    console.error('Error loading react-native-maps:', error);
    return <WebMapPlaceholder {...props} />;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapPlaceholder: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    color: '#fff',
    fontFamily: 'system-ui',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subText: {
    color: '#eee',
    fontFamily: 'system-ui',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default MapComponent;
