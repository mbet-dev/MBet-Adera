import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Environment Variables ---
const CHAPA_SECRET_KEY = Deno.env.get('CHAPA_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Use Service Role Key for DB updates
// ---------------------------

console.log('Payment Webhook function booting up...');

// Helper function to update wallet balance (consider RPC for atomicity later)
async function updateUserWallet(supabase: SupabaseClient, userId: string, amount: number) {
  console.log(`Attempting to update wallet for user ${userId} by amount ${amount}`);
  // Fetch current balance first (less atomic, prone to race conditions)
  // const { data: walletData, error: fetchError } = await supabase
  //   .from('wallets')
  //   .select('balance')
  //   .eq('user_id', userId)
  //   .single();

  // if (fetchError || !walletData) {
  //   console.error(`Error fetching wallet for user ${userId}:`, fetchError);
  //   throw new Error(`Could not fetch wallet for user ${userId}`);
  // }
  // const currentBalance = walletData.balance;
  // const newBalance = currentBalance + amount;

  // Update balance directly (simpler but less safe)
  // const { error: updateError } = await supabase
  //   .from('wallets')
  //   .update({ balance: newBalance })
  //   .eq('user_id', userId);

  // Using an RPC function is the recommended approach for atomicity
  // Create a function in Supabase SQL: 
  // CREATE OR REPLACE FUNCTION increment_wallet_balance(p_user_id uuid, p_amount numeric)
  // RETURNS void AS $$
  // BEGIN
  //   UPDATE public.wallets
  //   SET balance = balance + p_amount
  //   WHERE user_id = p_user_id;
  // END;
  // $$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
  
  const { error: rpcError } = await supabase.rpc('increment_wallet_balance', {
      p_user_id: userId,
      p_amount: amount,
  });

  if (rpcError) {
    console.error(`RPC Error updating wallet for user ${userId}:`, rpcError);
    throw new Error(`Failed to update wallet balance for user ${userId} via RPC.`);
  }
  console.log(`Successfully updated wallet for user ${userId} via RPC.`);
}

serve(async (req: Request) => {
  console.log(`Webhook received: ${req.method} ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  // Ensure Supabase client can be initialized
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase URL or Service Role Key not provided.');
    return new Response(JSON.stringify({ error: 'Server configuration error [SB]' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  console.log('Supabase admin client initialized.');

  try {
    const url = new URL(req.url);
    let tx_ref: string | null = null;
    let source: string | null = null;
    let requestBody: any = null;

    // --- Extract Transaction Reference ---
    if (req.method === 'GET') {
      tx_ref = url.searchParams.get('tx_ref');
      source = url.searchParams.get('source');
      console.log(`GET request - tx_ref: ${tx_ref}, source: ${source}`);
    }
    else if (req.method === 'POST') {
      try {
        requestBody = await req.json();
        console.log('POST request body:', requestBody);
        tx_ref = requestBody?.tx_ref || requestBody?.data?.tx_ref;
        source = 'chapa_webhook';
      } catch (parseError) {
        console.error('Failed to parse POST body:', parseError);
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
    } else {
       console.warn(`Unsupported method: ${req.method}`);
       return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    if (!tx_ref) {
      console.error('Transaction reference (tx_ref) not found in request.');
      return new Response(JSON.stringify({ error: 'tx_ref is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`Processing transaction reference: ${tx_ref}`);

    // --- Verify Payment Status --- 
    let verificationStatus = 'failed';
    let verificationData: any = null;
    let isChapa = false;

    if (source?.startsWith('chapa') || tx_ref.startsWith('CHAPA-')) {
      isChapa = true;
      if (!CHAPA_SECRET_KEY) {
        throw new Error('Chapa secret key is not configured.');
      }
      console.log(`Verifying Chapa transaction: ${tx_ref}`);
      try {
        const verifyUrl = `https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(tx_ref)}`;
        const response = await fetch(verifyUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${CHAPA_SECRET_KEY}` },
        });
        verificationData = await response.json();
        console.log('Chapa verification response:', verificationData);

        if (response.ok && verificationData?.status === 'success' && verificationData?.data?.status === 'success') {
           verificationStatus = 'success';
           console.log(`Chapa verification SUCCESS for ${tx_ref}`);
        } else {
          console.warn(`Chapa verification FAILED for ${tx_ref}:`, verificationData?.message || 'Unknown reason');
          verificationStatus = 'failed';
        }
      } catch (verifyError) {
        console.error(`Error verifying Chapa transaction ${tx_ref}:`, verifyError);
        verificationStatus = 'error';
      }

    } else if (source === 'telebirr' || tx_ref.startsWith('TELEBIRR-')) {
      // TODO: Implement TeleBirr verification logic
      console.warn(`TeleBirr verification for ${tx_ref} not implemented yet.`);
      verificationStatus = 'pending';

    } else {
      console.error(`Cannot determine payment provider for tx_ref: ${tx_ref}`);
      verificationStatus = 'failed';
    }

    // --- Update Database --- 
    if (verificationStatus === 'success') {
      console.log(`Attempting DB update for successful transaction ${tx_ref}`);
      // Find the transaction record
      const { data: transaction, error: findError } = await supabaseAdmin
        .from('wallet_transactions')
        .select('id, user_id, amount, status') // Select needed fields
        .eq('reference_id', tx_ref)
        .single(); // Expect only one record per tx_ref

      if (findError) {
        console.error(`Error finding transaction ${tx_ref}:`, findError);
        // Depending on policy, maybe still return OK to Chapa, but log error
      } else if (!transaction) {
        console.error(`Transaction record not found for tx_ref: ${tx_ref}`);
        // This shouldn't happen if initiate-payment worked correctly
      } else if (transaction.status === 'completed') {
        console.log(`Transaction ${tx_ref} already marked as completed. Skipping update.`);
        // Idempotency: already processed, success
      } else if (transaction.status === 'pending') {
        console.log(`Found pending transaction ${transaction.id} for tx_ref ${tx_ref}. Updating...`);
        // Update transaction status to completed
        const { error: updateTxError } = await supabaseAdmin
          .from('wallet_transactions')
          .update({ status: 'completed', metadata: { verified_at: new Date().toISOString() } })
          .eq('id', transaction.id);

        if (updateTxError) {
          console.error(`Failed to update transaction status for ${transaction.id}:`, updateTxError);
          // Critical error? Should we retry?
        } else {
          console.log(`Successfully updated transaction status for ${transaction.id} to completed.`);
          // Now update the wallet balance
          try {
            await updateUserWallet(supabaseAdmin, transaction.user_id, transaction.amount);
          } catch (walletError) {
            console.error(`Failed to update wallet for user ${transaction.user_id} after tx ${transaction.id} success:`, walletError);
            // This is a critical state - transaction completed but wallet not updated.
            // Need reconciliation logic or manual intervention.
            // Could try updating transaction status to 'failed_update' ?
          }
        }
      } else {
        // Transaction found but in an unexpected state (e.g., 'failed')
        console.warn(`Transaction ${tx_ref} found but status is '${transaction.status}'. No wallet update performed.`);
      }
    } else {
      // Verification failed or provider not implemented
      console.log(`Verification status for ${tx_ref} is ${verificationStatus}. Checking if DB update needed.`);
      // Optionally update status to 'failed' if it was 'pending'
      const { data: transaction, error: findError } = await supabaseAdmin
        .from('wallet_transactions')
        .select('id, status')
        .eq('reference_id', tx_ref)
        .maybeSingle(); // Use maybeSingle as it might not exist

      if (findError) {
        console.error(`Error finding transaction ${tx_ref} during failure check:`, findError);
      } else if (transaction && transaction.status === 'pending') {
         console.log(`Updating transaction ${transaction.id} status to 'failed' due to verification status: ${verificationStatus}`);
         const { error: updateTxError } = await supabaseAdmin
          .from('wallet_transactions')
          .update({ status: 'failed', metadata: { verification_status: verificationStatus, checked_at: new Date().toISOString() } })
          .eq('id', transaction.id);
         if (updateTxError) {
             console.error(`Failed to update transaction ${transaction.id} status to 'failed':`, updateTxError);
         }
      } else {
          console.log(`No pending transaction found or status already updated for ${tx_ref}.`);
      }
    }

    // --- Return Response --- 
    console.log(`Webhook processing finished for ${tx_ref}. Sending 200 OK.`);
    return new Response(JSON.stringify({ received: true, verification: verificationStatus }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('Error in payment-webhook function:', message, error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
