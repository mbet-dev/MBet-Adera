import React, { useEffect, useState, Component, ErrorInfo, ReactNode, useRef } from 'react';
import { Stack, useRouter, useSegments, SplashScreen, Slot } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { LogBox, View, Text, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import { SessionProvider, useSession } from '../components/SessionProvider';
import { storage } from '../src/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HAS_ACTIVE_SESSION_KEY } from '../lib/supabase';
import { LanguageProvider, useLanguage } from '../src/context/LanguageContext';
import '../src/i18n'; // Import i18n configuration

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

// Wrap the navigation with the language context to force re-renders on language change
function AppWithLanguage({ children }: { children: ReactNode }) {
  const { refreshKey } = useLanguage();
  
  // This component will re-render whenever refreshKey changes
  // forcing the entire app to re-render when language changes
  return <>{children}</>;
}

function RootLayoutNav() {
  const { session, loading, manuallyRestoreSession } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const [checkedOnboarding, setCheckedOnboarding] = useState(false);
  const [lastActiveTime, setLastActiveTime] = useState<number>(Date.now());
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Watch for app state changes to restore session
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState: AppStateStatus) => {
      // When app comes to foreground from background
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log("App has come to the foreground!");
        
        // Check time since last active - if it's been more than 1 minute
        const now = Date.now();
        const timeSinceLastActive = now - lastActiveTime;
        
        if (timeSinceLastActive > 60000) { // 1 minute
          console.log("App was inactive for more than 1 minute, checking session");
          
          // Check if we still have our session flag
          const hasActiveSession = await AsyncStorage.getItem(HAS_ACTIVE_SESSION_KEY);
          
          if (hasActiveSession === 'true' && !session) {
            console.log("We have an active session flag but no session, attempting to restore");
            await manuallyRestoreSession();
          }
        }
        
        setLastActiveTime(now);
      }
      
      appState.current = nextAppState;
      setAppStateVisible(appState.current);
    });

    return () => {
      subscription.remove();
    };
  }, [session, lastActiveTime]);

  // Initialize navigation state
  useEffect(() => {
    if (!loading && !isInitialized) {
      setIsInitialized(true);
    }
  }, [loading]);

  // Handle navigation after initialization
  useEffect(() => {
    const hasValidSegments = Array.isArray(segments) && segments.length > 0;
    if (!isInitialized || loading || !hasValidSegments) return;
    if (checkedOnboarding) return;

    const checkOnboarding = async () => {
      try {
        // Check for active session first for faster initial load
        const hasActiveSession = await AsyncStorage.getItem(HAS_ACTIVE_SESSION_KEY);
        
        // Only proceed with navigation checks if we're not in an initial loading state
        const inAuthGroup = segments[0] === 'auth';
        const inOnboarding = segments[0] === 'onboarding';
        
        // Get onboarding status
        let hasSeenOnboarding = false;
        try {
          const value = await storage.getItem('hasSeenOnboarding');
          hasSeenOnboarding = value === 'true';
        } catch (e) {
          hasSeenOnboarding = false;
        }

        // Main navigation logic with improved handling:
        if (session) {
          // User is logged in - ensure session flag is set
          await AsyncStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
          
          if (inAuthGroup || inOnboarding) {
            // Redirect to main app if they're on auth or onboarding screens
            router.replace('/(tabs)');
          }
        } else {
          // No active session object, but check if flag indicates we should have one
          if (hasActiveSession === 'true' && !loading) {
            console.log('Session flag indicates active session, but session object missing - trying restoration');
            const restored = await manuallyRestoreSession();
            
            if (restored) {
              // Restoration worked - redirect if needed
              if (inAuthGroup || inOnboarding) {
                // Stay on current screen - restoration will handle navigation
              } else {
                console.log('Session restored successfully');
              }
              setCheckedOnboarding(true);
              return;
            } else {
              console.log('Session restoration failed despite active flag');
              // Clear the flag since restoration failed
              await AsyncStorage.removeItem(HAS_ACTIVE_SESSION_KEY);
            }
          }
          
          // User is definitely not logged in
          if (!inAuthGroup && !inOnboarding) {
            // They're trying to access the app without being logged in
            if (!hasSeenOnboarding) {
              router.replace('/onboarding');
            } else {
              router.replace('/auth/login');
            }
          }
        }
      } catch (error) {
        console.error('Error in navigation check:', error);
      }
      
      setCheckedOnboarding(true);
    };
    
    checkOnboarding();
  }, [session, loading, segments, isInitialized, checkedOnboarding]);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (!isInitialized) {
    return <Slot />;
  }

  return (
    <CustomErrorBoundary>
      <AppWithLanguage>
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
          <Stack.Screen name="parcel/[id]" options={{ headerShown: true }} />
        </Stack>
      </AppWithLanguage>
    </CustomErrorBoundary>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <SessionProvider>
        <SafeAreaProvider>
          <PaperProvider theme={theme}>
            <AuthProvider>
              <RootLayoutNav />
            </AuthProvider>
          </PaperProvider>
        </SafeAreaProvider>
      </SessionProvider>
    </LanguageProvider>
  );
}
