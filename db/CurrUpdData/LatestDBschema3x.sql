-- Drop existing triggers and functions first (since they depend on tables)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_wallet() CASCADE;

-- Drop existing tables
DROP TABLE IF EXISTS public.parcels CASCADE;
DROP TABLE IF EXISTS public.partners CASCADE;
DROP TABLE IF EXISTS public.addresses CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop existing enum type
DROP TYPE IF EXISTS public.user_role CASCADE;

-- Create extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum type for user roles
CREATE TYPE public.user_role AS ENUM ('customer', 'courier', 'staff', 'admin');

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    phone_number TEXT,
    role TEXT CHECK (role IN ('customer', 'courier', 'partner', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_profile_wallet UNIQUE (profile_id),
    CONSTRAINT unique_user_wallet UNIQUE (user_id)
);

-- Create addresses table
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address_line TEXT,
    street_address TEXT,
    city TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    is_facility BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create partners table
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name TEXT NOT NULL,
    phone_number TEXT,
    address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    color TEXT DEFAULT '#4CAF50',
    is_facility BOOLEAN DEFAULT false,
    working_hours JSONB DEFAULT '{"monday": {"open": "09:00", "close": "17:00"}, "tuesday": {"open": "09:00", "close": "17:00"}, "wednesday": {"open": "09:00", "close": "17:00"}, "thursday": {"open": "09:00", "close": "17:00"}, "friday": {"open": "09:00", "close": "17:00"}, "saturday": {"open": "09:00", "close": "13:00"}, "sunday": {"open": null, "close": null}}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create parcels table
CREATE TABLE IF NOT EXISTS public.parcels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    pickup_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    dropoff_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    tracking_code TEXT UNIQUE,
    status TEXT DEFAULT 'pending',
    delivery_type TEXT CHECK (delivery_type IN ('standard', 'express', 'scheduled')),
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    actual_delivery_time TIMESTAMP WITH TIME ZONE,
    pickup_contact TEXT,
    pickup_phone TEXT,
    dropoff_contact TEXT,
    dropoff_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Create policies for wallets
CREATE POLICY "Users can view their own wallet"
    ON public.wallets FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own wallet"
    ON public.wallets FOR UPDATE
    USING (auth.uid() = id);

-- Create policies for addresses
CREATE POLICY "Public addresses are viewable by everyone"
    ON public.addresses FOR SELECT
    TO authenticated
    USING (true);

-- Create policies for partners
CREATE POLICY "Partners are viewable by everyone"
    ON public.partners FOR SELECT
    TO authenticated
    USING (true);

-- Create policies for parcels
CREATE POLICY "Users can view their own parcels"
    ON public.parcels FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE id = sender_id OR id = receiver_id
    ));

-- Create necessary indexes
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_wallets_id ON public.wallets(id);
CREATE INDEX IF NOT EXISTS idx_wallets_profile_id ON public.wallets(profile_id);
CREATE INDEX IF NOT EXISTS idx_partners_address_id ON public.partners(address_id);
CREATE INDEX IF NOT EXISTS idx_parcels_sender_id ON public.parcels(sender_id);
CREATE INDEX IF NOT EXISTS idx_parcels_receiver_id ON public.parcels(receiver_id);
CREATE INDEX IF NOT EXISTS idx_parcels_pickup_address_id ON public.parcels(pickup_address_id);
CREATE INDEX IF NOT EXISTS idx_parcels_dropoff_address_id ON public.parcels(dropoff_address_id);

-- Add index for tracking_code
CREATE INDEX IF NOT EXISTS idx_parcels_tracking_code ON public.parcels(tracking_code);

-- Add index for status
CREATE INDEX IF NOT EXISTS idx_parcels_status ON public.parcels(status);

-- Add index for delivery_type
CREATE INDEX IF NOT EXISTS idx_parcels_delivery_type ON public.parcels(delivery_type);

-- Add index for estimated_delivery_time
CREATE INDEX IF NOT EXISTS idx_parcels_estimated_delivery ON public.parcels(estimated_delivery_time);

-- Add index for actual_delivery_time
CREATE INDEX IF NOT EXISTS idx_parcels_actual_delivery ON public.parcels(actual_delivery_time);

-- Add index for pickup_contact
CREATE INDEX IF NOT EXISTS idx_parcels_pickup_contact ON public.parcels(pickup_contact);

-- Add index for dropoff_contact
CREATE INDEX IF NOT EXISTS idx_parcels_dropoff_contact ON public.parcels(dropoff_contact);

-- Create trigger function for new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    full_name_val TEXT;
    first_name_val TEXT;
    last_name_val TEXT;
    phone_number_val TEXT;
    new_profile_id UUID;
BEGIN
    -- Extract values from raw_user_meta_data with proper error handling
    first_name_val := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
    last_name_val := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
    phone_number_val := COALESCE(NEW.raw_user_meta_data->>'phone_number', '');
    full_name_val := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    
    -- If full_name is provided but first/last names aren't, split it
    IF full_name_val != '' AND (first_name_val = '' OR last_name_val = '') THEN
        first_name_val := COALESCE(first_name_val, split_part(full_name_val, ' ', 1));
        last_name_val := COALESCE(last_name_val, split_part(full_name_val, ' ', 2));
        END IF;

    -- Ensure we have at least a first name
    IF first_name_val = '' THEN
        first_name_val := 'User';
    END IF;

    -- Insert into profiles table with all required fields
    INSERT INTO public.profiles (
        id,
        email,
        first_name,
        last_name,
        full_name,
        phone_number,
        role,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        first_name_val,
        last_name_val,
        COALESCE(full_name_val, first_name_val || ' ' || last_name_val),
        phone_number_val,
        'customer',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
    RETURNING id INTO new_profile_id;

    -- Create wallet for the new user
    INSERT INTO public.wallets (
        user_id,
        profile_id,
        balance,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        new_profile_id,
        0.00,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        -- Re-raise the error
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, authenticated, service_role;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 

-- Create function to generate tracking code
CREATE OR REPLACE FUNCTION generate_tracking_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.tracking_code := 'MBT-' || to_char(NEW.created_at, 'YYMMDD') || '-' || 
                        substr(md5(random()::text), 1, 4);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tracking code generation
CREATE TRIGGER generate_tracking_code_trigger
    BEFORE INSERT ON public.parcels
    FOR EACH ROW
    EXECUTE FUNCTION generate_tracking_code();

-- Update RLS policies for parcels
DROP POLICY IF EXISTS "Users can view their own parcels" ON public.parcels;
CREATE POLICY "Users can view their own parcels"
    ON public.parcels FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE id = sender_id OR id = receiver_id
    ));

CREATE POLICY "Users can create parcels"
    ON public.parcels FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own parcels"
    ON public.parcels FOR UPDATE
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Update RLS policies for partners
DROP POLICY IF EXISTS "Partners are viewable by everyone" ON public.partners;
CREATE POLICY "Partners are viewable by everyone"
    ON public.partners FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Partners can update their own data"
    ON public.partners FOR UPDATE
    USING (auth.uid() IN (
        SELECT id FROM public.profiles WHERE role = 'partner'
    )); 
    