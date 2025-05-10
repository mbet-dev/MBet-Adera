import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSession } from '@components/SessionProvider';

// Import your screens here
import LoginScreen from '../app/(auth)/login';
import RegisterScreen from '../app/(auth)/register';
import HomeScreen from '../app/(tabs)/home';
import ProfileScreen from '../app/(tabs)/profile';
import OrdersScreen from '../app/(tabs)/orders';
import TrackMapScreen from '../app/track-map';
import CreateDeliveryScreen from '../app/create-delivery';
import DepositScreen from '../app/deposit';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="home" component={HomeScreen} />
      <Tab.Screen name="orders" component={OrdersScreen} />
      <Tab.Screen name="profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { session } = useSession();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!session ? (
        // Auth Stack
        <>
          <Stack.Screen name="login" component={LoginScreen} />
          <Stack.Screen name="register" component={RegisterScreen} />
        </>
      ) : (
        // Main App Stack
        <>
          <Stack.Screen name="(tabs)" component={TabNavigator} />
          <Stack.Screen name="track-map" component={TrackMapScreen} />
          <Stack.Screen name="create-delivery" component={CreateDeliveryScreen} />
          <Stack.Screen name="deposit" component={DepositScreen} />
        </>
      )}
    </Stack.Navigator>
  );
} 