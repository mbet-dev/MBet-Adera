-- First, ensure we're in the correct schema and have proper permissions
SET search_path TO public, auth;
GRANT USAGE ON SCHEMA public TO postgres, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO postgres, authenticated, service_role;

-- Drop existing auth schema and recreate it
DROP SCHEMA IF EXISTS auth CASCADE;
CREATE SCHEMA auth;

-- Grant schema permissions
GRANT ALL ON SCHEMA auth TO postgres;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;

-- Create auth.users table
CREATE TABLE auth.users (
    instance_id uuid,
    id uuid PRIMARY KEY,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone character varying(15),
    phone_confirmed_at timestamp with time zone,
    phone_change character varying(15),
    phone_change_token character varying(255),
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone,
    email_change_token_current character varying(255),
    email_change_confirm_status smallint,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255),
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean,
    deleted_at timestamp with time zone
);

-- Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres;
GRANT SELECT ON auth.users TO authenticated;
GRANT ALL ON auth.sessions TO authenticated;
GRANT ALL ON auth.refresh_tokens TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;

-- Create auth.sessions table
CREATE TABLE auth.sessions (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal aal_level,
    not_after timestamp with time zone
);

-- Create auth.refresh_tokens table
CREATE TABLE auth.refresh_tokens (
    id bigint PRIMARY KEY,
    token character varying(255),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid REFERENCES auth.sessions(id) ON DELETE CASCADE
);

-- Create necessary types
CREATE TYPE auth.aal_level AS ENUM ('aal1', 'aal2', 'aal3');

-- Create indexes
CREATE INDEX users_email_idx ON auth.users(email);
CREATE INDEX users_instance_id_idx ON auth.users(instance_id);
CREATE INDEX sessions_user_id_idx ON auth.sessions(user_id);
CREATE INDEX refresh_tokens_user_id_idx ON auth.refresh_tokens(user_id);

-- Create functions
CREATE OR REPLACE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT 
  COALESCE(
    current_setting('request.jwt.claim.email', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'email')
  )::text
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT 
  COALESCE(
    current_setting('request.jwt.claim.role', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
  )::text
$$;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  SELECT 
  COALESCE(
    current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )::uuid
$$;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION auth.email() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, service_role;

-- Create test users
DO $$
DECLARE
    alex_id UUID;
    beza_id UUID;
    courier_id UUID;
    partner_id UUID;
    admin_id UUID;
BEGIN
    -- Generate UUIDs for users
    alex_id := uuid_generate_v4();
    beza_id := uuid_generate_v4();
    courier_id := uuid_generate_v4();
    partner_id := uuid_generate_v4();
    admin_id := uuid_generate_v4();

    -- Create auth users with proper password hashing
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        last_sign_in_at,
        raw_app_meta_data
    )
    VALUES 
        (
            '00000000-0000-0000-0000-000000000000',
            alex_id,
            'authenticated',
            'authenticated',
            'alex@example.com',
            encode(digest('password123', 'sha256'), 'hex'),
            now(),
            '{"full_name": "Alex Smith", "phone_number": "+251911111111"}',
            now(),
            now(),
            '',
            '',
            now(),
            '{}'
        ),
        (
            '00000000-0000-0000-0000-000000000000',
            beza_id,
            'authenticated',
            'authenticated',
            'beza@example.com',
            encode(digest('password123', 'sha256'), 'hex'),
            now(),
            '{"full_name": "Beza Alem", "phone_number": "+251922222222"}',
            now(),
            now(),
            '',
            '',
            now(),
            '{}'
        ),
        (
            '00000000-0000-0000-0000-000000000000',
            courier_id,
            'authenticated',
            'authenticated',
            'courier@example.com',
            encode(digest('password123', 'sha256'), 'hex'),
            now(),
            '{"full_name": "Courier One", "phone_number": "+251933333333"}',
            now(),
            now(),
            '',
            '',
            now(),
            '{}'
        ),
        (
            '00000000-0000-0000-0000-000000000000',
            partner_id,
            'authenticated',
            'authenticated',
            'partner@example.com',
            encode(digest('password123', 'sha256'), 'hex'),
            now(),
            '{"full_name": "Partner One", "phone_number": "+251944444444"}',
            now(),
            now(),
            '',
            '',
            now(),
            '{}'
        ),
        (
            '00000000-0000-0000-0000-000000000000',
            admin_id,
            'authenticated',
            'authenticated',
            'admin@example.com',
            encode(digest('password123', 'sha256'), 'hex'),
            now(),
            '{"full_name": "Admin User", "phone_number": "+251955555555"}',
            now(),
            now(),
            '',
            '',
            now(),
            '{}'
        );

    -- Update profiles with roles
    UPDATE public.profiles
    SET role = 'customer'
    WHERE id IN (alex_id, beza_id);

    UPDATE public.profiles
    SET role = 'courier'
    WHERE id = courier_id;

    UPDATE public.profiles
    SET role = 'partner'
    WHERE id = partner_id;

    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = admin_id;
