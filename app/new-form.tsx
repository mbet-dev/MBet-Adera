import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

// This is a simple redirect component that will navigate to the new-delivery page
export default function NewFormScreen() {
  const router = useRouter();

  useEffect(() => {
    // Navigate to the new delivery form immediately
    const timer = setTimeout(() => {
      // Use replace to avoid adding to the navigation history
      router.replace('/new-delivery');
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4CAF50" />
      <Text style={styles.text}>Loading delivery form...</Text>
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
