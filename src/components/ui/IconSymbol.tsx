import React from 'react';
import { ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface IconSymbolProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  style?: any; // Using any for now as we need to support both ViewStyle and TextStyle
}

export function IconSymbol({ name, size = 24, color = '#000', style }: IconSymbolProps) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}
