import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const HAS_ACTIVE_SESSION_KEY = 'hasActiveSession';
const SESSION_KEY = 'supabase.auth.token';
const MBET_USER_KEY = 'mbet.user';

interface SessionContextType {
  session: Session | null;
  loading: boolean;
  manuallyRestoreSession: () => Promise<boolean>;
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  loading: true,
  manuallyRestoreSession: async () => false,
});

export const useSession = () => useContext(SessionContext);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const manuallyRestoreSession = async (): Promise<boolean> => {
    try {
      // Try to get session from storage
      const storedSession = await AsyncStorage.getItem(SESSION_KEY);
      if (!storedSession) return false;

      const parsedSession = JSON.parse(storedSession);
      
      // Verify session is still valid
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      
      if (error || !currentSession) {
        // Clear invalid session data
        await AsyncStorage.removeItem(SESSION_KEY);
        await AsyncStorage.removeItem(HAS_ACTIVE_SESSION_KEY);
        return false;
      }

      setSession(currentSession);
      return true;
    } catch (error) {
      console.error('Error in manual session restoration:', error);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        setLoading(true);
        
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (mounted) {
          setSession(session);
          if (session) {
            await AsyncStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
          }
        }
      } catch (error) {
        console.error('Session initialization error:', error);
        if (mounted) {
          // Try manual restoration as fallback
          await manuallyRestoreSession();
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (mounted) {
        setSession(newSession);
        
        if (event === 'SIGNED_IN') {
          await AsyncStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
          await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
          
          // Store user data for offline use
          if (newSession?.user) {
            await AsyncStorage.setItem(MBET_USER_KEY, JSON.stringify({
              id: newSession.user.id,
              email: newSession.user.email,
              role: newSession.user.user_metadata?.role || 'customer'
            }));
          }
        } else if (event === 'SIGNED_OUT') {
          await AsyncStorage.removeItem(HAS_ACTIVE_SESSION_KEY);
          await AsyncStorage.removeItem(SESSION_KEY);
          await AsyncStorage.removeItem(MBET_USER_KEY);
          router.replace('/auth/login');
        }
        
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, loading, manuallyRestoreSession }}>
      {children}
    </SessionContext.Provider>
  );
}; 