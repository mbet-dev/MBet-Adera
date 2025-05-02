
-- Clean up existing tables, triggers, and users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- First, delete all data from dependent tables
DELETE FROM public.wallet_transactions;
DELETE FROM public.notifications;
DELETE FROM public.ratings;
DELETE FROM public.partners;
DELETE FROM public.messages;
DELETE FROM public.chats;
DELETE FROM public.transactions;
DELETE FROM public.verification_codes;
DELETE FROM public.parcels;
DELETE FROM public.addresses;
DELETE FROM public.profiles;

-- Then delete the users
DELETE FROM auth.users WHERE email IN (
    'alex@example.com',
    'beza@example.com',
    'courier@example.com',
    'partner@example.com',
    'admin@example.com'
);

-- Drop all tables
DROP TABLE IF EXISTS public.parcels CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.addresses CASCADE;
DROP TABLE IF EXISTS public.verification_codes CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;
DROP TABLE IF EXISTS public.partners CASCADE;
DROP TABLE IF EXISTS public.ratings CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.wallet_transactions CASCADE;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    phone_number TEXT,
    profile_image_url TEXT,
    wallet_balance DECIMAL(10,2) DEFAULT 0,
    role TEXT CHECK (role IN ('customer', 'courier', 'partner', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create addresses table
CREATE TABLE public.addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    address_type TEXT CHECK (address_type IN ('home', 'work', 'other')),
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'Ethiopia',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create parcels table
CREATE TABLE public.parcels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tracking_id TEXT UNIQUE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    courier_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    pickup_address_id UUID REFERENCES public.addresses(id) ON DELETE CASCADE,
    dropoff_address_id UUID REFERENCES public.addresses(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
    package_type TEXT CHECK (package_type IN ('document', 'small', 'medium', 'large')),
    weight DECIMAL(10,2),
    description TEXT,
    special_instructions TEXT,
    price DECIMAL(10,2),
    payment_method TEXT CHECK (payment_method IN ('wallet', 'yenepay', 'telebirr', 'cash')),
    payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create verification_codes table
CREATE TABLE public.verification_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE,
    code TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create transactions table
CREATE TABLE public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE,
    amount DECIMAL(10,2),
    transaction_type TEXT CHECK (transaction_type IN ('payment', 'refund', 'topup')),
    payment_method TEXT CHECK (payment_method IN ('wallet', 'yenepay', 'telebirr', 'cash')),
    status TEXT CHECK (status IN ('pending', 'completed', 'failed')),
    transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create chats table
CREATE TABLE public.chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create messages table
CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT,
    message_type TEXT CHECK (message_type IN ('text', 'image', 'location', 'system', 'parcel')),
    image_url TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create partners table
CREATE TABLE public.partners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_name TEXT,
    business_type TEXT,
    business_address TEXT,
    business_phone TEXT,
    business_email TEXT,
    status TEXT CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create ratings table
CREATE TABLE public.ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT,
    body TEXT,
    notification_type TEXT CHECK (notification_type IN ('parcel_update', 'payment', 'system', 'chat')),
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create wallet_transactions table
CREATE TABLE public.wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10,2),
    transaction_type TEXT CHECK (transaction_type IN ('credit', 'debit')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

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
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE TRIGGER create_parcel_chat_trigger
    AFTER INSERT ON public.parcels
    FOR EACH ROW
    EXECUTE FUNCTION create_parcel_chat();

-- Seed data
DO $$
DECLARE
    alex_id UUID;
    beza_id UUID;
    courier_id UUID;
    partner_id UUID;
    admin_id UUID;
    alex_address_id UUID;
    beza_address_id UUID;
    partner_address_id UUID;
    parcel1_id UUID;
    parcel2_id UUID;
BEGIN
    -- Generate UUIDs for users
    alex_id := gen_random_uuid();
    beza_id := gen_random_uuid();
    courier_id := gen_random_uuid();
    partner_id := gen_random_uuid();
    admin_id := gen_random_uuid();

    -- Create auth users with raw passwords (Supabase will handle hashing)
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES 
        (alex_id, 'alex@example.com', '{"full_name": "Alex Smith", "phone_number": "+251911111111"}'),
        (beza_id, 'beza@example.com', '{"full_name": "Beza Alem", "phone_number": "+251922222222"}'),
        (courier_id, 'courier@example.com', '{"full_name": "Courier One", "phone_number": "+251933333333"}'),
        (partner_id, 'partner@example.com', '{"full_name": "Partner One", "phone_number": "+251944444444"}'),
        (admin_id, 'admin@example.com', '{"full_name": "Admin User", "phone_number": "+251955555555"}');

    -- Set passwords using Supabase's built-in function
    UPDATE auth.users
    SET encrypted_password = crypt('password123', gen_salt('bf'))
    WHERE id IN (alex_id, beza_id, courier_id, partner_id, admin_id);

    -- Update profiles with additional information
    UPDATE public.profiles
    SET phone_number = '+251911111111',
        role = 'customer'
    WHERE id = alex_id;

    UPDATE public.profiles
    SET phone_number = '+251922222222',
        role = 'customer'
    WHERE id = beza_id;

    UPDATE public.profiles
    SET phone_number = '+251933333333',
        role = 'courier'
    WHERE id = courier_id;

    UPDATE public.profiles
    SET phone_number = '+251944444444',
        role = 'partner'
    WHERE id = partner_id;

    UPDATE public.profiles
    SET phone_number = '+251955555555',
        role = 'admin'
    WHERE id = admin_id;

    -- Insert addresses
    INSERT INTO public.addresses (user_id, address_type, address_line1, city, latitude, longitude, is_default)
    VALUES 
        (alex_id, 'home', 'Bole, Addis Ababa', 'Addis Ababa', 8.9806, 38.7578, true)
    RETURNING id INTO alex_address_id;

    INSERT INTO public.addresses (user_id, address_type, address_line1, city, latitude, longitude, is_default)
    VALUES 
        (beza_id, 'work', 'Piassa, Addis Ababa', 'Addis Ababa', 9.0333, 38.7500, true)
    RETURNING id INTO beza_address_id;

    INSERT INTO public.addresses (user_id, address_type, address_line1, city, latitude, longitude, is_default)
    VALUES 
        (partner_id, 'other', 'Kazanchis, Addis Ababa', 'Addis Ababa', 9.0167, 38.7667, true)
    RETURNING id INTO partner_address_id;

    -- Insert parcels
    INSERT INTO public.parcels (sender_id, recipient_id, courier_id, pickup_address_id, dropoff_address_id, status, package_type, weight, description, price, payment_method, payment_status)
    VALUES 
        (alex_id, beza_id, courier_id, alex_address_id, beza_address_id, 'in_transit', 'small', 2.5, 'Important documents', 150.00, 'wallet', 'paid')
    RETURNING id INTO parcel1_id;

    INSERT INTO public.parcels (sender_id, recipient_id, courier_id, pickup_address_id, dropoff_address_id, status, package_type, weight, description, price, payment_method, payment_status)
    VALUES 
        (beza_id, alex_id, NULL, beza_address_id, alex_address_id, 'pending', 'medium', 5.0, 'Gift package', 200.00, 'telebirr', 'pending')
    RETURNING id INTO parcel2_id;

    -- Insert wallet transactions
    INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, description)
    VALUES 
        (alex_id, 1000.00, 'credit', 'Initial top-up'),
        (beza_id, 500.00, 'credit', 'Initial top-up');

    -- Insert notifications
    INSERT INTO public.notifications (user_id, title, body, notification_type)
    VALUES 
        (alex_id, 'Parcel Update', 'Your parcel is in transit', 'parcel_update'),
        (beza_id, 'New Parcel', 'You have a new parcel to receive', 'parcel_update');

    -- Insert verification codes
    INSERT INTO public.verification_codes (parcel_id, code, expires_at)
    VALUES 
        (parcel1_id, 'ABC123', NOW() + INTERVAL '24 hours'),
        (parcel2_id, 'XYZ789', NOW() + INTERVAL '24 hours');
END $$;
