import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

// Simple web-only map placeholder component
// This is implemented in plain JS to avoid TypeScript errors
const WebMap = (props) => {
  return (
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    overflow: 'hidden',
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

export default WebMap;
