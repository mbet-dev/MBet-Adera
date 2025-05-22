import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';

export default function OrderDetailsScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium">Order Details</Text>
      <Text variant="bodyLarge">Order ID: {id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 