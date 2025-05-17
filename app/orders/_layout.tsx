import { Stack } from 'expo-router';
import Colors from '../../constants/Colors'; // Path from app/orders/_layout.tsx

export default function OrdersLayout() {
  return (
    <Stack>
      {/* 
        If you have an index screen for orders (e.g., app/orders/index.tsx for a list),
        define it here as well. For now, focusing on the [id] screen as a modal.
        Example:
        <Stack.Screen name="index" options={{ title: 'My Orders' }} /> 
      */}
      <Stack.Screen 
        name="[id]" 
        options={{
          title: 'Parcel Details', // Default title, will be overridden in the screen itself
          presentation: 'modal',
          headerStyle: { backgroundColor: (Colors.light && Colors.light.primary) || '#007bff' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
    </Stack>
  );
} 