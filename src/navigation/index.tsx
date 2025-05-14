import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

// Screens
import Login from '../screens/auth/Login';
import Register from '../screens/auth/Register';
import ForgotPassword from '../screens/auth/ForgotPassword';
import NewDelivery from '../screens/main/NewDelivery';
import HomeNew from '../screens/main/HomeNew';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const Navigation = () => {
  const isAuthenticated = false; // TODO: Replace with actual auth state

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Register" component={Register} />
            <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
            <Stack.Screen name="NewDelivery" component={NewDelivery} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={HomeNew} />
            <Stack.Screen name="NewDelivery" component={NewDelivery} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
