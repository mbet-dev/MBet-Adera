import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        presentation: 'modal',
        animation: 'slide_from_bottom',
        headerTintColor: '#ffffff',
        headerStyle: {
          backgroundColor: '#1976D2',
        },
      }}
    />
  );
} 