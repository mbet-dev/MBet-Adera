import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Platform } from 'react-native';

export default function OrdersIndexScreen() {
  // For mobile platforms, we'll keep using the original orders screen for now
  if (Platform.OS !== 'web') {
    return <Redirect href="/(tabs)/orders/enhanced-orders" />;
    }

  // For web, we'll redirect to the enhanced orders screen
  return <Redirect href="/(tabs)/orders/enhanced-orders" />;
}
