-- MBet-Adera Schema Enhancement (Supabase-Compatible Version)
-- This script adds new tables and modifies existing ones to support advanced features

-- Ensure we have the required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- 1. FIX USER RETENTION VIEW
-- =====================================================
-- Drop the existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS user_retention;

-- Create the fixed materialized view
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

-- =====================================================
-- 2. PAYMENT GATEWAY INTEGRATION
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

-- Check if payments table exists and add foreign key constraint if it does
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_name = 'payments'
) AS payments_exists \gset

\if :payments_exists
  ALTER TABLE payment_transactions 
  ADD CONSTRAINT IF NOT EXISTS payment_transactions_payment_id_fkey 
  FOREIGN KEY (payment_id) REFERENCES payments(id);
  
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
\endif

-- =====================================================
-- 3. PRICING AND DISCOUNT SYSTEM
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

-- Check if parcels table exists
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_name = 'parcels'
) AS parcels_exists \gset

\if :parcels_exists
  -- Price calculation history for auditing
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
\endif

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
-- 4. DELIVERY PERSONNEL AND TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_personnel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  employee_id TEXT UNIQUE,
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'on_leave', 'busy'
  current_location JSONB,
  vehicle_type TEXT,
  vehicle_id TEXT,
  license_number TEXT,
  maximum_capacity NUMERIC, -- in kg
  service_area JSONB, -- geojson of service area
  is_online BOOLEAN DEFAULT false,
  last_online TIMESTAMP WITH TIME ZONE,
  rating NUMERIC DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS personnel_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personnel_id UUID REFERENCES delivery_personnel(id) NOT NULL,
  shift_start TIMESTAMP WITH TIME ZONE NOT NULL,
  shift_end TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'active', 'completed', 'cancelled'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- If parcels table exists, create related tracking tables
\if :parcels_exists
  -- Enhanced parcel tracking with detailed status history
  CREATE TABLE IF NOT EXISTS parcel_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID REFERENCES parcels(id) NOT NULL,
    status TEXT NOT NULL,
    location JSONB,
    address_text TEXT,
    notes TEXT,
    performed_by UUID REFERENCES auth.users(id),
    personnel_id UUID REFERENCES delivery_personnel(id),
    verification_code TEXT,
    proof_image_url TEXT,
    signature_url TEXT,
    reason_code TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );

  -- Parcel assignments to delivery personnel
  CREATE TABLE IF NOT EXISTS parcel_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID REFERENCES parcels(id) NOT NULL,
    personnel_id UUID REFERENCES delivery_personnel(id) NOT NULL,
    status TEXT DEFAULT 'assigned', -- 'assigned', 'accepted', 'in_progress', 'completed', 'rejected', 'reassigned'
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    assigned_by UUID REFERENCES auth.users(id),
    priority INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(parcel_id, personnel_id, status)
  );
\endif

CREATE TABLE IF NOT EXISTS delivery_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personnel_id UUID REFERENCES delivery_personnel(id) NOT NULL,
  date DATE NOT NULL,
  route_order JSONB, -- array of parcel_ids in order
  estimated_start_time TIMESTAMP WITH TIME ZONE,
  estimated_end_time TIMESTAMP WITH TIME ZONE,
  actual_start_time TIMESTAMP WITH TIME ZONE,
  actual_end_time TIMESTAMP WITH TIME ZONE,
  total_distance NUMERIC, -- in km
  status TEXT DEFAULT 'planned', -- 'planned', 'in_progress', 'completed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(personnel_id, date)
);

CREATE TABLE IF NOT EXISTS personnel_location_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personnel_id UUID REFERENCES delivery_personnel(id) NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  accuracy NUMERIC,
  altitude NUMERIC,
  speed NUMERIC,
  heading NUMERIC,
  battery_level NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 5. USER ROLES AND PERMISSIONS SYSTEM
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

-- Check if profiles table exists
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_name = 'profiles'
) AS profiles_exists \gset

\if :profiles_exists
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
\endif

-- Insert default roles
INSERT INTO roles (name, description, is_system_role, permissions)
VALUES 
('Customer', 'Regular user who can send and receive parcels', true, '["create_parcel", "view_own_parcels", "track_parcels", "manage_profile"]'),
('Partner', 'Business partner who can receive and process parcels', true, '["view_assigned_parcels", "update_parcel_status", "manage_profile"]'),
('Driver', 'Delivery personnel who can deliver parcels', true, '["view_assigned_parcels", "update_parcel_status", "manage_profile", "update_location"]'),
('Staff', 'Internal staff who can manage parcels and support', true, '["view_all_parcels", "manage_parcels", "support_chat", "manage_partners"]'),
('Admin', 'System administrator with full access', true, '["*"]')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS user_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  verification_type TEXT NOT NULL, -- 'email', 'phone', 'id_document', 'address'
  status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  verification_data JSONB,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  activity_type TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 6. ANALYTICS AND REPORTING
