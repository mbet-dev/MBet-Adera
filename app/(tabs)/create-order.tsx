import React from 'react';
import { StyleSheet, StatusBar, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { EnhancedCreateOrderForm } from '../../components/orders/EnhancedCreateOrderForm';
import { ThemedView } from '../../components/ThemedView';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export default function CreateOrderScreen() {
  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Stack.Screen 
        options={{ 
          title: 'Create New Delivery',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: 'bold',
            color: '#4CAF50',
          }
        }} 
      />
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <EnhancedCreateOrderForm />
      </KeyboardAwareScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  contentContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 30,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 600 : undefined,
    alignSelf: 'center',
  }
});