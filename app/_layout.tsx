import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider } from '@/context/AuthContext';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '../theme';
import * as SplashScreen from 'expo-splash-screen';
import { LogBox } from 'react-native';
import { SessionProvider, useSession } from '@components/SessionProvider';
import { View } from 'react-native';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Ignore specific warnings
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
]);

function RootLayoutNav() {
  const { session, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!session && !inAuthGroup) {
      // Redirect to the sign-in page
      router.replace('/auth/login');
    } else if (session && inAuthGroup) {
      // Redirect away from the sign-in page
      router.replace('/tabs');
    }
  }, [session, loading, segments]);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </SessionProvider>
  );
}
