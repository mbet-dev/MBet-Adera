import React from 'react';
import { View, StyleSheet } from 'react-native';
import HomeScreen from '../../src/screens/main/HomeNew';
import { useNavigation } from '@react-navigation/native';

export default function HomeTab() {
  const navigation = useNavigation();
  
  return (
    <View style={styles.container}>
      <HomeScreen navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
