-- MBet-Adera Schema Enhancement - Simplified for Supabase
-- This script fixes the immediate issues and adds core enhancements

-- Ensure we have the required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- 1. FIX USER RETENTION VIEW (CRITICAL FIX)
-- =====================================================
-- Drop the existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS user_retention;

-- Create the fixed materialized view with sender_id instead of user_id
CREATE MATERIALIZED VIEW IF NOT EXISTS user_retention AS
WITH user_activity AS (
  SELECT
    sender_id,
    date_trunc('day', created_at)::date AS activity_date,
    MIN(date_trunc('day', created_at)::date) OVER (PARTITION BY sender_id) AS first_active_date
  FROM
    parcels
  WHERE
    sender_id IS NOT NULL
  GROUP BY
    sender_id, date_trunc('day', created_at)::date
)
SELECT
  first_active_date,
  activity_date,
  (activity_date - first_active_date) AS days_since_first_active,
  COUNT(DISTINCT sender_id) AS user_count
FROM
  user_activity
GROUP BY
  first_active_date, activity_date
ORDER BY
  first_active_date, activity_date;

-- Create index for the view
DROP INDEX IF EXISTS idx_user_retention_first_date;
CREATE INDEX IF NOT EXISTS idx_user_retention_first_date ON user_retention (first_active_date);

-- Create/update refresh function
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  -- Refresh delivery_statistics if it exists
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'delivery_statistics') THEN
    EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY delivery_statistics';
  END IF;
  
  -- Refresh user_retention view
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_retention;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. PAYMENT GATEWAY INTEGRATION (CORE ENHANCEMENT)
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_gateways (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL,  -- 'YenePay', 'Chapa', 'TeleBirr', 'internal_wallet', 'cash'
  is_active BOOLEAN DEFAULT true,
  configuration JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default payment gateways
INSERT INTO payment_gateways (name, provider, configuration)
VALUES 
('Wallet', 'internal_wallet', '{"description": "Internal wallet payment system"}'),
('Cash on Delivery', 'cash', '{"description": "Cash payment upon delivery"}'),
('YenePay', 'YenePay', '{"api_url": "https://yenepay.com/api", "requires_setup": true}'),
('Chapa', 'Chapa', '{"api_url": "https://api.chapa.co", "requires_setup": true}'),
('TeleBirr', 'TeleBirr', '{"api_url": "https://api.ethiotelecom.et/telebirr", "requires_setup": true}')
ON CONFLICT DO NOTHING;

-- Payment transaction history for detailed tracking
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID,
  status TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL, -- 'authorization', 'capture', 'refund', 'void'
  gateway_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Conditionally update existing payments table
DO $$
BEGIN
  -- Check if payments table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'payment_transactions_payment_id_fkey'
    ) THEN
      ALTER TABLE payment_transactions 
      ADD CONSTRAINT payment_transactions_payment_id_fkey 
      FOREIGN KEY (payment_id) REFERENCES payments(id);
    END IF;
    
    -- Add payment detail extensions to existing payments table
    ALTER TABLE payments 
    ADD COLUMN IF NOT EXISTS gateway_id UUID REFERENCES payment_gateways(id),
    ADD COLUMN IF NOT EXISTS gateway_transaction_id TEXT,
    ADD COLUMN IF NOT EXISTS gateway_response JSONB,
    ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ETB',
    ADD COLUMN IF NOT EXISTS processing_fee NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payer_id UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS payment_notes TEXT,
    ADD COLUMN IF NOT EXISTS receipt_url TEXT;
  END IF;
END $$;

-- =====================================================
-- 3. PRICING SYSTEM (CORE ENHANCEMENT)
-- =====================================================
CREATE TABLE IF NOT EXISTS pricing_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES pricing_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC NOT NULL DEFAULT 0,
  min_distance NUMERIC DEFAULT 0,
  max_distance NUMERIC,
  price_per_km NUMERIC DEFAULT 0,
  min_weight NUMERIC DEFAULT 0,
  max_weight NUMERIC,
  price_per_kg NUMERIC DEFAULT 0,
  package_size_factor JSONB DEFAULT '{"small": 1.0, "medium": 1.3, "large": 1.8, "extra_large": 2.5}',
  priority_factor JSONB DEFAULT '{"standard": 1.0, "express": 1.5, "same_day": 2.0}',
  special_handling_fee NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  effective_to TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL, -- 'percentage', 'fixed_amount'
  discount_value NUMERIC NOT NULL,
  min_order_value NUMERIC DEFAULT 0,
  max_discount NUMERIC,
  is_one_time BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_to TIMESTAMP WITH TIME ZONE,
  usage_limit INTEGER,
  current_usage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Conditionally create price_calculations table if parcels table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parcels') THEN
    -- Create price_calculations table
    CREATE TABLE IF NOT EXISTS price_calculations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      parcel_id UUID REFERENCES parcels(id) NOT NULL,
      rule_id UUID REFERENCES pricing_rules(id),
      base_price NUMERIC NOT NULL,
      distance_fee NUMERIC DEFAULT 0,
      weight_fee NUMERIC DEFAULT 0,
      size_fee NUMERIC DEFAULT 0,
      priority_fee NUMERIC DEFAULT 0,
      special_handling_fee NUMERIC DEFAULT 0,
      discount_amount NUMERIC DEFAULT 0,
      discount_code_id UUID REFERENCES discount_codes(id),
      subtotal NUMERIC NOT NULL,
      tax_amount NUMERIC DEFAULT 0,
      tax_rate NUMERIC DEFAULT 0,
      total_price NUMERIC NOT NULL,
      calculation_notes JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  END IF;