-- =====================================================
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_date DATE NOT NULL,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_parcels INTEGER DEFAULT 0,
  new_parcels INTEGER DEFAULT 0,
  completed_deliveries INTEGER DEFAULT 0,
  active_deliveries INTEGER DEFAULT 0,
  cancelled_deliveries INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  average_delivery_time NUMERIC DEFAULT 0, -- in hours
  average_rating NUMERIC DEFAULT 0,
  metrics_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(metric_date)
);

-- Check if partners table exists
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_name = 'partners'
) AS partners_exists \gset

\if :partners_exists
  -- Partner performance metrics
  CREATE TABLE IF NOT EXISTS partner_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES partners(id) NOT NULL,
    metric_date DATE NOT NULL,
    total_parcels INTEGER DEFAULT 0,
    parcels_processed INTEGER DEFAULT 0,
    average_processing_time NUMERIC DEFAULT 0, -- in minutes
    customer_ratings NUMERIC DEFAULT 0,
    metrics_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(partner_id, metric_date)
  );
\endif

CREATE TABLE IF NOT EXISTS personnel_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personnel_id UUID REFERENCES delivery_personnel(id) NOT NULL,
  metric_date DATE NOT NULL,
  deliveries_assigned INTEGER DEFAULT 0,
  deliveries_completed INTEGER DEFAULT 0,
  on_time_deliveries INTEGER DEFAULT 0,
  average_delivery_time NUMERIC DEFAULT 0, -- in minutes
  total_distance NUMERIC DEFAULT 0, -- in km
  customer_ratings NUMERIC DEFAULT 0,
  metrics_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(personnel_id, metric_date)
);

-- Check if required tables exist before creating materialized views
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_name = 'parcels'
) AS parcels_exists \gset

SELECT EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_name = 'payments'
) AS payments_exists \gset

\if :parcels_exists
\if :payments_exists
  -- Create materialized view for delivery statistics
  DROP MATERIALIZED VIEW IF EXISTS delivery_statistics;
  CREATE MATERIALIZED VIEW IF NOT EXISTS delivery_statistics AS
  SELECT
    date_trunc('day', parcels.created_at)::date AS date,
    COUNT(*) AS total_parcels,
    SUM(CASE WHEN parcels.status = 'delivered' THEN 1 ELSE 0 END) AS delivered_parcels,
    AVG(CASE
      WHEN parcels.status = 'delivered' AND parcels.actual_delivery_time IS NOT NULL
      THEN EXTRACT(EPOCH FROM (parcels.actual_delivery_time - parcels.created_at))/3600
      ELSE NULL
    END) AS avg_delivery_time_hours,
    COUNT(DISTINCT parcels.sender_id) AS active_senders,
    SUM(CASE WHEN payments.payment_status = 'completed' THEN payments.amount ELSE 0 END) AS total_revenue
  FROM
    parcels
  LEFT JOIN
    payments ON parcels.id = payments.parcel_id
  GROUP BY
    date_trunc('day', parcels.created_at)::date
  ORDER BY
    date DESC;

  -- Create refresh function for materialized views
  CREATE OR REPLACE FUNCTION refresh_materialized_views()
  RETURNS void AS $$
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY IF EXISTS delivery_statistics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_retention;
  END;
  $$ LANGUAGE plpgsql;

  -- Create indexes for the views
  CREATE INDEX IF NOT EXISTS idx_delivery_stats_date ON delivery_statistics (date);
\endif
\endif

-- =====================================================
-- 7. INDEXES FOR BETTER PERFORMANCE
-- =====================================================
-- Parcel related indexes
\if :parcels_exists
  CREATE INDEX IF NOT EXISTS idx_parcels_created_at ON parcels (created_at);
  CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels (status);
  CREATE INDEX IF NOT EXISTS idx_parcels_sender_id ON parcels (sender_id);
  CREATE INDEX IF NOT EXISTS idx_parcels_receiver_id ON parcels (receiver_id);
  CREATE INDEX IF NOT EXISTS idx_parcels_pickup_address_id ON parcels (pickup_address_id);
  CREATE INDEX IF NOT EXISTS idx_parcels_dropoff_address_id ON parcels (dropoff_address_id);
  CREATE INDEX IF NOT EXISTS idx_parcels_tracking_code ON parcels (tracking_code);
\endif

-- Payment related indexes
\if :payments_exists
  CREATE INDEX IF NOT EXISTS idx_payments_parcel_id ON payments (parcel_id);
  CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON payments (payment_status);
\endif

CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON payment_transactions (payment_id);

-- User related indexes
\if :profiles_exists
  CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles (id);
\endif

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON user_verifications (user_id);

-- Check if tracking tables exist
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_name = 'parcel_status_history'
) AS parcel_status_history_exists \gset

SELECT EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_name = 'parcel_assignments'
) AS parcel_assignments_exists \gset

\if :parcel_status_history_exists
  CREATE INDEX IF NOT EXISTS idx_parcel_status_history_parcel_id ON parcel_status_history (parcel_id);
  CREATE INDEX IF NOT EXISTS idx_parcel_status_history_status ON parcel_status_history (status);
\endif

\if :parcel_assignments_exists
  CREATE INDEX IF NOT EXISTS idx_parcel_assignments_parcel_id ON parcel_assignments (parcel_id);
  CREATE INDEX IF NOT EXISTS idx_parcel_assignments_personnel_id ON parcel_assignments (personnel_id);
\endif

-- =====================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- =====================================================
-- Payment system
COMMENT ON TABLE payment_gateways IS 'Configured payment providers and their settings';
COMMENT ON TABLE payment_transactions IS 'Detailed payment transaction history with status changes';

-- Pricing system
COMMENT ON TABLE pricing_categories IS 'Categories for different types of pricing (e.g., Standard, Express)';
COMMENT ON TABLE pricing_rules IS 'Rules for calculating delivery prices based on various factors';
COMMENT ON TABLE discount_codes IS 'Promotional discount codes for delivery orders';

-- Check if table exists
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_name = 'price_calculations'
) AS price_calculations_exists \gset

\if :price_calculations_exists
  COMMENT ON TABLE price_calculations IS 'History and breakdown of price calculations for auditing';
\endif

-- Delivery personnel
COMMENT ON TABLE delivery_personnel IS 'Information about delivery drivers and couriers';
COMMENT ON TABLE personnel_shifts IS 'Working shifts for delivery personnel';

\if :parcel_status_history_exists
  COMMENT ON TABLE parcel_status_history IS 'Detailed history of all status changes for parcels';
\endif

\if :parcel_assignments_exists
  COMMENT ON TABLE parcel_assignments IS 'Assignment of parcels to delivery personnel';
\endif

COMMENT ON TABLE delivery_routes IS 'Optimized delivery routes for personnel';
COMMENT ON TABLE personnel_location_history IS 'Location tracking data for delivery personnel';

-- User roles
COMMENT ON TABLE roles IS 'System roles with associated permissions';
COMMENT ON TABLE user_roles IS 'Assignment of roles to users';
COMMENT ON TABLE user_verifications IS 'Verification status for user identity and contact methods';
COMMENT ON TABLE user_activity_log IS 'Audit log of user activities within the system';

-- Analytics
COMMENT ON TABLE system_metrics IS 'Daily system-wide performance metrics';

\if :partners_exists
  COMMENT ON TABLE partner_metrics IS 'Performance metrics for partner locations';
\endif

COMMENT ON TABLE personnel_metrics IS 'Performance metrics for delivery personnel';

-- Check if views exist
SELECT EXISTS (
  SELECT 1 
  FROM pg_matviews 
  WHERE matviewname = 'delivery_statistics'
) AS delivery_statistics_exists \gset

\if :delivery_statistics_exists
  COMMENT ON MATERIALIZED VIEW delivery_statistics IS 'Pre-calculated statistics for delivery performance';
\endif

COMMENT ON MATERIALIZED VIEW user_retention IS 'User retention analysis by cohort based on sender_id';

-- =====================================================
-- 9. ENHANCE EXISTING TABLES
-- =====================================================
-- Enhance parcels table with additional fields if it exists
\if :parcels_exists
  -- Check if price_calculations table exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'price_calculations'
  ) AS price_calculations_exists \gset
  
  \if NOT :price_calculations_exists
    -- Create price_calculations table first if it doesn't exist
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
    
    COMMENT ON TABLE price_calculations IS 'History and breakdown of price calculations for auditing';
  \endif
  
  -- Now add columns to parcels table
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
  ADD COLUMN IF NOT EXISTS rating_comments TEXT,
  ADD COLUMN IF NOT EXISTS price_calculation_id UUID REFERENCES price_calculations(id);
\endif

-- Check if notifications table exists
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_name = 'notifications'
) AS notifications_exists \gset

\if :notifications_exists
  -- Enhanced notifications with templates
  ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS template_id TEXT,
  ADD COLUMN IF NOT EXISTS action_url TEXT,
  ADD COLUMN IF NOT EXISTS action_text TEXT,
  ADD COLUMN IF NOT EXISTS is_actionable BOOLEAN DEFAULT false;
\endif

-- End of schema enhancement script 