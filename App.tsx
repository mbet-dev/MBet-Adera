import React from 'react';
import { SessionProvider } from './components/SessionProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { theme } from './theme';
import { LanguageProvider } from './src/context/LanguageContext';
import './src/i18n'; // Import i18n configuration
import { Stack } from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
import { preventAutoHideAsync } from 'expo-splash-screen';
preventAutoHideAsync();

export default function RootLayout() {
  return (
    <LanguageProvider>
      <SessionProvider>
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            {/* Expo Router uses Stack as the root layout */}
            <Stack screenOptions={{ headerShown: false }} />
          </PaperProvider>
        </SafeAreaProvider>
      </SessionProvider>
    </LanguageProvider>
  );
}
