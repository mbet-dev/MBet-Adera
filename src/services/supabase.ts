import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import storageUtils from '../utils/storageUtils';

// Initialize logging state
let isLoggingEnabled = true;

// Debug logging function
const debugLog = (message: string, data?: any) => {
  if (isLoggingEnabled) {
    console.log(`[AUTH DEBUG] ${message}`, data ? data : '');
  }
};

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[AUTH ERROR] Missing Supabase configuration:', {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SUPABASE_ANON_KEY,
    urlLength: SUPABASE_URL?.length,
    keyLength: SUPABASE_ANON_KEY?.length
  });
  throw new Error('Missing Supabase configuration');
}

debugLog('Initializing Supabase with URL:', SUPABASE_URL);

// Initialize Supabase client with proper session handling
// Note: Session duration must be set on the Supabase project settings
// The client settings here are only a reinforcement of those settings
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

// Handle auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  debugLog('Auth state changed:', { 
    event, 
    userId: session?.user?.id,
    email: session?.user?.email,
    hasSession: !!session,
    sessionExpiry: session?.expires_at
  });

  if (event === 'SIGNED_IN' && session) {
    try {
      // Store session data
      await AsyncStorage.setItem('supabase.auth.token', JSON.stringify(session));
      debugLog('Session stored successfully', {
        userId: session.user.id,
        email: session.user.email,
        expiresAt: session.expires_at
      });

      // Cache user data for offline use
      const userData = {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name || '',
        phone_number: session.user.user_metadata?.phone || '',
        created_at: session.user.created_at,
        role: session.user.user_metadata?.role || 'customer',
      };
      
      await storageUtils.safeStore('mbet.user', userData, 'AuthStateChange');
      debugLog('User data cached successfully', userData);
      
      // Store session state
      await storageUtils.safeStore('hasActiveSession', true, 'SessionState');
      debugLog('Session state updated to active');
    } catch (error) {
      console.error('[AUTH ERROR] Error storing session:', error);
    }
  } else if (event === 'SIGNED_OUT') {
    try {
      // Clear session data
      await AsyncStorage.removeItem('supabase.auth.token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('mbet.user');
      await AsyncStorage.removeItem('hasActiveSession');
      debugLog('Session cleared successfully');
    } catch (error) {
      console.error('[AUTH ERROR] Error clearing session:', error);
    }
  }
});

// Helper function to enable/disable logging
export const setLoggingEnabled = (enabled: boolean) => {
  isLoggingEnabled = enabled;
  debugLog(`Logging ${enabled ? 'enabled' : 'disabled'}`);
};

// Export a function to check if we have a stored user ID
export const getStoredUserId = async (): Promise<string | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    debugLog('Checking stored user ID:', { 
      hasSession: !!session,
      userId: session?.user?.id 
    });
    return session?.user?.id || null;
  } catch (error) {
    console.error('[AUTH ERROR] Error getting stored user ID:', error);
    return null;
  }
};

// Create a demo user ID for offline/development use
export const createDemoUserId = async (): Promise<string> => {
  try {
    // Generate a unique ID
    const demoId = 'dev-' + Date.now().toString();
    
    // Store it for future use
    await AsyncStorage.setItem('dev-user-id', demoId);
    
    // Also store minimal user data
    await storageUtils.safeStore('mbet.user', {
      id: demoId,
      email: 'demo@mbet-adera.com',
      full_name: 'Demo User',
      role: 'customer'
    }, 'DemoUser');
    
    console.log('Created new demo user ID:', demoId);
    return demoId;
  } catch (error) {
    console.error('Error creating demo user ID:', error);
    // Return a hardcoded ID as last resort
    return 'demo-fallback-user';
  }
};
