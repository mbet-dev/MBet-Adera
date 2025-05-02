import { Stack } from 'expo-router';
import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
    <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
      </Stack>
    </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
