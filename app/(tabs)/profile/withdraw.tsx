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

type WithdrawalMethod = 'bank' | 'telebirr' | 'cash';

interface WithdrawalMethodOption {
  id: WithdrawalMethod;
  name: string;
  icon: string;
}

const withdrawalMethods: WithdrawalMethodOption[] = [
  { id: 'bank', name: 'Bank Transfer', icon: 'card-outline' },
  { id: 'telebirr', name: 'TeleBirr', icon: 'phone-portrait-outline' },
  { id: 'cash', name: 'Cash Pickup', icon: 'cash-outline' },
];

export default function WithdrawScreen() {
  const [amount, setAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<WithdrawalMethod | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [balance, setBalance] = useState<number>(0);
  const [accountNumber, setAccountNumber] = useState<string>('');
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      title: 'Withdraw Funds',
      headerShown: true,
    });

    fetchWalletBalance();
  }, []);

  const fetchWalletBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setBalance(data.wallet_balance || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      Alert.alert('Error', 'Failed to fetch your wallet balance.');
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > balance) {
      Alert.alert('Insufficient Balance', 'Your withdrawal amount exceeds your available balance');
      return;
    }

    if (!selectedMethod) {
      Alert.alert('Withdrawal Method Required', 'Please select a withdrawal method');
      return;
    }

    if (selectedMethod !== 'cash' && !accountNumber) {
      Alert.alert('Account Details Required', 'Please enter your account number or mobile money number');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'You must be logged in to withdraw funds');
        return;
      }

      // In a real app, we would integrate with actual withdrawal services
      // For demonstration, we'll simulate a successful withdrawal
      
      await withdrawFromWallet(user.id, parseFloat(amount));

      Alert.alert(
        'Withdrawal Request Submitted',
        `Your request to withdraw ${formatCurrency(parseFloat(amount))} has been submitted successfully. It will be processed within 24 hours.`,
        [
          { 
            text: 'View Wallet', 
            onPress: () => router.replace('/profile/wallet') 
          }
        ]
      );
    } catch (error) {
      console.error('Error withdrawing funds:', error);
      Alert.alert('Error', 'Failed to process withdrawal. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const withdrawFromWallet = async (userId: string, amount: number) => {
    // Call the withdraw_funds stored procedure
    const { error } = await supabase.rpc('withdraw_funds', {
      amount: amount,
      user_id: userId
    });

    if (error) throw error;
  };

  const maxWithdrawal = Math.max(0, balance - 50); // Keep minimum 50 ETB in wallet

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
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
          </View>
          
          <View style={styles.amountContainer}>
            <Text style={styles.label}>Withdrawal Amount</Text>
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
            <TouchableOpacity
              style={styles.maxButton}
              onPress={() => setAmount(maxWithdrawal.toString())}
            >
              <Text style={styles.maxButtonText}>Withdraw Max</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.methodsContainer}>
            <Text style={styles.label}>Withdrawal Method</Text>
            {withdrawalMethods.map((method) => (
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
          
          {selectedMethod && selectedMethod !== 'cash' && (
            <View style={styles.accountContainer}>
              <Text style={styles.label}>
                {selectedMethod === 'bank' ? 'Bank Account Number' : 'TeleBirr Number'}
              </Text>
              <TextInput
                style={styles.accountInput}
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder={selectedMethod === 'bank' ? 'Enter your account number' : 'Enter your TeleBirr number'}
                keyboardType="numeric"
              />
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.withdrawButton,
              (!amount || !selectedMethod || parseFloat(amount) > balance || loading) && styles.disabledButton,
            ]}
            onPress={handleWithdraw}
            disabled={!amount || !selectedMethod || parseFloat(amount) > balance || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.withdrawButtonText}>
                Withdraw {amount ? formatCurrency(parseFloat(amount)) : 'Funds'}
              </Text>
            )}
          </TouchableOpacity>
          
          <Text style={styles.disclaimerText}>
            Note: Withdrawals are processed within 24 hours. A minimum balance of ETB 50.00 is required in your wallet.
          </Text>
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
  balanceContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
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
  balanceLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
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
  maxButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  maxButtonText: {
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
  accountContainer: {
    marginBottom: 24,
  },
  accountInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
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
  withdrawButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  withdrawButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 24,
  },
}); 