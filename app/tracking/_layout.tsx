import { Stack } from 'expo-router';

export default function TrackingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#4CAF50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Track Parcel',
          headerBackTitle: 'Back',
        }}
      />
    </Stack>
  );
} 