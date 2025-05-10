import { supabase } from './supabase';

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
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      // Check if wallet exists
      const { data: existingWallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.user.id)
        .single();
        
      if (existingWallet) {
        return { wallet: existingWallet, error: null };
      }
      
      if (walletError && walletError.code !== 'PGRST116') {
        // Error other than "not found"
        throw walletError;
      }
      
      // Create new wallet
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          user_id: user.user.id,
          balance: 0,
          currency: 'ETB', // Ethiopian Birr
        })
        .select()
        .single();
        
      if (createError) throw createError;
      
      return { wallet: newWallet, error: null };
    } catch (error) {
      console.error('Error getting or creating wallet:', error);
      return { wallet: null, error };
    }
  },
  
  /**
   * Get wallet balance
   */
  async getBalance(): Promise<{ balance: number; error: any }> {
    try {
      const { wallet, error } = await this.getOrCreateWallet();
      if (error) throw error;
      
      return { balance: wallet?.balance || 0, error: null };
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
   * Get transaction history
   */
  async getTransactionHistory(): Promise<{ transactions: Transaction[]; error: any }> {
    try {
      const { wallet, error: walletError } = await this.getOrCreateWallet();
      if (walletError) throw walletError;
      if (!wallet) throw new Error('Wallet not found');
      
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return { transactions: data || [], error: null };
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return { transactions: [], error };
    }
  }
}; 