import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Fallback values for development
const supabaseUrl = SUPABASE_URL || 'https://jaqwviuxhxsxypmffece.supabase.co';
const supabaseAnonKey = SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphcXd2aXV4aHhzeHlwbWZmZWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzAwNDUsImV4cCI6MjA1OTcwNjA0NX0.XKL6gf08RDWMSPYCdCkAIpx8jViH3UdD0D7Ie24Qs0A';

// Constants for storage keys
export const SESSION_KEY = 'sb-jaqwviuxhxsxypmffece-auth-token';
export const HAS_ACTIVE_SESSION_KEY = 'hasActiveSession';
export const MBET_USER_KEY = 'mbet.user';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Missing Supabase environment variables. Using fallback values for development.');
}

// Note: For longer session durations:
// 1. Go to the Supabase Dashboard > Authentication > Settings > Session/Token Expiry
// 2. Set the JWT expiry time to a longer value (e.g., 90 days)
// 3. Set the Session expiry grace period to a higher value (e.g., 7 days)
// This is the proper way to handle session duration as client-side settings alone cannot extend
// the server-enforced token expiration time.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    debug: __DEV__,
  },
  db: {
    schema: 'public'
  }
});

export type { AuthChangeEvent, Session };

// Enhanced manual session restoration function
const manualRestoreSession = async (): Promise<Session | null> => {
  try {
    // Try to get the session from AsyncStorage directly
    const storedSessionStr = await AsyncStorage.getItem(SESSION_KEY);
    if (!storedSessionStr) return null;
    
    // Parse the stored session
    const storedSession = JSON.parse(storedSessionStr);
    if (!storedSession) return null;
    
    // Check if the session has an access token
    if (!storedSession.access_token) return null;
    
    console.log('Found stored session, attempting to restore manually');
    
    // Try to set the session in Supabase
    const { data, error } = await supabase.auth.setSession({
      access_token: storedSession.access_token,
      refresh_token: storedSession.refresh_token || '',
    });
    
    if (error) {
      console.error('Error restoring session manually:', error.message);
      if (error.message.includes('token expired')) {
        // Clear invalid session data
        await AsyncStorage.removeItem(SESSION_KEY);
        await AsyncStorage.removeItem(HAS_ACTIVE_SESSION_KEY);
      }
      return null;
    }
    
    if (data.session) {
      console.log('Session manually restored successfully');
      return data.session;
    }
    
    return null;
  } catch (error) {
    console.error('Error in manual session restoration:', error);
    return null;
  }
};

// Initialize session
export const initializeSession = async () => {
  try {
    // First try the standard session retrieval
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (session) {
      console.log('Session retrieved successfully from Supabase');
      return session;
    }
    
    if (error) {
      console.error('Error getting session from Supabase:', error.message);
    }
    
    // If no session from standard method, try manual restoration
    const hasActiveSession = await AsyncStorage.getItem(HAS_ACTIVE_SESSION_KEY);
    if (hasActiveSession === 'true') {
      console.log('Active session flag found, trying manual restoration');
      const manualSession = await manualRestoreSession();
      if (manualSession) return manualSession;
    }
    
    return null;
  } catch (error) {
    console.error('Error initializing session:', error);
    
    // Last resort: try manual restoration
    return await manualRestoreSession();
  }
};

// Refresh session
export const refreshSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Error refreshing session:', error.message);
      // If refresh failed but we have an active session flag, try manual restoration
      const hasActiveSession = await AsyncStorage.getItem(HAS_ACTIVE_SESSION_KEY);
      if (hasActiveSession === 'true') {
        return await manualRestoreSession();
      }
      return null;
    }
    return session;
  } catch (error) {
    console.error('Error in refreshSession:', error);
    return null;
  }
};

// Add session persistence listener with more robust storage
supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
  if (event === 'SIGNED_IN') {
    console.log('User signed in:', session?.user?.email);
    // Store session in AsyncStorage with both keys for redundancy
    if (session) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
      await AsyncStorage.setItem('supabase.auth.token', JSON.stringify(session));
      await AsyncStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
      
      // Store user info for offline access
      if (session.user) {
        await AsyncStorage.setItem(MBET_USER_KEY, JSON.stringify({
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          role: session.user.role
        }));
      }
    }
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
    // Clear session from AsyncStorage 
    await AsyncStorage.removeItem(SESSION_KEY);
    await AsyncStorage.removeItem('supabase.auth.token');
    await AsyncStorage.removeItem(HAS_ACTIVE_SESSION_KEY);
    await AsyncStorage.removeItem(MBET_USER_KEY);
  } else if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed');
    // Update session in AsyncStorage with both keys
    if (session) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
      await AsyncStorage.setItem('supabase.auth.token', JSON.stringify(session));
      await AsyncStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
    }
  }
}); 