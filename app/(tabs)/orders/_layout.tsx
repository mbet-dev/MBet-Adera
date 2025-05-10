import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function OrdersLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "My Orders",
          headerShown: Platform.OS !== 'web',
        }}
      />
      <Stack.Screen
        name="enhanced-orders"
        options={{
          title: "My Orders",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Order Details",
        }}
      />
    </Stack>
  );
} 