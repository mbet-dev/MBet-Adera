import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorHandler } from '../../src/utils/errorHandler';
import { validationService, validationSchemas } from '../../src/utils/validation';
import { rateLimiter, getDeviceIdentifier } from '../../src/utils/rateLimiter';
import { sessionManager } from '../../src/utils/sessionManager';
import Colors from '../../constants/Colors';

const debugLog = (message: string, data?: any) => {
  if (!__DEV__) return;
  console.log(`[LOGIN DEBUG] ${message}`, data ? data : '');
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  useEffect(() => {
    // Initialize session manager
    sessionManager.initialize();
    
    // Set up session timeout warning
    sessionManager.setWarningCallback(() => {
      Alert.alert(
        'Session Expiring',
        'Your session will expire soon. Would you like to stay logged in?',
        [
          {
            text: 'Stay Logged In',
            onPress: () => sessionManager.resetSession()
          },
          {
            text: 'Log Out',
            onPress: () => router.replace('/auth/login')
          }
        ]
      );
    });

    // Check remaining login attempts
    checkRemainingAttempts();

    return () => {
      sessionManager.cleanup();
    };
  }, []);

  const checkRemainingAttempts = async () => {
    try {
      const deviceId = await getDeviceIdentifier();
      const attempts = await rateLimiter.getRemainingAttempts('auth', deviceId);
      setRemainingAttempts(attempts);
    } catch (error) {
      errorHandler.handleError(error, 'LoginScreen');
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');

      // Validate input
      const validationResult = validationService.validateObject(
        { email, password },
        validationSchemas.login
      );

      if (!validationResult.isValid) {
        const errorMessage = validationResult.errors
          .map(error => error.message)
          .join('\n');
        throw new Error(errorMessage);
      }

      // Check rate limit
      const deviceId = await getDeviceIdentifier();
      const rateLimitResult = await rateLimiter.checkRateLimit('auth', deviceId);
      
      if (!rateLimitResult.allowed) {
        const minutes = Math.ceil((rateLimitResult.blockedUntil! - Date.now()) / 60000);
        throw new Error(`Too many login attempts. Please try again in ${minutes} minutes.`);
      }

      setRemainingAttempts(rateLimitResult.remainingAttempts);

      debugLog('Attempting login with credentials');
      
      // Attempt login
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Reset rate limit on successful login
      const deviceIdForReset = await getDeviceIdentifier();
      await rateLimiter.resetRateLimit('auth', deviceIdForReset);
      debugLog('Login successful, rate limit reset');
      
      // Reset session
      await sessionManager.resetSession();
      debugLog('Session manager reset complete');

      // Store session indicator
      try {
        await AsyncStorage.setItem('HAS_ACTIVE_SESSION', 'true');
        debugLog('Session flag stored in AsyncStorage');
      } catch (storageError) {
        console.error('Failed to store session flag:', storageError);
        // Continue without throwing, as this is not critical
      }

      // Let AuthContext handle navigation instead of navigating directly
      // This avoids navigation conflicts between login screen and AuthContext
      debugLog('Login successful - AuthContext will handle navigation');
      
      // No direct navigation here - AuthContext will handle it via auth state change
    } catch (error) {
      errorHandler.handleError(error, 'LoginScreen');
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred during login');
      }
      debugLog('Login failed', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/auth/forgot-password');
  };

  const handleSignUp = () => {
    router.push('/auth/register');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Login to continue with MBet-Adera</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            accessibilityLabel="Email Input"
          />
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              accessibilityLabel="Password Input"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={24}
                color="#666"
              />
            </TouchableOpacity>
          </View>
        </View>

        {remainingAttempts !== null && remainingAttempts < 3 && (
          <Text style={styles.warning}>
            {remainingAttempts} login attempts remaining
          </Text>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotPassword}
          onPress={handleForgotPassword}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={handleSignUp}>
            <Text style={styles.registerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
        
        {/* Hint for using the default password if users are experiencing issues */}
        <View style={styles.syncHintContainer}>
          <Text style={styles.syncHintText}>
            Having trouble logging in? Try using the password "MBet@2023"
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    maxWidth: Platform.OS === 'web' ? 500 : '100%',
    alignSelf: Platform.OS === 'web' ? 'center' : 'stretch', 
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#4CAF50',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  error: {
    color: '#f44336',
    marginBottom: 20,
    textAlign: 'center',
    padding: 10,
    backgroundColor: '#ffebee',
    borderRadius: 5,
  },
  inputContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  input: {
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: '#666',
    fontSize: 14,
  },
  registerLink: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  syncHintContainer: {
    marginTop: 30,
    padding: 10,
    backgroundColor: '#e8f5e9',
    borderRadius: 5,
  },
  syncHintText: {
    color: '#388e3c',
    fontSize: 12,
    textAlign: 'center',
  },
  warning: {
    color: Colors.light.error,
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center'
  }
});
