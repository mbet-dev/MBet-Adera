import React, { useState, useEffect, useRef } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function VerifyOTPScreen() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    const loadRegistrationData = async () => {
      try {
        const data = await AsyncStorage.getItem('registrationData');
        if (data) {
          const parsedData = JSON.parse(data);
          setRegistrationData(parsedData);
          console.log('Loaded registration data:', parsedData);
          
          // Generate initial OTP code
          const initialOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
          const updatedData = {
            ...parsedData,
            otpCode: initialOtpCode,
            timestamp: Date.now()
          };
          
          await AsyncStorage.setItem('registrationData', JSON.stringify(updatedData));
          setRegistrationData(updatedData);
          
          // Show OTP in development
          if (__DEV__) {
            if (Platform.OS === 'web') {
              console.log('Initial OTP Code:', initialOtpCode);
            } else {
              Alert.alert(
                "Initial OTP Code",
                `Your verification code is: ${initialOtpCode}`
              );
            }
          }
        } else {
          console.error('No registration data found');
          setError('Registration data not found. Please try registering again.');
          setTimeout(() => {
            router.replace('/auth/register');
          }, 2000);
        }
      } catch (error) {
        console.error('Error loading registration data:', error);
        setError('Could not load registration data. Please try again.');
      }
    };

    loadRegistrationData();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      value = value[0];
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const resendOtp = async () => {
    if (countdown > 0) return;

    try {
      const newOtpCode = Math.floor(100000 + Math.random() * 900000).toString();

      const updatedRegistrationData = {
        ...registrationData,
        otpCode: newOtpCode,
        timestamp: Date.now() // Update timestamp for rate limiting
      };

      await AsyncStorage.setItem('registrationData', JSON.stringify(updatedRegistrationData));
      setRegistrationData(updatedRegistrationData);
      setCountdown(60);

      if (__DEV__) {
        if (Platform.OS === 'web') {
          console.log('New Development OTP Code:', newOtpCode);
        } else {
          Alert.alert(
            "New Development OTP Code",
            `Your new verification code is: ${newOtpCode}`
          );
        }
      }
    } catch (error) {
      console.error('Error resending OTP:', error);
      setError('Failed to generate new code. Please try again.');
    }
  };

  const handleVerifyOtp = async () => {
    if (!registrationData) {
      setError('Registration data not found. Please try again.');
      return;
    }

    const enteredOtp = otp.join('');
    
    if (enteredOtp.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    if (enteredOtp !== registrationData.otpCode) {
      setError('Invalid verification code. Please try again.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Check if enough time has passed since registration (5 seconds)
      const timeSinceRegistration = Date.now() - registrationData.timestamp;
      if (timeSinceRegistration < 5000) {
        const remainingTime = Math.ceil((5000 - timeSinceRegistration) / 1000);
        setError(`Please wait ${remainingTime} seconds before verifying.`);
        setLoading(false);
        return;
      }

      // First check if email already exists
      const { data: existingUsers, error: emailCheckError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', registrationData.email)
        .limit(1);

      if (emailCheckError) {
        throw new Error('Error checking email availability');
      }

      if (existingUsers && existingUsers.length > 0) {
        throw new Error('Email is already registered');
      }

      // Then check if phone number already exists
      const { data: existingPhones, error: phoneCheckError } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('phone_number', registrationData.phoneNumber)
        .limit(1);

      if (phoneCheckError) {
        throw new Error('Error checking phone number availability');
      }

      if (existingPhones && existingPhones.length > 0) {
        throw new Error('Phone number is already registered');
      }

      // Create the user with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: registrationData.email,
        password: registrationData.password,
        options: {
          data: {
            first_name: registrationData.firstName,
            last_name: registrationData.lastName,
            full_name: registrationData.fullName,
            phone_number: registrationData.phoneNumber
          }
        }
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        if (signUpError.message.includes('Email address is invalid')) {
          throw new Error('Please use a valid email address from a supported domain');
        }
        throw signUpError;
      }

      if (!authData.user?.id) {
        throw new Error('Failed to create user account');
      }

      console.log('Created auth user:', authData.user);

      // Create profile manually if it doesn't exist
      const { error: profileError } = await supabase
          .from('profiles')
        .insert([
          {
            id: authData.user.id,
            email: registrationData.email,
            first_name: registrationData.firstName,
            last_name: registrationData.lastName,
            full_name: registrationData.fullName,
            phone_number: registrationData.phoneNumber,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw new Error('Failed to create user profile');
        }

      // Verify the profile was created
      const { data: profile, error: profileCheckError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

      if (profileCheckError || !profile) {
        console.error('Profile verification error:', profileCheckError);
          throw new Error('Failed to verify profile creation');
        }

        console.log('Created profile:', profile);

        // Clean up registration data
        await AsyncStorage.removeItem('registrationData');

        // Show success message and redirect
        const successMessage = "Your account has been created successfully! Please check your email to verify your account before logging in.";
        
        Alert.alert(
          "Registration Successful",
          successMessage,
          [{ text: "OK", onPress: () => router.replace('/auth/login') }]
        );
    } catch (error: any) {
      console.error('Verification error:', error);
      setError(error.message || 'An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Verify Your Phone</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit verification code to{' '}
          <Text style={styles.phoneText}>{registrationData?.phoneNumber || 'your phone'}</Text>
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.otpContainer}>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={styles.otpInput}
              value={otp[index]}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="numeric"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerifyOtp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify & Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive code? </Text>
          {countdown > 0 ? (
            <Text style={styles.countdown}>Resend in {countdown}s</Text>
          ) : (
            <TouchableOpacity onPress={resendOtp}>
              <Text style={styles.resendLink}>Resend Code</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
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
    paddingHorizontal: 20,
  },
  phoneText: {
    fontWeight: 'bold',
    color: '#333',
  },
  error: {
    color: '#f44336',
    marginBottom: 20,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    backgroundColor: '#f5f5f5',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  resendText: {
    color: '#666',
    fontSize: 14,
  },
  resendLink: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  countdown: {
    color: '#999',
    fontSize: 14,
  },
  backButton: {
    marginTop: 30,
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 