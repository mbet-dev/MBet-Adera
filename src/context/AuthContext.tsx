import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  error: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Define a key for session tracking
const AUTH_SESSION_KEY = 'auth_session_active';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Helper to navigate to home after successful auth
  const navigateToHome = () => {
    console.log('🔐 Auth successful - Navigating to home screen');
    
    // Prevent multiple navigation attempts in rapid succession
    AsyncStorage.getItem('NAVIGATION_IN_PROGRESS').then(inProgress => {
      if (inProgress === 'true') {
        console.log('⚠️ Navigation already in progress, skipping duplicate attempt');
        return;
      }
      
      // Mark that we're attempting navigation
      AsyncStorage.setItem('NAVIGATION_IN_PROGRESS', 'true')
        .catch(err => console.error('Error setting navigation flag:', err));
      
      try {
        // First, store a flag in AsyncStorage to indicate successful login
        AsyncStorage.setItem('AUTH_REDIRECT_HOME', 'true')
          .catch(err => console.error('Error storing redirect flag:', err));
        
        console.log(`📱 Platform: ${Platform.OS}, attempting navigation to home`);
        
        // Different approach based on platform
        if (Platform.OS === 'web') {
          // Web platform navigation
          router.replace('/(tabs)');
        } else {
          // Native platform navigation needs more time and might need different approach
          setTimeout(() => {
            try {
              console.log('🧭 Attempting primary navigation...');
              router.replace('/(tabs)');
            } catch (navError) {
              console.error('⛔ Navigation error on first attempt:', navError);
              
              // If the first attempt fails, try with alternative navigation
              setTimeout(() => {
                try {
                  console.log('🧭 Attempting secondary navigation...');
                  // On native, sometimes push works better than replace
                  router.push('/(tabs)');
                } catch (retryError) {
                  console.error('⛔ Secondary navigation failed:', retryError);
                  
                  // Last resort
                  console.log('🧭 Attempting fallback navigation...');
                  router.navigate('/(tabs)');
                }
              }, 800); // Increased delay for retry
            } finally {
              // Reset navigation flag after attempts are complete
              setTimeout(() => {
                AsyncStorage.setItem('NAVIGATION_IN_PROGRESS', 'false')
                  .catch(err => console.error('Error resetting navigation flag:', err));
              }, 1500);
            }
          }, 500); // Increased initial delay
        }
      } catch (navError) {
        console.error('⛔ Navigation error:', navError);
        AsyncStorage.setItem('NAVIGATION_IN_PROGRESS', 'false').catch(console.error);
      }
    }).catch(err => {
      console.error('Error checking navigation status:', err);
    });
  };

  useEffect(() => {
    // Skip this effect during SSR
    if (!isBrowser && Platform.OS === 'web') {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const initialize = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('🔍 Checking for existing session...');
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (mounted) {
          if (session) {
            console.log('✅ Session found during initialization');
            setSession(session);
            setUser(session.user ?? null);
            
            // Store session flag
            await AsyncStorage.setItem(AUTH_SESSION_KEY, 'true');
            
            // Check if we should navigate to home
            const authRedirect = await AsyncStorage.getItem('AUTH_REDIRECT_HOME');
            const hasSession = await AsyncStorage.getItem('HAS_ACTIVE_SESSION');
            if (authRedirect === 'true' || hasSession === 'true') {
              console.log('🔍 Found redirect flag during initialization, navigating to home');
              navigateToHome();
            }
          } else {
            console.log('❌ No session found during initialization');
            // Clear session flag
            await AsyncStorage.removeItem(AUTH_SESSION_KEY);
          }
        }
      } catch (error: any) {
        console.error('🚫 Auth initialization error:', error);
        if (mounted) {
          setError(error);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    // Set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (mounted) {
        console.log(`🔔 Auth state change: ${event}`, newSession ? 'with session' : 'no session');
        
        // Special handling for first-time sign in
        const handleSuccessfulSignIn = async () => {
          console.log('✅ Processing successful sign-in');
          
          // Wait a moment to ensure all state is updated
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Double check we have a valid session
          const sessionCheck = await supabase.auth.getSession();
          if (!sessionCheck.data.session) {
            console.log('⚠️ Session verification failed during sign-in');
            return;
          }
          
          // Store all session flags
          await Promise.all([
            AsyncStorage.setItem(AUTH_SESSION_KEY, 'true'),
            AsyncStorage.setItem('AUTH_REDIRECT_HOME', 'true'),
            AsyncStorage.setItem('HAS_ACTIVE_SESSION', 'true')
          ]);
          
          // Clear any navigation locks
          await AsyncStorage.setItem('NAVIGATION_IN_PROGRESS', 'false');
          
          console.log(`🚀 Auth event ${event} triggering navigation`);
          navigateToHome();
        };
        
        // Special handling for sign out
        const handleSignOut = async () => {
          console.log('🚪 Processing sign-out');
          
          // Clear all session flags
          await Promise.all([
            AsyncStorage.removeItem(AUTH_SESSION_KEY),
            AsyncStorage.removeItem('AUTH_REDIRECT_HOME'),
            AsyncStorage.removeItem('HAS_ACTIVE_SESSION'),
            AsyncStorage.removeItem('NAVIGATION_IN_PROGRESS')
          ]);
          
          // Clear state
          setSession(null);
          setUser(null);
          
          // Navigate to login with a small delay
          setTimeout(() => {
            try {
              console.log('🔄 Navigating to login after sign-out');
              router.replace('/auth/login');
            } catch (navError) {
              console.error('⛔ Navigation error during sign-out handler:', navError);
              router.navigate('/auth/login');
            }
          }, 200);
        };
        
        if (newSession) {
          console.log('✅ New session established for:', newSession.user?.email);
          setSession(newSession);
          setUser(newSession.user ?? null);
          
          // Handle navigation based on auth state
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            handleSuccessfulSignIn();
          }
        } else {
          console.log('❌ Session cleared');
          
          if (event === 'SIGNED_OUT') {
            handleSignOut();
          } else {
            // For other events that clear session
            setSession(null);
            setUser(null);
          }
        }
        
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔑 Signing in with email:', email);

      // Reset navigation locks to ensure we can navigate after sign in
      await AsyncStorage.setItem('NAVIGATION_IN_PROGRESS', 'false');
      
      // First, clear any existing session to prevent conflicts
      await Promise.all([
        AsyncStorage.removeItem(AUTH_SESSION_KEY),
        AsyncStorage.removeItem('AUTH_REDIRECT_HOME'),
        AsyncStorage.removeItem('HAS_ACTIVE_SESSION')
      ]);
      
      // Attempt sign in
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error('🚫 Sign in failed:', error.message);
        throw error;
      }
      
      if (!data?.session) {
        console.error('🚫 Sign in returned no session');
        throw new Error('Authentication failed: No session returned');
      }
      
      console.log('✅ Sign in successful for:', email);
      
      // Double-check session validity
      const sessionCheck = await supabase.auth.getSession();
      if (!sessionCheck.data.session) {
        console.warn('⚠️ Session verification failed, attempting recovery...');
        
        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData?.session) {
          console.error('🚫 Session recovery failed:', refreshError?.message);
          throw new Error('Could not establish a valid session');
        }
        
        console.log('🔄 Session recovered successfully');
      }
      
      // Set session flags to ensure we can navigate if auth state listener fails
      await Promise.all([
        AsyncStorage.setItem(AUTH_SESSION_KEY, 'true'),
        AsyncStorage.setItem('AUTH_REDIRECT_HOME', 'true'),
        AsyncStorage.setItem('HAS_ACTIVE_SESSION', 'true')
      ]);
      
      // Update local state
      setSession(data.session);
      setUser(data.user);
      
      console.log('🔄 Auth state listener should handle navigation');
      
      // If for some reason the auth state listener doesn't trigger navigation,
      // we'll set a fallback after a delay
      setTimeout(() => {
        AsyncStorage.getItem('NAVIGATION_IN_PROGRESS').then(inProgress => {
          if (inProgress !== 'true') {
            console.log('⏱️ Navigation fallback triggered');
            navigateToHome();
          }
        });
      }, 2000);
    } catch (error: any) {
      // Clear any partial session data to prevent stuck states
      AsyncStorage.removeItem(AUTH_SESSION_KEY).catch(console.error);
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('📝 Signing up with email:', email);

      const { error } = await supabase.auth.signUp({ email, password });

      if (error) {
        console.error('🚫 Sign up failed:', error.message);
        throw error;
      }
      console.log('✅ Sign up successful');
    } catch (error: any) {
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🚪 Signing out...');

      // First clear all session flags to prevent any automatic redirects
      await Promise.all([
        AsyncStorage.removeItem(AUTH_SESSION_KEY),
        AsyncStorage.removeItem('AUTH_REDIRECT_HOME'),
        AsyncStorage.removeItem('HAS_ACTIVE_SESSION'),
        AsyncStorage.removeItem('NAVIGATION_IN_PROGRESS')
      ]);
      
      console.log('🧹 Session flags cleared');

      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('🚫 Sign out failed:', error.message);
        throw error;
      }
      
      console.log('✅ Sign out successful');
      
      // Set user and session to null immediately to prevent flicker
      setUser(null);
      setSession(null);
      
      // Navigate to login screen with a short delay to ensure state updates
      setTimeout(() => {
        try {
          console.log('🔄 Navigating to login screen');
          router.replace('/auth/login');
        } catch (navError) {
          console.error('⛔ Navigation error during sign out:', navError);
          // Fallback navigation
          setTimeout(() => router.navigate('/auth/login'), 300);
        }
      }, 300);
    } catch (error: any) {
      console.error('🚫 Sign out error:', error);
      setError(error);
      
      // Even if sign out fails on the server, clear local state and redirect
      setUser(null);
      setSession(null);
      
      // Force navigation to login
      setTimeout(() => {
        console.log('🔄 Forcing navigation to login after error');
        router.replace('/auth/login');
      }, 500);
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    session,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
