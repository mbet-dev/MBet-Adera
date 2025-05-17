import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SessionProvider } from './components/SessionProvider';
import { AppNavigator } from './navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { theme } from './theme';
import { LanguageProvider } from './src/context/LanguageContext';
import './src/i18n'; // Import i18n configuration

export default function App() {
  return (
    <LanguageProvider>
    <SessionProvider>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </SessionProvider>
    </LanguageProvider>
  );
}
