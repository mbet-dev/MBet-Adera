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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    role public.user_role DEFAULT 'customer',
    phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
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
    status TEXT DEFAULT 'pending',
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
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- Create policies for wallets
CREATE POLICY "Users can view their own wallet"
    ON public.wallets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
    ON public.wallets FOR UPDATE
    USING (auth.uid() = user_id);

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
        SELECT user_id FROM public.profiles WHERE id = sender_id OR id = receiver_id
    ));

-- Create necessary indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_profile_id ON public.wallets(profile_id);
CREATE INDEX IF NOT EXISTS idx_partners_address_id ON public.partners(address_id);
CREATE INDEX IF NOT EXISTS idx_parcels_sender_id ON public.parcels(sender_id);
CREATE INDEX IF NOT EXISTS idx_parcels_receiver_id ON public.parcels(receiver_id);
CREATE INDEX IF NOT EXISTS idx_parcels_pickup_address_id ON public.parcels(pickup_address_id);
CREATE INDEX IF NOT EXISTS idx_parcels_dropoff_address_id ON public.parcels(dropoff_address_id);

-- Create trigger function for new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    full_name_val TEXT;
    first_name_val TEXT;
    last_name_val TEXT;
    new_profile_id UUID;
BEGIN
    -- Extract first and last name from raw_user_meta_data
    first_name_val := NEW.raw_user_meta_data->>'first_name';
    last_name_val := NEW.raw_user_meta_data->>'last_name';
    
    -- If first_name or last_name is not provided, try to extract from full_name
    IF first_name_val IS NULL OR last_name_val IS NULL THEN
        full_name_val := NEW.raw_user_meta_data->>'full_name';
        IF full_name_val IS NOT NULL THEN
            -- Simple split on first space
            first_name_val := split_part(full_name_val, ' ', 1);
            last_name_val := split_part(full_name_val, ' ', 2);
        END IF;
    END IF;

    -- Insert into profiles table
    INSERT INTO public.profiles (
        id,
        first_name,
        last_name,
        phone_number,
        role
    )
    VALUES (
        NEW.id,
        COALESCE(first_name_val, 'User'),
        COALESCE(last_name_val, ''),
        NEW.raw_user_meta_data->>'phone_number',
        'customer'  -- Default role
    )
    RETURNING id INTO new_profile_id;

    -- Create wallet for the new user
    INSERT INTO public.wallets (
        user_id,
        profile_id,
        balance
    )
    VALUES (
        NEW.id,
        new_profile_id,
        0.00  -- Initial balance
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 