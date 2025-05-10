import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SessionProvider } from './components/SessionProvider';
import { AppNavigator } from './navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { theme } from './theme';

export default function App() {
  return (
    <SessionProvider>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </SessionProvider>
  );
}
