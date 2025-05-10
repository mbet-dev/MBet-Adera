import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts' // Corrected path
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// TODO: Load API keys/secrets securely from environment variables
const YENEPAY_MERCHANT_ID = Deno.env.get('YENEPAY_MERCHANT_ID') ?? ''
const YENEPAY_API_KEY = Deno.env.get('YENEPAY_API_KEY') ?? ''
const TELEBIRR_APP_KEY = Deno.env.get('TELEBIRR_APP_KEY') ?? ''
const TELEBIRR_API_SECRET = Deno.env.get('TELEBIRR_API_SECRET') ?? ''
const APP_CALLBACK_URL_SUCCESS = Deno.env.get('APP_CALLBACK_URL_SUCCESS') ?? '' // e.g., your deep link
const APP_CALLBACK_URL_FAILURE = Deno.env.get('APP_CALLBACK_URL_FAILURE') ?? '' // e.g., your deep link
const WEBHOOK_URL = Deno.env.get('SUPABASE_FUNCTION_HOOK_URL') ?? '' // URL for payment-webhook function
const CHAPA_SECRET_KEY = Deno.env.get('CHAPA_SECRET_KEY');
const CHAPA_CALLBACK_URL = Deno.env.get('CHAPA_CALLBACK_URL'); // Points to payment-webhook func
const CHAPA_RETURN_URL = Deno.env.get('CHAPA_RETURN_URL'); // App-specific URL scheme
const TELEBIRR_RETURN_URL = Deno.env.get('TELEBIRR_RETURN_URL'); // Placeholder
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Use Service Role for backend operations

// --- Type Definitions ---
type PaymentResponse = {
  checkout_url?: string;
  error?: string;
  // Optional fields for deprecated YenePay compatibility
  paymentMethod?: string; 
  orderId?: string;
  merchantId?: string;
  amount?: number; 
  message?: string; // Also used by YenePay placeholder
};
// ------------------------

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // TODO: Authenticate the user making the request (e.g., check JWT)

    const { amount, method, user } = await req.json()

    if (!amount || amount <= 0 || !method || !user || !user.email || !user.first_name || !user.last_name || !user.id) {
      throw new Error('Missing or invalid parameters: amount, method, user details (email, first_name, last_name, id) required.')
    }

    let responseData: PaymentResponse = {}
    const tx_ref = `${method.toUpperCase()}-${user.id.substring(0, 8)}-${Date.now()}`; // Generate unique transaction reference

    if (method === 'yenepay') {
      console.log('Initiating YenePay payment...')
      // TODO: Implement YenePay API call to get payment parameters/URL
      // This will depend heavily on whether their SDK needs server-side initiation
      // or if we just pass parameters back to the client SDK.
      // Example structure (highly hypothetical):
      // const yenepayResponse = await fetch('https://api.yenepay.com/v1/checkout/initiate', {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${YENEPAY_API_KEY}`, 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ 
      //      merchantId: YENEPAY_MERCHANT_ID, 
      //      amount: amount, 
      //      orderId: orderId,
      //      successUrl: APP_CALLBACK_URL_SUCCESS, // Or maybe SDK handles this?
      //      cancelUrl: APP_CALLBACK_URL_FAILURE,
      //      notifyUrl: `${WEBHOOK_URL}?source=yenepay` // For server-to-server confirmation
      //   })
      // });
      // if (!yenepayResponse.ok) throw new Error('YenePay initiation failed');
      // const yenepayData = await yenepayResponse.json();
      // responseData = { paymentMethod: 'yenepay', parameters: yenepayData }; 
      
      // Placeholder: Assume SDK handles initiation mostly client-side for now
      responseData = {
        paymentMethod: 'yenepay',
        orderId: tx_ref,
        merchantId: YENEPAY_MERCHANT_ID,
        amount: amount,
        // Other parameters the SDK might need?
      }

    } else if (method === 'telebirr') {
      console.log('Initiating TeleBirr payment...')
      // TODO: Implement TeleBirr API call (refer to their documentation)
      // This likely involves signing requests, calling their 'apply' or 'h5pay' endpoint
      // Example structure (highly hypothetical - based on common patterns):
      // const telebirrPayload = { /* construct payload per docs */ };
      // const signature = /* calculate signature per docs using API secret */; 
      // const telebirrResponse = await fetch('https://api.ethiotelecom.et/.../h5pay', { // Use actual endpoint
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json', 'AppKey': TELEBIRR_APP_KEY, 'Signature': signature },
      //   body: JSON.stringify(telebirrPayload)
      // });
      // if (!telebirrResponse.ok) throw new Error('TeleBirr initiation failed');
      // const telebirrData = await telebirrResponse.json();
      // responseData = { paymentMethod: 'telebirr', redirectUrl: telebirrData.paymentUrl };
      
      // Placeholder:
      responseData = { error: 'TeleBirr integration is not yet available.' };

    } else if (method === 'chapa') {
      if (!CHAPA_SECRET_KEY || !CHAPA_CALLBACK_URL || !CHAPA_RETURN_URL) {
        throw new Error('Chapa environment variables are not configured.');
      }
      
      const chapaPayload = {
        amount: amount.toString(), // Chapa expects string amount
        currency: 'ETB',
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        tx_ref: tx_ref,
        callback_url: `${CHAPA_CALLBACK_URL}?tx_ref=${tx_ref}&source=chapa`, // Append tx_ref for easy lookup?
        return_url: CHAPA_RETURN_URL, // App specific URL
        customization: {
          title: 'MBet Wallet Deposit',
          description: `Deposit for user ${user.email}`,
        },
      };

      const response = await fetch('https://api.chapa.co/v1/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chapaPayload),
      });

      const chapaResponseData = await response.json();

      if (response.ok && chapaResponseData.status === 'success') {
        responseData = { checkout_url: chapaResponseData.data.checkout_url };

        // Insert pending transaction record
        const { error: insertError } = await supabaseAdmin
          .from('wallet_transactions')
          .insert({
            user_id: user.id,
            amount: amount,
            type: 'deposit',
            status: 'pending',
            payment_method: 'chapa',
            reference_id: tx_ref, // Use tx_ref as the reference
            metadata: { initiator: 'initiate-payment' } // Optional metadata
          });

        if (insertError) {
          console.error(`Failed to insert pending transaction ${tx_ref}:`, insertError);
          // Decide if we should still return the checkout URL or fail the whole process
          // For now, log the error but proceed with payment flow
          responseData.message = 'Payment initiated, but recording failed. Contact support if deposit missing.';
        } else {
          console.log(`Successfully inserted pending transaction for ${tx_ref}`);
        }
      } else {
        // Capture error details
        responseData = { error: chapaResponseData.message || 'Chapa initialization failed.' };
        console.error('Chapa API Error:', chapaResponseData);
      }

    } else {
      responseData = { error: 'Invalid payment method specified.' };
    }

    // Check if responseData contains checkout_url or an error
    if (responseData.checkout_url) {
      return new Response(JSON.stringify({ checkout_url: responseData.checkout_url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else if (responseData.error) {
      return new Response(JSON.stringify({ error: responseData.error }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500, // Consider 400 for specific errors like invalid method
      });
    } else {
      // Fallback for unexpected scenario
      return new Response(JSON.stringify({ error: 'An unexpected error occurred during payment initiation.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

  } catch (error) {
    // Handle unknown error type
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    // Log both the extracted message and the original error object for context.
    // Lint error d61bd7d2-8b83... for 'error' might be incorrect due to environment or analysis lag.
    console.error('Error in initiate-payment function:', message, error); 
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
