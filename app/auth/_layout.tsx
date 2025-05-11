import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

export default function AuthLayout() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    // Handle deep linking
    if (params.redirect) {
      // Store the redirect URL for after authentication
      localStorage.setItem('authRedirect', params.redirect as string);
    }
  }, [params]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: '#fff',
        },
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          title: 'Sign In',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: 'Sign Up',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: 'Forgot Password',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="verify-otp"
        options={{
          title: 'Verify OTP',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="reset-password"
        options={{
          title: 'Reset Password',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
