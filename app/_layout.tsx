import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import * as SplashScreen from 'expo-splash-screen';
import { LogBox } from 'react-native';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Ignore specific warnings
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
]);

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen after resources are loaded
    SplashScreen.hideAsync().catch(console.error);
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
          </Stack>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
