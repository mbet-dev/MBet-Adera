import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  RefreshControl,
  Pressable,
  Alert,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '../../../src/components/ThemedText';
import { ThemedView } from '../../../src/components/ThemedView';
import Colors from '../../../constants/Colors';
import { walletService, Transaction } from '../../../src/services/walletService';

export default function WalletScreen() {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [addFundsModalVisible, setAddFundsModalVisible] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>('');
  const [processingPayment, setProcessingPayment] = useState<boolean>(false);
  
  useEffect(() => {
    loadWalletData();
  }, []);
  
  const loadWalletData = async () => {
    setLoading(true);
    
    try {
      // Get wallet balance
      const { balance, error: balanceError } = await walletService.getBalance();
      if (balanceError) throw balanceError;
      setBalance(balance);
      
      // Get transaction history
      const { transactions, error: transactionsError } = await walletService.getTransactionHistory();
      if (transactionsError) throw transactionsError;
      setTransactions(transactions);
    } catch (error) {
      console.error('Error loading wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadWalletData();
  };
  
  const handleAddFunds = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    setProcessingPayment(true);
    
    try {
      // Add funds to wallet
      const { success, error } = await walletService.addFunds(parseFloat(amount), 'TeleBirr');
      
      if (!success) throw error;
      
      // Success
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Funds added to your wallet');
      setAmount('');
      setAddFundsModalVisible(false);
      loadWalletData();
    } catch (error) {
      console.error('Error adding funds:', error);
      Alert.alert('Error', 'Failed to add funds to wallet');
    } finally {
      setProcessingPayment(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatAmount = (amount: number, type: string) => {
    return `${type === 'deposit' ? '+' : '-'} ETB ${amount.toFixed(2)}`;
  };
  
  const getTransactionStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return Colors.light.success;
      case 'pending': return Colors.light.warning;
      case 'failed': return Colors.light.error;
      default: return Colors.light.textSecondary;
    }
  };
  
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return 'add-circle';
      case 'payment': return 'cart';
      case 'withdrawal': return 'cash';
      default: return 'cash';
    }
  };
  
  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionIconContainer}>
        <Ionicons 
          name={getTransactionIcon(item.type)} 
          size={24} 
          color={item.type === 'deposit' ? Colors.light.success : Colors.light.primary} 
        />
      </View>
      <View style={styles.transactionDetails}>
        <ThemedText style={styles.transactionDescription}>{item.description}</ThemedText>
        <ThemedText style={styles.transactionDate}>{formatDate(item.created_at)}</ThemedText>
      </View>
      <View style={styles.transactionAmountContainer}>
        <ThemedText 
          style={[
            styles.transactionAmount, 
            { color: item.type === 'deposit' ? Colors.light.success : Colors.light.primary }
          ]}
        >
          {formatAmount(item.amount, item.type)}
        </ThemedText>
        <View style={[styles.transactionStatus, { backgroundColor: getTransactionStatusColor(item.status) }]}>
          <ThemedText style={styles.transactionStatusText}>{item.status}</ThemedText>
        </View>
      </View>
    </View>
  );
  
  const EmptyTransactions = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="wallet-outline" size={64} color={Colors.light.textSecondary} />
      <ThemedText style={styles.emptyText}>No transactions yet</ThemedText>
      <ThemedText style={styles.emptySubtext}>Add funds to get started</ThemedText>
    </View>
  );
  
  return (
    <>
      <Stack.Screen options={{ title: 'My Wallet' }} />
      
      <ThemedView style={styles.container}>
        {loading && !refreshing ? (
          <ActivityIndicator style={styles.loader} size="large" color={Colors.light.primary} />
        ) : (
          <>
            <View style={styles.balanceCard}>
              <ThemedText style={styles.balanceLabel}>Current Balance</ThemedText>
              <ThemedText style={styles.balanceAmount}>ETB {balance.toFixed(2)}</ThemedText>
              <Pressable style={styles.addFundsButton} onPress={() => setAddFundsModalVisible(true)}>
                <Ionicons name="add" size={20} color="#fff" />
                <ThemedText style={styles.addFundsButtonText}>Add Funds</ThemedText>
              </Pressable>
            </View>
            
            <View style={styles.transactionsContainer}>
              <ThemedText style={styles.sectionTitle}>Transaction History</ThemedText>
              
              <FlatList
                data={transactions}
                renderItem={renderTransaction}
                keyExtractor={(item) => item.id}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[Colors.light.primary]}
                    tintColor={Colors.light.primary}
                  />
                }
                ListEmptyComponent={EmptyTransactions}
                contentContainerStyle={transactions.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
              />
            </View>
          </>
        )}
        
        <Modal
          visible={addFundsModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setAddFundsModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Add Funds</ThemedText>
                <Pressable onPress={() => setAddFundsModalVisible(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={Colors.light.text} />
                </Pressable>
              </View>
              
              <View style={styles.paymentMethodContainer}>
                <ThemedText style={styles.paymentLabel}>Payment Method</ThemedText>
                <View style={styles.paymentMethod}>
                  <Ionicons name="phone-portrait" size={24} color={Colors.light.primary} />
                  <ThemedText style={styles.paymentMethodText}>TeleBirr</ThemedText>
                </View>
              </View>
              
              <View style={styles.amountContainer}>
                <ThemedText style={styles.amountLabel}>Amount (ETB)</ThemedText>
                <TextInput
                  style={styles.amountInput}
                  placeholder="Enter amount"
                  placeholderTextColor={Colors.light.textSecondary}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
              
              <View style={styles.quickAmounts}>
                {[100, 200, 500, 1000].map((value) => (
                  <Pressable
                    key={value}
                    style={styles.quickAmountButton}
                    onPress={() => setAmount(value.toString())}
                  >
                    <ThemedText style={styles.quickAmountText}>ETB {value}</ThemedText>
                  </Pressable>
                ))}
              </View>
              
              <Pressable
                style={[styles.payButton, (!amount || processingPayment) && styles.payButtonDisabled]}
                onPress={handleAddFunds}
                disabled={!amount || processingPayment}
              >
                {processingPayment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="wallet" size={20} color="#fff" />
                    <ThemedText style={styles.payButtonText}>Add Funds</ThemedText>
                  </>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
  },
  addFundsButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '70%',
  },
  addFundsButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  transactionsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
  },
  transactionStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  paymentMethodContainer: {
    marginBottom: 20,
  },
  paymentLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 16,
    borderRadius: 12,
  },
  paymentMethodText: {
    marginLeft: 12,
    fontSize: 16,
  },
  amountContainer: {
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  amountInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 16,
    borderRadius: 12,
    fontSize: 20,
    color: Colors.light.text,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  quickAmountButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 12,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
    margin: '1%',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
  },
  payButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 