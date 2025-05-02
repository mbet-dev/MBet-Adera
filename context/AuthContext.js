import React, { createContext, useContext, useState } from 'react';

// Create the Auth Context
const AuthContext = createContext({
  user: null,
  isLoading: false,
  signIn: async () => {},
  signOut: async () => {},
});

// Auth Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({
    id: 'mock-user-123',
    email: 'user@example.com',
    phone: '+251912345678',
    full_name: 'Test User',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Mock sign in function
  const signIn = async (email, password) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUser({
        id: 'mock-user-123',
        email,
        phone: '+251912345678',
        full_name: 'Test User',
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