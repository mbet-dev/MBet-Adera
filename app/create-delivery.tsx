import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

// This is a redirect page that will automatically navigate to the new-delivery screen
export default function CreateDeliveryScreen() {
  const router = useRouter();

  useEffect(() => {
    // Navigate to the new delivery form after a short delay
    const timer = setTimeout(() => {
      router.replace('/new-delivery');
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4CAF50" />
      <Text style={styles.text}>Preparing delivery form...</Text>
    </View>
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
