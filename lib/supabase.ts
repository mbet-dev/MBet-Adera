import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Fallback values for development
const supabaseUrl = SUPABASE_URL || 'https://jaqwviuxhxsxypmffece.supabase.co';
const supabaseAnonKey = SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphcXd2aXV4aHhzeHlwbWZmZWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzAwNDUsImV4cCI6MjA1OTcwNjA0NX0.XKL6gf08RDWMSPYCdCkAIpx8jViH3UdD0D7Ie24Qs0A';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Missing Supabase environment variables. Using fallback values for development.');
}

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

// Initialize session
export const initializeSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error.message);
      return null;
    }
    return session;
  } catch (error) {
    console.error('Error initializing session:', error);
    return null;
  }
};

// Refresh session
export const refreshSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Error refreshing session:', error.message);
      return null;
    }
    return session;
  } catch (error) {
    console.error('Error refreshing session:', error);
    return null;
  }
};

// Add session persistence listener
supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
  if (event === 'SIGNED_IN') {
    console.log('User signed in:', session?.user?.email);
    // Store session in AsyncStorage
    AsyncStorage.setItem('supabase.auth.token', JSON.stringify(session));
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
    // Clear session from AsyncStorage
    AsyncStorage.removeItem('supabase.auth.token');
  } else if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed');
    // Update session in AsyncStorage
    AsyncStorage.setItem('supabase.auth.token', JSON.stringify(session));
  }
}); 