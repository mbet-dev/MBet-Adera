import { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router';
import { AuthProvider } from '@/context/AuthContext';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { LogBox, View, Text, TouchableOpacity } from 'react-native';
import { SessionProvider, useSession } from '@components/SessionProvider';
import { storage } from '../src/utils/storage';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Ignore specific warnings
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
]);

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class CustomErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Something went wrong</Text>
          <Text style={{ color: 'red', marginBottom: 20 }}>{this.state.error?.message}</Text>
          <TouchableOpacity
            onPress={this.resetError}
            style={{
              backgroundColor: theme.colors.primary,
              padding: 10,
              borderRadius: 5,
            }}
          >
            <Text style={{ color: 'white' }}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

function RootLayoutNav() {
  const { session, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);

  useEffect(() => {
    if (loading || checkedOnboarding) return;

    const checkOnboarding = async () => {
      const inAuthGroup = segments[0] === 'auth';
      const inOnboarding = segments[0] === 'onboarding';
      let hasSeenOnboarding = false;
      try {
        const value = await storage.getItem('hasSeenOnboarding');
        hasSeenOnboarding = value === 'true';
      } catch (e) {
        hasSeenOnboarding = false;
      }

      if (!session && !inAuthGroup && !inOnboarding) {
        if (!hasSeenOnboarding) {
          router.replace('/onboarding');
        } else {
          router.replace('/auth/login');
        }
      } else if (session && inAuthGroup) {
        router.replace('/');
      }
      setCheckedOnboarding(true);
    };
    checkOnboarding();
  }, [session, loading, segments, checkedOnboarding]);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  return (
    <CustomErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
        <Stack.Screen name="tracking" options={{ headerShown: false }} />
      </Stack>
    </CustomErrorBoundary>
  );
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
