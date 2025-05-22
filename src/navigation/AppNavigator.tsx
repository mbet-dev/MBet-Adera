import React from 'react';
import { Slot } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function AppNavigator() {
  const { user } = useAuth();

  // The navigation is handled by Expo Router
  // We just need to wrap the app with the necessary providers
  return <Slot />;
} 