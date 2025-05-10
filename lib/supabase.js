import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yuveusgxmpgcwmmsvkyj.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1dmV1c2d4bXBnY3dtbXN2a3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODQyMTA3MTcsImV4cCI6MTk5OTc4NjcxN30.EjvVnz5Iy_vc9vMwkZ77ZdNGM_UuMtjOIRzn0xmJL9U';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase credentials. Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in the .env file.'
  );
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
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

// Debug log to confirm client creation
console.log('Supabase client initialized with URL:', supabaseUrl); 