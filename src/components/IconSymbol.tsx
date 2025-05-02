import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface IconSymbolProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export function IconSymbol({ name, size = 24, color = '#000', style }: IconSymbolProps) {
  return (
    <View style={[styles.container, style]}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
