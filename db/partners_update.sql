-- Safer script to ensure users exist
DO $$
DECLARE
    default_user_id UUID;
BEGIN
    -- Check if any user exists
    SELECT id INTO default_user_id FROM auth.users LIMIT 1;
    
    -- If no user exists, we need to handle that case
    IF default_user_id IS NULL THEN
        RAISE NOTICE 'No users found in auth.users table. Partners will be created without user_id.';
    ELSE
        RAISE NOTICE 'Using user_id % for seed partners', default_user_id;
    END IF;
END
$$;

-- Add phone_number and color columns to partners table
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add color column for map display
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#4CAF50';

-- Add working_hours column with default value
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS working_hours TEXT DEFAULT '08:30 AM - 5:00 PM';

-- Add user_id column to partners table if it doesn't exist
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create an index on phone_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_partners_phone_number ON public.partners(phone_number);

-- Create an index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON public.partners(user_id);

-- Create addresses table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
    address_line TEXT NOT NULL,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'Ethiopia',
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_owner CHECK (
        (user_id IS NOT NULL AND partner_id IS NULL) OR
        (partner_id IS NOT NULL AND user_id IS NULL)
    )
);

-- Add is_default column if it doesn't exist
ALTER TABLE public.addresses
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Add RLS policies for addresses
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can insert their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can update their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.addresses;

-- Create simplified policies for addresses (visible to all authenticated users for now)
CREATE POLICY "Users can view their own addresses"
    ON public.addresses FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own addresses"
    ON public.addresses FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own addresses"
    ON public.addresses FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own addresses"
    ON public.addresses FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- Grant permissions
GRANT ALL ON public.addresses TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;

-- CLEAR ALL EXISTING DATA - Be careful with this in production!
DO $$
DECLARE
    parcels_table_exists BOOLEAN;
BEGIN
    -- Check if parcels table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'parcels'
    ) INTO parcels_table_exists;
    
    -- First clear references from parcels table if it exists
    IF parcels_table_exists THEN
        RAISE NOTICE 'Clearing references from parcels table...';
        
        -- Update parcels to set pickup_address_id and dropoff_address_id to NULL
        UPDATE public.parcels 
        SET pickup_address_id = NULL 
        WHERE pickup_address_id IN (SELECT id FROM public.addresses);
        
        UPDATE public.parcels 
        SET dropoff_address_id = NULL 
        WHERE dropoff_address_id IN (SELECT id FROM public.addresses);
    ELSE
        RAISE NOTICE 'Parcels table does not exist yet, skipping reference clearing.';
    END IF;
    
    -- Now delete all addresses (to avoid foreign key constraints)
    RAISE NOTICE 'Deleting all existing addresses...';
    DELETE FROM public.addresses;
    
    -- Then delete all partners
    RAISE NOTICE 'Deleting all existing partners...';
    DELETE FROM public.partners;
    
    RAISE NOTICE 'All existing data cleared successfully.';
END
$$;

-- Create partners and their addresses using a safe approach
DO $$
DECLARE
    default_user_id UUID;
