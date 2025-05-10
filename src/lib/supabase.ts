import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { storage } from './storage';

// Basic type definition for Database to avoid type errors
export interface Database {
  public: {
    Tables: {
      messages: {
        Row: {
          id: string;
          created_at: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          read: boolean;
          parcel_id: string | null;
        };
      };
      // Add other tables as needed
    };
  };
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase credentials. Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in the .env file.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    // Custom fetch implementation for SSR
    fetch: (...args) => {
      return fetch(...args);
    },
  },
}); 