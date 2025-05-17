import React from 'react';
import { Stack } from 'expo-router';
import MyOrdersScreen from '../src/screens/orders/MyOrdersScreen';
import Colors from '../constants/Colors';

export default function MyOrdersRoute() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'My Orders', 
          headerStyle: { backgroundColor: Colors.light.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <MyOrdersScreen />
    </>
  );
}

// To make MyOrdersScreen available at /my-orders route
// We need to export the component directly in a file like app/my-orders.tsx
// This current file structure using Stack.Screen name="index" is for a layout route.
// Let's create a simple file that exports MyOrdersScreen directly for the route. 