END $$;

-- Default pricing categories and rules
INSERT INTO pricing_categories (name, description)
VALUES 
('Standard', 'Standard pricing for regular parcels'),
('Express', 'Express delivery pricing'),
('Heavy Items', 'Pricing for heavy items over 10kg'),
('Fragile Items', 'Pricing for items requiring special handling')
ON CONFLICT DO NOTHING;

-- Insert a basic pricing rule
INSERT INTO pricing_rules (
  category_id, 
  name, 
  description, 
  base_price, 
  price_per_km, 
  price_per_kg
)
SELECT 
  id,
  'Basic Standard Rate',
  'Default pricing for standard deliveries',
  50, -- 50 ETB base price
  5,  -- 5 ETB per kilometer
  2   -- 2 ETB per kilogram
FROM pricing_categories 
WHERE name = 'Standard'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. USER ROLES AND PERMISSIONS (CORE ENHANCEMENT)
-- =====================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  role_id UUID REFERENCES roles(id) NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Insert default roles
INSERT INTO roles (name, description, is_system_role, permissions)
VALUES 
('Customer', 'Regular user who can send and receive parcels', true, '["create_parcel", "view_own_parcels", "track_parcels", "manage_profile"]'),
('Partner', 'Business partner who can receive and process parcels', true, '["view_assigned_parcels", "update_parcel_status", "manage_profile"]'),
('Driver', 'Delivery personnel who can deliver parcels', true, '["view_assigned_parcels", "update_parcel_status", "manage_profile", "update_location"]'),
('Staff', 'Internal staff who can manage parcels and support', true, '["view_all_parcels", "manage_parcels", "support_chat", "manage_partners"]'),
('Admin', 'System administrator with full access', true, '["*"]')
ON CONFLICT DO NOTHING;

-- Conditionally add columns to profiles table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- Extended user profile columns
    ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en',
    ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
    ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS device_tokens JSONB, -- For push notifications to multiple devices
    ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS verification_status JSONB DEFAULT '{"email": false, "phone": false, "identity": false}',
    ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{"total_parcels_sent": 0, "total_parcels_received": 0, "completed_deliveries": 0}';
  END IF;
END $$;

-- =====================================================
-- 5. ENHANCE PARCELS TABLE (CORE ENHANCEMENT)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parcels') THEN
    -- Add new columns to parcels table
    ALTER TABLE parcels
    ADD COLUMN IF NOT EXISTS handle_with_care BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS requires_refrigeration BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_fragile BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
    ADD COLUMN IF NOT EXISTS custom_fields JSONB,
    ADD COLUMN IF NOT EXISTS sender_signature_url TEXT,
    ADD COLUMN IF NOT EXISTS receiver_signature_url TEXT,
    ADD COLUMN IF NOT EXISTS delivery_attempts INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_attempt_time TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS delivery_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS rating INTEGER,
    ADD COLUMN IF NOT EXISTS rating_comments TEXT;
    
    -- Add price_calculation_id column if price_calculations table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_calculations') THEN
      ALTER TABLE parcels
      ADD COLUMN IF NOT EXISTS price_calculation_id UUID REFERENCES price_calculations(id);
    END IF;
    
    -- Create indexes on parcels table for better performance
    CREATE INDEX IF NOT EXISTS idx_parcels_created_at ON parcels (created_at);
    CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels (status);
    CREATE INDEX IF NOT EXISTS idx_parcels_sender_id ON parcels (sender_id);
    CREATE INDEX IF NOT EXISTS idx_parcels_receiver_id ON parcels (receiver_id);
    CREATE INDEX IF NOT EXISTS idx_parcels_pickup_address_id ON parcels (pickup_address_id);
    CREATE INDEX IF NOT EXISTS idx_parcels_dropoff_address_id ON parcels (dropoff_address_id);
    CREATE INDEX IF NOT EXISTS idx_parcels_tracking_code ON parcels (tracking_code);
  END IF;
END $$;

-- =====================================================
-- 6. CREATE DOCUMENTATION COMMENTS
-- =====================================================
-- Payment system
COMMENT ON TABLE payment_gateways IS 'Configured payment providers and their settings';
COMMENT ON TABLE payment_transactions IS 'Detailed payment transaction history with status changes';

-- Pricing system
COMMENT ON TABLE pricing_categories IS 'Categories for different types of pricing (e.g., Standard, Express)';
COMMENT ON TABLE pricing_rules IS 'Rules for calculating delivery prices based on various factors';
COMMENT ON TABLE discount_codes IS 'Promotional discount codes for delivery orders';

-- User roles
COMMENT ON TABLE roles IS 'System roles with associated permissions';
COMMENT ON TABLE user_roles IS 'Assignment of roles to users';

-- Views
COMMENT ON MATERIALIZED VIEW user_retention IS 'User retention analysis by cohort based on sender_id';

-- Conditionally add comment to price_calculations if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_calculations') THEN
    COMMENT ON TABLE price_calculations IS 'History and breakdown of price calculations for auditing';
  END IF;
END $$;

-- End of simplified schema enhancement script 