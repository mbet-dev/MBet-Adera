import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+251');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    general: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  const validatePhoneNumber = (phone: string) => {
    // Ethiopian phone number: +251 followed by 9 digits
    const phoneRegex = /^\+251[0-9]{9}$/;
    return phoneRegex.test(phone);
  };
  
  const validatePassword = (password: string) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };
  
  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      general: ''
    };
    
    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
      isValid = false;
    }
    
    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      isValid = false;
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }
    
    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
      isValid = false;
    } else if (!validatePhoneNumber(phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid Ethiopian phone number (+251 followed by 9 digits)';
      isValid = false;
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 8 characters and include uppercase, lowercase, and numbers';
      isValid = false;
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleRegister = async () => {
    try {
      // Reset general error
      setErrors(prev => ({...prev, general: ''}));
      
      // Validate all fields
      if (!validateForm()) {
        return;
      }
      
      setLoading(true);

      // Format phone number to ensure it starts with +251
      let formattedPhone = phoneNumber;
      if (!formattedPhone.startsWith('+251')) {
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '+251' + formattedPhone.slice(1);
        } else if (formattedPhone.startsWith('251')) {
          formattedPhone = '+' + formattedPhone;
        } else {
          setErrors(prev => ({...prev, phoneNumber: 'Please enter a valid Ethiopian phone number (+251XXXXXXXXX)'}));
          return;
        }
      }

      // Check if email exists
      const { data: existingUsers, error: emailCheckError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .limit(1);

      if (emailCheckError) {
        console.error('Error checking email:', emailCheckError);
        setErrors(prev => ({...prev, general: 'An error occurred while checking email availability'}));
        return;
      }

      if (existingUsers && existingUsers.length > 0) {
        setErrors(prev => ({...prev, email: 'Email is already registered'}));
        return;
      }

      // Check if phone number exists
      const { data: existingPhones, error: phoneCheckError } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('phone_number', formattedPhone)
        .limit(1);

      if (phoneCheckError) {
        console.error('Error checking phone:', phoneCheckError);
        setErrors(prev => ({...prev, general: 'An error occurred while checking phone number availability'}));
        return;
      }

      if (existingPhones && existingPhones.length > 0) {
        setErrors(prev => ({...prev, phoneNumber: 'Phone number is already registered'}));
        return;
      }

      // Generate OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Combine first and last name for full name
      const fullName = `${firstName} ${lastName}`;
      
      // Store registration data in AsyncStorage
      const registrationData = {
        email,
        password,
        firstName,
        lastName,
        fullName,
        phoneNumber: formattedPhone,
        otpCode,
        timestamp: Date.now()
      };

      await AsyncStorage.setItem('registrationData', JSON.stringify(registrationData));

      // In development, log the OTP
      if (__DEV__) {
        if (Platform.OS === 'web') {
          console.log('Development OTP:', otpCode);
        } else {
          Alert.alert(
            "Development OTP Code",
            `Your verification code is: ${otpCode}`,
            [{ text: "OK", onPress: () => router.push('/auth/verify-otp') }]
          );
        }
      } else {
        router.push('/auth/verify-otp');
      }

    } catch (error: any) {
      console.error('Registration error:', error);
      setErrors(prev => ({...prev, general: error.message || 'An error occurred during registration'}));
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (text: string) => {
    // Remove any non-digit characters except '+'
    let cleaned = text.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +251
    if (!cleaned.startsWith('+251')) {
      cleaned = '+251';
    }
    
    // Limit to maximum length of Ethiopian phone number (+251 + 9 digits)
    cleaned = cleaned.slice(0, 13);
    
    setPhoneNumber(cleaned);
  };

  // Helper to render a required field indicator
  const requiredField = () => (
    <Text style={styles.requiredIndicator}>*</Text>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up to get started with MBet-Adera</Text>

        {errors.general ? <Text style={styles.errorMessage}>{errors.general}</Text> : null}

        <View style={styles.inputContainer}>
          <View style={styles.labelContainer}>
            <Text style={styles.inputLabel}>First Name</Text>
            {requiredField()}
          </View>
          <TextInput
            style={[styles.input, errors.firstName ? styles.inputError : null]}
            placeholder="Enter your first name"
            value={firstName}
            onChangeText={setFirstName}
            accessibilityLabel="First Name Input"
          />
          {errors.firstName ? <Text style={styles.fieldError}>{errors.firstName}</Text> : null}
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.labelContainer}>
            <Text style={styles.inputLabel}>Last Name</Text>
            {requiredField()}
          </View>
          <TextInput
            style={[styles.input, errors.lastName ? styles.inputError : null]}
            placeholder="Enter your last name"
            value={lastName}
            onChangeText={setLastName}
            accessibilityLabel="Last Name Input"
          />
          {errors.lastName ? <Text style={styles.fieldError}>{errors.lastName}</Text> : null}
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.labelContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            {requiredField()}
          </View>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            placeholder="Enter your email address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            accessibilityLabel="Email Input"
          />
          {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.labelContainer}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            {requiredField()}
          </View>
          <Text style={styles.phoneLabel}>Format: +251-9XX-XX XX XX</Text>
          <TextInput
            style={[styles.input, styles.phoneInput, errors.phoneNumber ? styles.inputError : null]}
            value={phoneNumber}
            onChangeText={formatPhoneNumber}
            keyboardType="phone-pad"
            maxLength={13}
            accessibilityLabel="Phone Number Input"
          />
          {errors.phoneNumber ? <Text style={styles.fieldError}>{errors.phoneNumber}</Text> : null}
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.labelContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            {requiredField()}
          </View>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput, errors.password ? styles.inputError : null]}
              placeholder="Enter your password"
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
          {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
          <Text style={styles.passwordRequirements}>
            Password must have at least 8 characters, including uppercase, lowercase, and numbers
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.labelContainer}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            {requiredField()}
          </View>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput, errors.confirmPassword ? styles.inputError : null]}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              accessibilityLabel="Confirm Password Input"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off' : 'eye'}
                size={24}
                color="#666"
              />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword ? <Text style={styles.fieldError}>{errors.confirmPassword}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
          accessibilityLabel="Register Button"
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity 
            onPress={() => router.push('/auth/login')}
            accessibilityLabel="Sign In Link"
            accessibilityRole="link"
          >
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingTop: 40,
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
  inputContainer: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginRight: 4,
  },
  requiredIndicator: {
    color: '#f44336',
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputError: {
    borderColor: '#f44336',
    borderWidth: 1,
    backgroundColor: 'rgba(244, 67, 54, 0.05)',
  },
  errorMessage: {
    color: '#f44336',
    marginBottom: 20,
    textAlign: 'center',
    padding: 10,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 5,
  },
  fieldError: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  footerLink: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  phoneLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    marginLeft: 2,
  },
  phoneInput: {
    letterSpacing: 1,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 50, // Make room for the eye icon
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
  },
  passwordRequirements: {
    fontSize: 11,
    color: '#666',
    marginTop: 5,
    marginLeft: 5,
    fontStyle: 'italic',
  },
});