BEGIN
    -- Try to get a user_id to associate with partners
    SELECT id INTO default_user_id FROM auth.users LIMIT 1;
    
    -- Partner 1 - Central Addis
    INSERT INTO public.partners (id, business_name, phone_number, user_id, color, working_hours)
    VALUES ('11111111-1111-1111-1111-111111111111', 'Seed Partner - Piassa', '+251911111111', default_user_id, '#4CAF50', '08:30 AM - 5:30 PM');
    
    INSERT INTO public.addresses (partner_id, address_line, city, latitude, longitude)
    VALUES ('11111111-1111-1111-1111-111111111111', 'Piassa Main Street', 'Addis Ababa', 9.0352, 38.7506);
    
    -- Partner 2 - Bole
    INSERT INTO public.partners (id, business_name, phone_number, user_id, color, working_hours)
    VALUES ('22222222-2222-2222-2222-222222222222', 'Seed Partner - Bole', '+251922222222', default_user_id, '#2196F3', '09:00 AM - 6:00 PM');
    
    INSERT INTO public.addresses (partner_id, address_line, city, latitude, longitude)
    VALUES ('22222222-2222-2222-2222-222222222222', 'Bole Road, Near Airport', 'Addis Ababa', 9.0102, 38.7967);
    
    -- Partner 3 - Kazanchis
    INSERT INTO public.partners (id, business_name, phone_number, user_id, color, working_hours)
    VALUES ('33333333-3333-3333-3333-333333333333', 'Seed Partner - Kazanchis', '+251933333333', default_user_id, '#FF9800', '08:00 AM - 5:00 PM');
    
    INSERT INTO public.addresses (partner_id, address_line, city, latitude, longitude)
    VALUES ('33333333-3333-3333-3333-333333333333', 'Churchill Avenue', 'Addis Ababa', 9.0209, 38.7654);
    
    -- Partner 4 - Gerji
    INSERT INTO public.partners (id, business_name, phone_number, user_id, color, working_hours)
    VALUES ('44444444-4444-4444-4444-444444444444', 'Seed Partner - Gerji', '+251944444444', default_user_id, '#9C27B0', '08:30 AM - 7:00 PM');
    
    INSERT INTO public.addresses (partner_id, address_line, city, latitude, longitude)
    VALUES ('44444444-4444-4444-4444-444444444444', 'Gerji Main Road', 'Addis Ababa', 9.0033, 38.8234);
    
    -- Partner 5 - Megenagna
    INSERT INTO public.partners (id, business_name, phone_number, user_id, color, working_hours)
    VALUES ('55555555-5555-5555-5555-555555555555', 'Seed Partner - Megenagna', '+251955555555', default_user_id, '#E91E63', '07:30 AM - 6:30 PM');
    
    INSERT INTO public.addresses (partner_id, address_line, city, latitude, longitude)
    VALUES ('55555555-5555-5555-5555-555555555555', 'Megenagna Square', 'Addis Ababa', 9.0220, 38.7960);
    
    -- Partner 6 - Lideta
    INSERT INTO public.partners (id, business_name, phone_number, user_id, color, working_hours)
    VALUES ('66666666-6666-6666-6666-666666666666', 'Seed Partner - Lideta', '+251966666666', default_user_id, '#607D8B', '09:00 AM - 5:30 PM');
    
    INSERT INTO public.addresses (partner_id, address_line, city, latitude, longitude)
    VALUES ('66666666-6666-6666-6666-666666666666', 'Lideta Condominium Area', 'Addis Ababa', 9.0075, 38.7370);
    
    -- Partner 7 - Mexico Square
    INSERT INTO public.partners (id, business_name, phone_number, user_id, color, working_hours)
    VALUES ('77777777-7777-7777-7777-777777777777', 'Seed Partner - Mexico', '+251977777777', default_user_id, '#673AB7', '08:00 AM - 4:30 PM');
    
    INSERT INTO public.addresses (partner_id, address_line, city, latitude, longitude)
    VALUES ('77777777-7777-7777-7777-777777777777', 'Mexico Square', 'Addis Ababa', 9.0138, 38.7612);
    
    -- Partner 8 - Sarbet
    INSERT INTO public.partners (id, business_name, phone_number, user_id, color, working_hours)
    VALUES ('88888888-8888-8888-8888-888888888888', 'Seed Partner - Sarbet', '+251988888888', default_user_id, '#FF5722', '08:30 AM - 5:00 PM');
    
    INSERT INTO public.addresses (partner_id, address_line, city, latitude, longitude)
    VALUES ('88888888-8888-8888-8888-888888888888', 'Sarbet Area', 'Addis Ababa', 8.9935, 38.7788);
    
    -- Partner 9 - Kality
    INSERT INTO public.partners (id, business_name, phone_number, user_id, color, working_hours)
    VALUES ('99999999-9999-9999-9999-999999999999', 'Seed Partner - Kality', '+251999999999', default_user_id, '#009688', '07:00 AM - 4:00 PM');
    
    INSERT INTO public.addresses (partner_id, address_line, city, latitude, longitude)
    VALUES ('99999999-9999-9999-9999-999999999999', 'Kality Main Road', 'Addis Ababa', 8.9348, 38.7916);
    
    -- Partner 10 - CMC
    INSERT INTO public.partners (id, business_name, phone_number, user_id, color, working_hours)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Seed Partner - CMC', '+251900000000', default_user_id, '#795548', '09:30 AM - 6:30 PM');
    
    INSERT INTO public.addresses (partner_id, address_line, city, latitude, longitude)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CMC Area', 'Addis Ababa', 9.0507, 38.7862);
    
    RAISE NOTICE 'Successfully inserted 10 partners with addresses.';
END
$$; 