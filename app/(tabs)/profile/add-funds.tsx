import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
} from 'react-native';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../src/services/supabase';

// Placeholder for formatting utility - replace with actual implementation
const formatCurrency = (amount: number): string => {
  return `ETB ${amount.toFixed(2)}`;
};

type PaymentMethod = 'yenepay' | 'telebirr' | 'cash';

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  icon: string;
}

const paymentMethods: PaymentMethodOption[] = [
  { id: 'yenepay', name: 'YenePay', icon: 'card-outline' },
  { id: 'telebirr', name: 'TeleBirr', icon: 'phone-portrait-outline' },
  { id: 'cash', name: 'Cash Deposit', icon: 'cash-outline' },
];

const predefinedAmounts: number[] = [100, 500, 1000, 2000, 5000];

export default function AddFundsScreen() {
  const [amount, setAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      title: 'Add Funds',
      headerShown: true,
    });
  }, []);

  const selectAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleAddFunds = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (!selectedMethod) {
      Alert.alert('Payment Method Required', 'Please select a payment method');
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'You must be logged in to add funds');
        return;
      }

      // In a real app, we would integrate with actual payment processors here
      // For demonstration, we'll simulate a successful payment
      
      // For YenePay or TeleBirr, you would redirect to their payment pages
      if (selectedMethod === 'yenepay' || selectedMethod === 'telebirr') {
        // Simulate payment processing with a delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // On successful payment, add to wallet
        await addToWallet(user.id, parseFloat(amount));
      } else if (selectedMethod === 'cash') {
        // For cash deposits, add to wallet directly (in real app, this would be handled by admin)
        await addToWallet(user.id, parseFloat(amount));
      }

      Alert.alert(
        'Success',
        `${formatCurrency(parseFloat(amount))} has been added to your wallet`,
        [
          { 
            text: 'View Wallet', 
            onPress: () => router.replace('/profile/wallet') 
          }
        ]
      );
    } catch (error) {
      console.error('Error adding funds:', error);
      Alert.alert('Error', 'Failed to add funds. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const addToWallet = async (userId: string, amount: number) => {
    // Call the add_funds stored procedure
    const { error } = await supabase.rpc('add_funds', {
      amount: amount,
      user_id: userId
    });

    if (error) throw error;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.amountContainer}>
            <Text style={styles.label}>Enter Amount</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>ETB</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                maxLength={10}
              />
            </View>
          </View>
          
          <View style={styles.quickAmountsContainer}>
            <Text style={styles.label}>Quick Select</Text>
            <View style={styles.quickAmounts}>
              {predefinedAmounts.map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.quickAmountButton,
                    amount === value.toString() && styles.selectedAmountButton,
                  ]}
                  onPress={() => selectAmount(value)}
                >
                  <Text style={[
                    styles.quickAmountText,
                    amount === value.toString() && styles.selectedAmountText,
                  ]}>
                    {formatCurrency(value)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.methodsContainer}>
            <Text style={styles.label}>Payment Method</Text>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodButton,
                  selectedMethod === method.id && styles.selectedMethodButton,
                ]}
                onPress={() => setSelectedMethod(method.id)}
              >
                <Ionicons
                  name={method.icon as any}
                  size={24}
                  color={selectedMethod === method.id ? '#FFFFFF' : '#333333'}
                />
                <Text style={[
                  styles.methodText,
                  selectedMethod === method.id && styles.selectedMethodText,
                ]}>
                  {method.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.addButton,
              (!amount || !selectedMethod || loading) && styles.disabledButton,
            ]}
            onPress={handleAddFunds}
            disabled={!amount || !selectedMethod || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.addButtonText}>
                Add {amount ? formatCurrency(parseFloat(amount)) : 'Funds'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  amountContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    padding: 16,
  },
  quickAmountsContainer: {
    marginBottom: 24,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAmountButton: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  selectedAmountButton: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  quickAmountText: {
    fontSize: 16,
    color: '#333333',
  },
  selectedAmountText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  methodsContainer: {
    marginBottom: 24,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  selectedMethodButton: {
    backgroundColor: '#4CAF50',
  },
  methodText: {
    fontSize: 16,
    marginLeft: 16,
    color: '#333333',
  },
  selectedMethodText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 