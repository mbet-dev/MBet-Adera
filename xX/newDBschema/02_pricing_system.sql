-- MBet-Adera Pricing System
-- This script adds the dynamic pricing system to the database

-- Ensure we have uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create pricing categories table
CREATE TABLE IF NOT EXISTS pricing_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create pricing rules table
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

-- Create discount codes table
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

-- Insert default pricing categories
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

-- Create price calculations table if parcels table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parcels') THEN
    -- Create price calculation history table
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
    
    -- Add comment to price_calculations
    COMMENT ON TABLE price_calculations IS 'History and breakdown of price calculations for auditing';
  END IF;
END $$;

-- Add documentation comments
COMMENT ON TABLE pricing_categories IS 'Categories for different types of pricing (e.g., Standard, Express)';
COMMENT ON TABLE pricing_rules IS 'Rules for calculating delivery prices based on various factors';
COMMENT ON TABLE discount_codes IS 'Promotional discount codes for delivery orders'; 