END $$;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a pure SQL function for UUID generation
CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
RETURNS uuid
LANGUAGE sql
AS $$
    SELECT md5(random()::text || clock_timestamp()::text)::uuid;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.uuid_generate_v4() TO postgres, authenticated, service_role;

-- Clean up existing tables, triggers, and users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS generate_tracking_id_trigger ON public.parcels;
DROP TRIGGER IF EXISTS create_parcel_chat_trigger ON public.parcels;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS generate_tracking_id();
DROP FUNCTION IF EXISTS create_parcel_chat();

-- Drop all tables in correct order to handle dependencies
DROP TABLE IF EXISTS public.wallet_transactions CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.ratings CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;
DROP TABLE IF EXISTS public.verification_codes CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.parcels CASCADE;
DROP TABLE IF EXISTS public.addresses CASCADE;
DROP TABLE IF EXISTS public.partners CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone_number TEXT UNIQUE,
    profile_image_url TEXT,
    wallet_balance DECIMAL(10,2) DEFAULT 0,
    role TEXT CHECK (role IN ('customer', 'courier', 'partner', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on phone_number
CREATE INDEX idx_profiles_phone_number ON public.profiles(phone_number);

-- Grant permissions on profiles table
GRANT ALL ON public.profiles TO postgres, authenticated, service_role;

-- Create addresses table
CREATE TABLE public.addresses (
    id UUID DEFAULT public.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    address_type TEXT CHECK (address_type IN ('home', 'work', 'other')),
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'Ethiopia',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Grant permissions on addresses table
GRANT ALL ON public.addresses TO postgres, authenticated, service_role;

-- Create parcels table
CREATE TABLE public.parcels (
    id UUID DEFAULT public.uuid_generate_v4() PRIMARY KEY,
    tracking_id TEXT UNIQUE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    courier_id UUID REFERENCES public.profiles(id),
    pickup_address_id UUID REFERENCES public.addresses(id) ON DELETE CASCADE,
    dropoff_address_id UUID REFERENCES public.addresses(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled')) NOT NULL,
    package_type TEXT CHECK (package_type IN ('document', 'small', 'medium', 'large')) NOT NULL,
    weight DECIMAL(10,2),
    description TEXT,
    special_instructions TEXT,
    price DECIMAL(10,2) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('wallet', 'yenepay', 'telebirr', 'cash')) NOT NULL,
    payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')) NOT NULL,
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Grant permissions on parcels table
GRANT ALL ON public.parcels TO postgres, authenticated, service_role;

-- Create verification_codes table
CREATE TABLE public.verification_codes (
    id UUID DEFAULT public.uuid_generate_v4() PRIMARY KEY,
    parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Grant permissions on verification_codes table
GRANT ALL ON public.verification_codes TO postgres, authenticated, service_role;

-- Create transactions table
CREATE TABLE public.transactions (
    id UUID DEFAULT public.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    transaction_type TEXT CHECK (transaction_type IN ('payment', 'refund', 'topup')) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('wallet', 'yenepay', 'telebirr', 'cash')) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed')) NOT NULL,
    transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Grant permissions on transactions table
GRANT ALL ON public.transactions TO postgres, authenticated, service_role;

-- Create chats table
CREATE TABLE public.chats (
    id UUID DEFAULT public.uuid_generate_v4() PRIMARY KEY,
    parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Grant permissions on chats table
GRANT ALL ON public.chats TO postgres, authenticated, service_role;

-- Create messages table
CREATE TABLE public.messages (
    id UUID DEFAULT public.uuid_generate_v4() PRIMARY KEY,
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT,
    message_type TEXT CHECK (message_type IN ('text', 'image', 'location', 'system', 'parcel')) NOT NULL,
    image_url TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Grant permissions on messages table
GRANT ALL ON public.messages TO postgres, authenticated, service_role;

-- Create partners table
CREATE TABLE public.partners (
    id UUID DEFAULT public.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_type TEXT,
    business_address TEXT,
    business_phone TEXT,
    business_email TEXT,
    status TEXT CHECK (status IN ('active', 'inactive', 'suspended')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Grant permissions on partners table
GRANT ALL ON public.partners TO postgres, authenticated, service_role;

-- Create ratings table
CREATE TABLE public.ratings (
    id UUID DEFAULT public.uuid_generate_v4() PRIMARY KEY,
    parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Grant permissions on ratings table
GRANT ALL ON public.ratings TO postgres, authenticated, service_role;

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT public.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    notification_type TEXT CHECK (notification_type IN ('parcel_update', 'payment', 'system', 'chat')) NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Grant permissions on notifications table
GRANT ALL ON public.notifications TO postgres, authenticated, service_role;

-- Create wallet_transactions table
CREATE TABLE public.wallet_transactions (
    id UUID DEFAULT public.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    transaction_type TEXT CHECK (transaction_type IN ('credit', 'debit')) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Grant permissions on wallet_transactions table
GRANT ALL ON public.wallet_transactions TO postgres, authenticated, service_role;

-- Create indexes for better performance
CREATE INDEX idx_parcels_tracking_id ON public.parcels(tracking_id);
CREATE INDEX idx_parcels_sender_id ON public.parcels(sender_id);
CREATE INDEX idx_parcels_recipient_id ON public.parcels(recipient_id);
CREATE INDEX idx_parcels_courier_id ON public.parcels(courier_id);
CREATE INDEX idx_parcels_status ON public.parcels(status);
CREATE INDEX idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Addresses policies
CREATE POLICY "Users can view their own addresses"
    ON public.addresses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own addresses"
    ON public.addresses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own addresses"
    ON public.addresses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own addresses"
    ON public.addresses FOR DELETE
    USING (auth.uid() = user_id);

-- Parcels policies
CREATE POLICY "Users can view parcels they are involved with"
    ON public.parcels FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR auth.uid() = courier_id);

CREATE POLICY "Users can create parcels"
    ON public.parcels FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Couriers can update parcel status"
    ON public.parcels FOR UPDATE
    USING (auth.uid() = courier_id);

-- Verification codes policies
CREATE POLICY "Users can view verification codes for their parcels"
    ON public.verification_codes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.parcels
        WHERE parcels.id = verification_codes.parcel_id
        AND (parcels.sender_id = auth.uid() OR parcels.recipient_id = auth.uid())
    ));

-- Transactions policies
CREATE POLICY "Users can view their own transactions"
    ON public.transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Chats policies
CREATE POLICY "Users can view chats they are involved with"
    ON public.chats FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.parcels
        WHERE parcels.id = chats.parcel_id
        AND (parcels.sender_id = auth.uid() OR parcels.recipient_id = auth.uid() OR parcels.courier_id = auth.uid())
    ));

-- Messages policies
CREATE POLICY "Users can view messages in their chats"
    ON public.messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.chats
        JOIN public.parcels ON parcels.id = chats.parcel_id
        WHERE chats.id = messages.chat_id
        AND (parcels.sender_id = auth.uid() OR parcels.recipient_id = auth.uid() OR parcels.courier_id = auth.uid())
    ));

-- Partners policies
CREATE POLICY "Partners can view their own profile"
    ON public.partners FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Partners can update their own profile"
    ON public.partners FOR UPDATE
    USING (auth.uid() = user_id);

-- Ratings policies
CREATE POLICY "Users can view ratings for their parcels"
    ON public.ratings FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.parcels
        WHERE parcels.id = ratings.parcel_id
        AND (parcels.sender_id = auth.uid() OR parcels.recipient_id = auth.uid() OR parcels.courier_id = auth.uid())
    ));

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Wallet transactions policies
CREATE POLICY "Users can view their own wallet transactions"
    ON public.wallet_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Create triggers and functions

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'customer'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, authenticated, service_role;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to generate tracking ID
CREATE OR REPLACE FUNCTION generate_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.tracking_id := 'MBT-' || to_char(NEW.created_at, 'YYMMDD') || '-' || 
                      substr(md5(random()::text), 1, 4);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION generate_tracking_id() TO postgres, authenticated, service_role;

CREATE TRIGGER generate_tracking_id_trigger
    BEFORE INSERT ON public.parcels
    FOR EACH ROW
    EXECUTE FUNCTION generate_tracking_id();

-- Function to create chat when parcel is created
CREATE OR REPLACE FUNCTION create_parcel_chat()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.chats (parcel_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_parcel_chat() TO postgres, authenticated, service_role;

CREATE TRIGGER create_parcel_chat_trigger
    AFTER INSERT ON public.parcels
    FOR EACH ROW
    EXECUTE FUNCTION create_parcel_chat();

-- Create a function to create or update users
CREATE OR REPLACE FUNCTION create_or_update_test_user(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_phone_number TEXT,
    p_role TEXT
) RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Check if user exists
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE auth.users.email = p_email;
    
    IF v_user_id IS NULL THEN
        -- Create new user
        INSERT INTO auth.users (
            id,
            email,
            email_confirmed_at,
            raw_user_meta_data,
            created_at,
            updated_at,
            encrypted_password
        )
        VALUES (
            uuid_generate_v4(),
            p_email,
            now(),
            jsonb_build_object('full_name', p_full_name, 'phone_number', p_phone_number),
            now(),
            now(),
            p_password
        )
        RETURNING id INTO v_user_id;
    ELSE
        -- Update existing user
        UPDATE auth.users
        SET 
            email_confirmed_at = now(),
            raw_user_meta_data = jsonb_build_object('full_name', p_full_name, 'phone_number', p_phone_number),
            updated_at = now(),
            encrypted_password = p_password
        WHERE id = v_user_id;
    END IF;

    -- Update or insert profile
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone_number,
        role
    )
    VALUES (
        v_user_id,
        p_email,
        p_full_name,
        p_phone_number,
        p_role
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone_number = EXCLUDED.phone_number,
        role = EXCLUDED.role;

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or update test users
SELECT create_or_update_test_user(
    'alex@example.com',
    'password123',
    'Alex Smith',
    '+251911111111',
    'customer'
);

SELECT create_or_update_test_user(
    'beza@example.com',
    'password123',
    'Beza Alem',
    '+251922222222',
    'customer'
);

SELECT create_or_update_test_user(
    'courier@example.com',
    'password123',
    'Courier One',
    '+251933333333',
    'courier'
);

SELECT create_or_update_test_user(
    'partner@example.com',
    'password123',
    'Partner One',
    '+251944444444',
    'partner'
);

SELECT create_or_update_test_user(
    'admin@example.com',
    'password123',
    'Admin User',
    '+251955555555',
    'admin'
);

-- Function to setup auth schema permissions
CREATE OR REPLACE FUNCTION setup_auth_permissions()
RETURNS void AS $$
BEGIN
    -- Ensure auth schema exists
    CREATE SCHEMA IF NOT EXISTS auth;
    
    -- Grant schema permissions
    GRANT ALL ON SCHEMA auth TO postgres;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    GRANT USAGE ON SCHEMA auth TO service_role;
    
    -- Grant table permissions
    GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres;
    GRANT SELECT ON ALL TABLES IN SCHEMA auth TO authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA auth TO service_role;
    
    -- Grant sequence permissions
    GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres;
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA auth TO authenticated;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO service_role;
    
    -- Set default privileges
    ALTER DEFAULT PRIVILEGES IN SCHEMA auth
    GRANT ALL ON TABLES TO postgres;
    
    ALTER DEFAULT PRIVILEGES IN SCHEMA auth
    GRANT SELECT ON TABLES TO authenticated;
    
    ALTER DEFAULT PRIVILEGES IN SCHEMA auth
    GRANT ALL ON TABLES TO service_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function
SELECT setup_auth_permissions();

-- Create a function to verify auth setup
CREATE OR REPLACE FUNCTION verify_auth_setup()
RETURNS TABLE (
    schema_exists boolean,
    users_table_exists boolean,
    sessions_table_exists boolean,
    refresh_tokens_table_exists boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth'),
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users'),
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'sessions'),
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'refresh_tokens');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the setup
SELECT * FROM verify_auth_setup();

-- Function to add funds to wallet
CREATE OR REPLACE FUNCTION public.add_funds(
    amount DECIMAL,
    user_id UUID
) RETURNS void AS $$
DECLARE
    current_balance DECIMAL;
BEGIN
    -- Get current balance
    SELECT wallet_balance INTO current_balance
    FROM public.profiles
    WHERE id = user_id;

    -- Update wallet balance
    UPDATE public.profiles
    SET wallet_balance = COALESCE(current_balance, 0) + amount
    WHERE id = user_id;

    -- Record transaction
    INSERT INTO public.wallet_transactions (
        user_id,
        amount,
        transaction_type,
        description
    ) VALUES (
        user_id,
        amount,
        'credit',
        'Wallet top-up'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to withdraw funds from wallet
CREATE OR REPLACE FUNCTION public.withdraw_funds(
    amount DECIMAL,
    user_id UUID
) RETURNS void AS $$
DECLARE
    current_balance DECIMAL;
BEGIN
    -- Get current balance
    SELECT wallet_balance INTO current_balance
    FROM public.profiles
    WHERE id = user_id;

    -- Check if sufficient balance
    IF COALESCE(current_balance, 0) < amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Update wallet balance
    UPDATE public.profiles
    SET wallet_balance = current_balance - amount
    WHERE id = user_id;

    -- Record transaction
    INSERT INTO public.wallet_transactions (
        user_id,
        amount,
        transaction_type,
        description
    ) VALUES (
        user_id,
        amount,
        'debit',
        'Wallet withdrawal'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on wallet functions
GRANT EXECUTE ON FUNCTION public.add_funds(DECIMAL, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_funds(DECIMAL, UUID) TO authenticated;
