import React from 'react';
import { View, StyleSheet } from 'react-native';
import HomeScreen from '../../src/screens/main/HomeNew';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { FAB } from 'react-native-paper';

export default function HomeTab() {
  const navigation = useNavigation();
  const router = useRouter();
  
  return (
    <View style={styles.container}>
      <HomeScreen navigation={navigation} />
      <FAB
        icon="package-variant"
        style={styles.fab}
        onPress={() => router.push('/(tabs)/orders-screen')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
