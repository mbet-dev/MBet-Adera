import { supabase, getStoredUserId } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import storageUtils from '../utils/storageUtils';

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'payment';
  status: 'pending' | 'completed' | 'failed';
  reference: string;
  description: string;
  created_at: string;
}

export const walletService = {
  /**
   * Get or create a wallet for the current user
   */
  async getOrCreateWallet(): Promise<{ wallet: Wallet | null; error: any }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('No authenticated user found');
      }

      // Try to get existing wallet
      const { data: existingWallet, error: fetchError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw fetchError;
      }

      if (existingWallet) {
        // Cache the wallet data
        await storageUtils.safeStore('mbet.wallet', existingWallet, 'WalletCache');
        return { wallet: existingWallet, error: null };
      }

      // Create new wallet if none exists
      const newWallet = {
        user_id: user.id,
        balance: 0,
        currency: 'ETB',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: createdWallet, error: createError } = await supabase
        .from('wallets')
        .insert([newWallet])
        .select()
        .single();

      if (createError) {
        console.error('Error creating wallet:', createError);
        return { wallet: null, error: createError };
      }

      // Cache the new wallet data
      await storageUtils.safeStore('mbet.wallet', createdWallet, 'WalletCache');
      return { wallet: createdWallet, error: null };
    } catch (error) {
      console.error('Unexpected error in getOrCreateWallet:', error);
      return { wallet: null, error };
    }
  },
  
  /**
   * Get wallet balance with fallback to local storage
   */
  async getBalance(): Promise<{ balance: number; error: any }> {
    try {
      // Try to get from API
      const { wallet, error } = await this.getOrCreateWallet();
      
      if (error) {
        throw error;
      }

      if (wallet) {
        return { balance: wallet.balance, error: null };
      }

      return { balance: 0, error: null };
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return { balance: 0, error };
    }
  },
  
  /**
   * Add funds to wallet
   */
  async addFunds(amount: number, paymentMethod: string): Promise<{ success: boolean; error: any }> {
    try {
      if (amount <= 0) throw new Error('Amount must be greater than zero');
      
      const { wallet, error: walletError } = await this.getOrCreateWallet();
      if (walletError) throw walletError;
      if (!wallet) throw new Error('Wallet not found');
      
      // Start transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          amount,
          type: 'deposit',
          status: 'pending',
          reference: paymentMethod,
          description: `Deposit via ${paymentMethod}`,
        })
        .select()
        .single();
        
      if (transactionError) throw transactionError;
      
      // In a real app, we would integrate with the payment gateway here
      // For demo purposes, we'll just complete the transaction immediately
      return await this.completeTransaction(transaction.id);
    } catch (error) {
      console.error('Error adding funds to wallet:', error);
      return { success: false, error };
    }
  },
  
  /**
   * Complete a transaction and update wallet balance
   */
  async completeTransaction(transactionId: string): Promise<{ success: boolean; error: any }> {
    try {
      // Get transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();
        
      if (transactionError) throw transactionError;
      if (!transaction) throw new Error('Transaction not found');
      
      // Get wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', transaction.wallet_id)
        .single();
        
      if (walletError) throw walletError;
      if (!wallet) throw new Error('Wallet not found');
      
      // Calculate new balance
      const newBalance = transaction.type === 'deposit' 
        ? wallet.balance + transaction.amount
        : wallet.balance - transaction.amount;
      
      if (transaction.type !== 'deposit' && newBalance < 0) {
        throw new Error('Insufficient funds');
      }
      
      // Update wallet balance
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);
        
      if (updateError) throw updateError;
      
      // Update transaction status
      const { error: completeError } = await supabase
        .from('wallet_transactions')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);
        
      if (completeError) throw completeError;
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Error completing transaction:', error);
      
      // Mark transaction as failed
      if (transactionId) {
        await supabase
          .from('wallet_transactions')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', transactionId);
      }
      
      return { success: false, error };
    }
  },
  
  /**
   * Pay for a delivery using wallet balance
   */
  async payForDelivery(parcelId: string, amount: number): Promise<{ success: boolean; error: any }> {
    try {
      if (amount <= 0) throw new Error('Amount must be greater than zero');
      
      const { wallet, error: walletError } = await this.getOrCreateWallet();
      if (walletError) throw walletError;
      if (!wallet) throw new Error('Wallet not found');
      
      // Check balance
      if (wallet.balance < amount) {
        throw new Error('Insufficient funds');
      }
      
      // Create transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          amount,
          type: 'payment',
          status: 'pending',
          reference: parcelId,
          description: `Payment for delivery #${parcelId}`,
        })
        .select()
        .single();
        
      if (transactionError) throw transactionError;
      
      // Complete transaction
      const { success, error } = await this.completeTransaction(transaction.id);
      if (!success) throw error;
      
      // Update parcel payment status
      const { error: parcelError } = await supabase
        .from('transactions')
        .update({ 
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('parcel_id', parcelId);
        
      if (parcelError) throw parcelError;
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Error paying for delivery:', error);
      return { success: false, error };
    }
  },
  
  /**
   * Get transaction history with offline support
   */
  async getTransactionHistory(): Promise<{ transactions: Transaction[]; error: any }> {
    try {
      // First check if we're authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      const isAuthenticated = !!sessionData.session;
      
      if (!isAuthenticated) {
        return { transactions: [], error: new Error('Not authenticated') };
      }

      // Get wallet first
      const { wallet, error: walletError } = await this.getOrCreateWallet();
      
      if (walletError || !wallet) {
        return { transactions: [], error: walletError };
      }

      // Get transactions
      const { data: transactionsData, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching transactions:', error);
        return { transactions: [], error };
      }

      // Cache transactions
      if (transactionsData && transactionsData.length > 0) {
        await storageUtils.safeStore('mbet.transactions', transactionsData, 'TransactionCache');
      }

      return { transactions: transactionsData || [], error: null };
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return { transactions: [], error };
    }
  },
  
  /**
   * Get transaction statistics for the user
   */
  async getTransactionStats(): Promise<{ 
    totalTransactions: number; 
    totalDeposits: number; 
    totalWithdrawals: number;
    totalPayments: number;
    error: any 
  }> {
    try {
      const { wallet, error: walletError } = await this.getOrCreateWallet();
      if (walletError) throw walletError;
      
      if (!wallet) {
        return {
          totalTransactions: 0,
          totalDeposits: 0,
          totalWithdrawals: 0,
          totalPayments: 0,
          error: null
        };
      }
      
      // Get all transactions
      const { data: transactions, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', wallet.id);
        
      if (error) throw error;
      
      if (!transactions) {
        return {
          totalTransactions: 0,
          totalDeposits: 0,
          totalWithdrawals: 0,
          totalPayments: 0,
          error: null
        };
      }
      
      // Calculate statistics
      const totalTransactions = transactions.length;
      const totalDeposits = transactions.filter(t => t.type === 'deposit').length;
      const totalWithdrawals = transactions.filter(t => t.type === 'withdrawal').length;
      const totalPayments = transactions.filter(t => t.type === 'payment').length;
      
      return {
        totalTransactions,
        totalDeposits,
        totalWithdrawals,
        totalPayments,
        error: null
      };
    } catch (error) {
      console.error('Error getting transaction stats:', error);
      return {
        totalTransactions: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalPayments: 0,
        error
      };
    }
  }
}; 