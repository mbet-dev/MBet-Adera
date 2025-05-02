import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Stack, router } from 'expo-router';

// This is a simple redirect page that will navigate to the new delivery form
export default function DeliveryRedirect() {
  // Use effect to navigate after component mounts
  useEffect(() => {
    // Navigate to the new delivery form after a short delay
    const timer = setTimeout(() => {
      try {
        // Navigate to the standalone new-delivery page
        router.replace('/new-delivery');
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Loading Delivery Form' }} />
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.text}>Loading delivery form...</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
});
