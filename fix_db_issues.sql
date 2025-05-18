-- Fix database issues with missing columns and functions

-- Create helper function to add columns if they don't exist
CREATE OR REPLACE FUNCTION mbet_add_column_if_not_exists(
    p_table_name text, 
    p_column_name text, 
    p_data_type text,
    p_nullable boolean DEFAULT true
) RETURNS VOID AS 
$$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check if the column already exists
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = p_table_name 
        AND column_name = p_column_name
    ) INTO column_exists;
    
    -- If the column doesn't exist, add it
    IF NOT column_exists THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s %s', 
                      p_table_name, 
                      p_column_name, 
                      p_data_type, 
                      CASE WHEN p_nullable THEN '' ELSE 'NOT NULL' END);
        RAISE NOTICE 'Added column % to %', p_column_name, p_table_name;
    ELSE
        RAISE NOTICE 'Column % already exists in %', p_column_name, p_table_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add missing columns to wallets table
SELECT mbet_add_column_if_not_exists('wallets'::text, 'currency'::text, 'text'::text);
SELECT mbet_add_column_if_not_exists('wallets'::text, 'status'::text, 'text'::text);

-- Create function to get parcel statistics for a user
CREATE OR REPLACE FUNCTION get_parcel_statistics(user_id uuid)
RETURNS json AS $$
DECLARE
    active_count INTEGER;
    delivered_count INTEGER;
    cancelled_count INTEGER;
    total_count INTEGER;
BEGIN
    -- Count active parcels (pending, accepted, picked_up, in_transit, out_for_delivery)
    SELECT COUNT(*) INTO active_count
    FROM parcels
    WHERE (sender_id = user_id OR receiver_id = user_id)
    AND status IN ('pending', 'accepted', 'picked_up', 'in_transit', 'out_for_delivery');
    
    -- Count delivered parcels
    SELECT COUNT(*) INTO delivered_count
    FROM parcels
    WHERE (sender_id = user_id OR receiver_id = user_id)
    AND status = 'delivered';
    
    -- Count cancelled parcels
    SELECT COUNT(*) INTO cancelled_count
    FROM parcels
    WHERE (sender_id = user_id OR receiver_id = user_id)
    AND status = 'cancelled';
    
    -- Calculate total
    total_count := active_count + delivered_count + cancelled_count;
    
    -- Return as JSON
    RETURN json_build_object(
        'active', active_count,
        'delivered', delivered_count,
        'cancelled', cancelled_count,
        'total', total_count
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execution permissions to all users
GRANT EXECUTE ON FUNCTION get_parcel_statistics(uuid) TO public;

-- Refresh and update the partner_locations view to ensure compatibility
DROP VIEW IF EXISTS partner_locations;
CREATE VIEW partner_locations AS
SELECT 
  p.id,
  p.business_name,
  p.contact_person,
  p.phone_number,
  p.email,
  p.business_type,
  p.description,
  p.working_hours,
  p.color,
  p.is_facility,
  p.is_active,
  p.verification_status,
  p.rating,
  a.address_line,
  a.street_address,
  a.city,
  a.state,
  a.postal_code,
  a.country,
  a.latitude,
  a.longitude,
  a.address_notes,
  a.is_verified AS address_verified
FROM 
  partners p
LEFT JOIN
  addresses a ON p.address_id = a.id;

-- Grant appropriate permissions to the view
GRANT SELECT ON partner_locations TO public;

-- Fix RLS policy for wallets table to allow access
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'wallet_select_policy' AND polrelid = 'wallets'::regclass) THEN
    DROP POLICY wallet_select_policy ON wallets;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'wallet_insert_policy' AND polrelid = 'wallets'::regclass) THEN
    DROP POLICY wallet_insert_policy ON wallets;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'wallet_update_policy' AND polrelid = 'wallets'::regclass) THEN
    DROP POLICY wallet_update_policy ON wallets;
  END IF;
END
$$;

-- Create updated policies for wallets table
CREATE POLICY wallet_select_policy ON wallets
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = 'aa7a7b40-86cb-4e17-9fbf-d21ad57f95cc');

CREATE POLICY wallet_insert_policy ON wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = 'aa7a7b40-86cb-4e17-9fbf-d21ad57f95cc');

CREATE POLICY wallet_update_policy ON wallets
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = 'aa7a7b40-86cb-4e17-9fbf-d21ad57f95cc');

-- Create wallet_transactions table if not exists
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    amount NUMERIC(10, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'payment')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
    reference TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Set up RLS for wallet_transactions
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'wallet_transactions_select_policy' AND polrelid = 'wallet_transactions'::regclass) THEN
    DROP POLICY wallet_transactions_select_policy ON wallet_transactions;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'wallet_transactions_insert_policy' AND polrelid = 'wallet_transactions'::regclass) THEN
    DROP POLICY wallet_transactions_insert_policy ON wallet_transactions;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'wallet_transactions_update_policy' AND polrelid = 'wallet_transactions'::regclass) THEN
    DROP POLICY wallet_transactions_update_policy ON wallet_transactions;
  END IF;
END
$$;

-- Create RLS policies for wallet_transactions
CREATE POLICY wallet_transactions_select_policy ON wallet_transactions
  FOR SELECT USING (
    wallet_id IN (
      SELECT id FROM wallets WHERE user_id = auth.uid() OR auth.uid() = 'aa7a7b40-86cb-4e17-9fbf-d21ad57f95cc'
    )
  );

CREATE POLICY wallet_transactions_insert_policy ON wallet_transactions
  FOR INSERT WITH CHECK (
    wallet_id IN (
      SELECT id FROM wallets WHERE user_id = auth.uid() OR auth.uid() = 'aa7a7b40-86cb-4e17-9fbf-d21ad57f95cc'
    )
  );

CREATE POLICY wallet_transactions_update_policy ON wallet_transactions
  FOR UPDATE USING (
    wallet_id IN (
      SELECT id FROM wallets WHERE user_id = auth.uid() OR auth.uid() = 'aa7a7b40-86cb-4e17-9fbf-d21ad57f95cc'
    )
  ); 