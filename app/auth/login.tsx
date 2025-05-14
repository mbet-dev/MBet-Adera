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

      // Clear ALL previous session data first to prevent conflicts between users
      await Promise.all([
        AsyncStorage.removeItem('HAS_ACTIVE_SESSION'),
        AsyncStorage.removeItem('AUTH_REDIRECT_HOME'),
        AsyncStorage.removeItem('NAVIGATION_IN_PROGRESS'),
        AsyncStorage.removeItem('auth_session_active'),
        AsyncStorage.removeItem('supabase.auth.token'),
        AsyncStorage.removeItem('sb-jaqwviuxhxsxypmffece-auth-token'),
        AsyncStorage.removeItem('session_state')
      ]);
      debugLog('Cleared all previous session data');

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

      // Store session indicator with force flag to ensure navigation happens
      try {
        await AsyncStorage.setItem('HAS_ACTIVE_SESSION', 'true');
        await AsyncStorage.setItem('AUTH_REDIRECT_HOME', 'true');
        await AsyncStorage.setItem('FORCE_NAVIGATION', 'true'); // Add this force flag
        await AsyncStorage.setItem('NAVIGATION_IN_PROGRESS', 'false');
        debugLog('Session flags stored in AsyncStorage');
      } catch (storageError) {
        console.error('Failed to store session flags:', storageError);
        // Continue without throwing, as this is not critical
      }

      // Trigger a manual refresh for the AuthContext
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          debugLog('Successfully retrieved session after login');
        }
      } catch (refreshError) {
        debugLog('Error refreshing session:', refreshError);
      }

      // Let AuthContext handle navigation instead of navigating directly
      // This avoids navigation conflicts between login screen and AuthContext
      debugLog('Login successful - AuthContext will handle navigation');
      
      // Always force navigation with more aggressive fallbacks
      setTimeout(async () => {
        try {
          // Always attempt navigation regardless of current screen
          debugLog('Executing forced navigation to home');
          
          // Direct replacement attempt
          try {
            router.replace('/(tabs)');
            debugLog('Primary navigation successful');
          } catch (replaceError) {
            debugLog('Replace navigation failed, trying alternative', replaceError);
            
            // Complex cascade of fallbacks for different navigation issues
            setTimeout(() => {
              try {
                router.navigate('/(tabs)');
                debugLog('Navigate fallback successful');
              } catch (navError) {
                debugLog('Navigate failed, trying specific tab', navError);
                
                setTimeout(() => {
                  try {
                    // Try specific tab page
                    router.replace('/(tabs)/home');
                    debugLog('Specific tab navigation successful');
                  } catch (specificError) {
                    // Last resort - reset and push
                    debugLog('Specific tab failed, trying final method', specificError);
                    
                    setTimeout(() => {
                      try {
                        // Clear any navigation flags that might be causing issues
                        AsyncStorage.setItem('NAVIGATION_IN_PROGRESS', 'false')
                          .catch(e => debugLog('Error clearing navigation flag', e));
                        
                        // Use the most basic navigation method
                        router.push('/(tabs)/home');
                        debugLog('Final navigation attempt executed');
                      } catch (finalError) {
                        debugLog('All navigation attempts failed', finalError);
                      }
                    }, 300);
                  }
                }, 300);
              }
            }, 500);
          }
        } catch (navError) {
          debugLog('Navigation error in fallback handler', navError);
        }
      }, 1500); // Reduced timeout for faster response
      
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
