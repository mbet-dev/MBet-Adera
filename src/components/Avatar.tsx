import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface AvatarProps {
  source?: { uri: string } | null;
  name?: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
  style?: any;
}

export default function Avatar({ source, name, size = 40, backgroundColor = '#4CAF50', textColor = '#FFFFFF', style }: AvatarProps) {
  const initials = name ? name.match(/[A-Z]/g)?.join('')?.slice(0, 2) : 'A';
  
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {source ? (
        <Image 
          source={source} 
          style={[styles.image, { width: size, height: size }]} 
          onError={() => null} // Handle image load errors gracefully
        />
      ) : (
        <View style={[styles.avatar, { backgroundColor }]}>
          <Text style={[styles.text, { color: textColor }]}>{initials}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  image: {
    borderRadius: 20,
  },
  avatar: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
