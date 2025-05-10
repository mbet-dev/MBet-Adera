-- Setup wallet schema directly

-- Ensure the schema exists (optional, usually 'public' exists)
CREATE SCHEMA IF NOT EXISTS public;

-- Create wallets table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'ETB',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT positive_balance CHECK (balance >= 0)
);

-- Create wallet_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'payment')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
    reference TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors on re-run
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can insert transactions on their wallet" ON public.wallet_transactions;

-- Create policies for wallets
CREATE POLICY "Users can view their own wallet"
    ON public.wallets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
    ON public.wallets FOR UPDATE
    USING (auth.uid() = user_id);

-- Create policies for wallet_transactions
CREATE POLICY "Users can view their own transactions"
    ON public.wallet_transactions FOR SELECT
    USING (
        wallet_id IN (
            SELECT id FROM public.wallets WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert transactions on their wallet"
    ON public.wallet_transactions FOR INSERT
    WITH CHECK (
        wallet_id IN (
            SELECT id FROM public.wallets WHERE user_id = auth.uid()
        )
    );

-- Function to create a wallet for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $inner$ -- Use a named tag
BEGIN
    -- Create wallet for new user
    INSERT INTO public.wallets (user_id, balance, currency)
    VALUES (NEW.id, 0, 'ETB');
    
    RETURN NEW;
END;
$inner$;

-- Drop existing trigger if it exists to avoid errors on re-run
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;

-- Create trigger to create wallet for new users
CREATE TRIGGER on_auth_user_created_wallet
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_wallet();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, authenticated, service_role;

GRANT ALL ON public.wallets TO postgres, service_role;
GRANT SELECT, UPDATE ON public.wallets TO authenticated;

GRANT ALL ON public.wallet_transactions TO postgres, service_role;
GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;

-- Optional: Seed data for testing (replace with actual user IDs)
-- INSERT INTO public.wallets (user_id, balance, currency) VALUES ('YOUR_TEST_USER_ID_1', 100.00, 'ETB');
-- INSERT INTO public.wallets (user_id, balance, currency) VALUES ('YOUR_TEST_USER_ID_2', 50.50, 'ETB');

-- Note: The handle_new_user_wallet trigger automatically creates wallets for *new* users.
-- If you need wallets for existing users, you'll need to insert them manually like the examples above.

-- End of script


-- 1. Remove the recently added user_id column (if you added it)
ALTER TABLE public.parcels
DROP COLUMN IF EXISTS user_id; -- Use IF EXISTS just in case

-- 2. Add sender_id column referencing auth.users
ALTER TABLE public.parcels
ADD COLUMN sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL; 
-- ON DELETE SET NULL means if sender is deleted, the parcel remains but sender_id becomes NULL

-- 3. Add receiver_id column referencing auth.users
ALTER TABLE public.parcels
ADD COLUMN receiver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
-- ON DELETE SET NULL means if receiver is deleted, the parcel remains but receiver_id becomes NULL

-- Optional: Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_parcels_sender_id ON public.parcels(sender_id);
CREATE INDEX IF NOT EXISTS idx_parcels_receiver_id ON public.parcels(receiver_id);


