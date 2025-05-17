import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { ActivityIndicator, View } from 'react-native';

// Screens
import Login from '../screens/auth/Login';
import Register from '../screens/auth/Register';
import ForgotPassword from '../screens/auth/ForgotPassword';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import NewDelivery from '../screens/main/NewDelivery';
import HomeNew from '../screens/main/HomeNew';
import SettingsScreen from '../screens/main/SettingsScreen';

// Utils
import { isFirstLaunch } from '../utils/onboardingUtils';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const Navigation = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // TODO: Replace with actual auth state
  const [firstLaunch, setFirstLaunch] = useState(false);

  useEffect(() => {
    // Check if this is the first app launch
    const checkFirstLaunch = async () => {
      try {
        const isFirst = await isFirstLaunch();
        setFirstLaunch(isFirst);
      } catch (error) {
        console.error("Error checking first launch:", error);
        setFirstLaunch(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkFirstLaunch();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {firstLaunch ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : !isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Register" component={Register} />
            <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={HomeNew} />
            <Stack.Screen name="NewDelivery" component={NewDelivery} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
