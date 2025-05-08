import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

// Initialize Supabase with error handling
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please check your environment variables.');
  throw new Error('Missing Supabase configuration');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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