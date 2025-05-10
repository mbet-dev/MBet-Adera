import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Create the Auth Context
const AuthContext = createContext({
  user: null,
  isLoading: false,
  signIn: async () => {},
  signOut: async () => {},
});

// Auth Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize with one of the users from the database
  useEffect(() => {
    setUser({
      id: '63d01adb-4254-4088-90a6-bb49fe657222', // This matches a sender_id in the actual database
      email: 'customer2@mbetadera.com',
      phone: '+251912345678',
      full_name: 'Customer Two',
    });
    setIsLoading(false);
  }, []);

  // Mock sign in function
  const signIn = async (email, password) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use a real user ID from the database
      setUser({
        id: '63d01adb-4254-4088-90a6-bb49fe657222', // This matches a sender_id in the actual database
        email: email || 'customer2@mbetadera.com',
        phone: '+251912345678',
        full_name: 'Customer Two',
      });
      
      return { user: user, error: null };
    } catch (error) {
      return { user: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Mock sign out function
  const signOut = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setUser(null);
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 