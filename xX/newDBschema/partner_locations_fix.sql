-- =====================================================
-- PARTNER LOCATION FIX
-- =====================================================
-- This script ensures the partners and addresses tables are properly set up
-- and creates a partner_locations view for easier data access

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check if partner_locations exists as a view or table and drop it
DO $$
BEGIN
  DROP VIEW IF EXISTS partner_locations;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'partner_locations' AND table_type = 'BASE TABLE'
  ) THEN
    EXECUTE 'DROP TABLE public.partner_locations CASCADE';
  END IF;
END$$;

-- Ensure partners table exists with correct structure
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partners') THEN
    -- Create partners table with enhanced fields
    CREATE TABLE partners (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id),
      business_name TEXT NOT NULL,
      contact_person TEXT,
      phone_number TEXT,
      email TEXT,
      business_type TEXT, -- 'sorting_facility', 'pickup_point', 'dropoff_point', 'both'
      description TEXT,
      working_hours JSONB, -- Structured working hours by day
      color TEXT, -- For map marker
      logo_url TEXT,
      is_facility BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      verification_status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
      rating NUMERIC DEFAULT 0,
      total_ratings INTEGER DEFAULT 0,
      metrics JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    -- Create index on business_name for faster searches
    CREATE INDEX idx_partners_business_name ON partners (business_name);
    CREATE INDEX idx_partners_is_facility ON partners (is_facility);
  ELSE
    -- If table exists, add any missing columns
    BEGIN
      ALTER TABLE partners 
        ADD COLUMN IF NOT EXISTS business_name TEXT,
        ADD COLUMN IF NOT EXISTS contact_person TEXT,
        ADD COLUMN IF NOT EXISTS phone_number TEXT,
        ADD COLUMN IF NOT EXISTS email TEXT,
        ADD COLUMN IF NOT EXISTS business_type TEXT,
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS working_hours JSONB,
        ADD COLUMN IF NOT EXISTS color TEXT,
        ADD COLUMN IF NOT EXISTS logo_url TEXT,
        ADD COLUMN IF NOT EXISTS is_facility BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error adding columns to partners table: %', SQLERRM;
    END;
  END IF;
END$$;

-- Ensure addresses table exists with correct structure
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'addresses') THEN
    -- Create addresses table with enhanced fields
    CREATE TABLE addresses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      partner_id UUID REFERENCES partners(id), -- Optional reference to partner
      user_id UUID REFERENCES auth.users(id), -- Optional reference to user
      address_line TEXT,
      street_address TEXT,
      city TEXT,
      state TEXT,
      postal_code TEXT,
      country TEXT DEFAULT 'Ethiopia',
      latitude NUMERIC,
      longitude NUMERIC,
      is_facility BOOLEAN DEFAULT false,
      is_commercial BOOLEAN DEFAULT false,
      is_residential BOOLEAN DEFAULT true,
      is_verified BOOLEAN DEFAULT false,
      verification_method TEXT, -- 'gps', 'manual', 'geocoding'
      address_notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    -- Create indexes for geospatial queries
    CREATE INDEX idx_addresses_latitude_longitude ON addresses (latitude, longitude);
    CREATE INDEX idx_addresses_partner_id ON addresses (partner_id);
    CREATE INDEX idx_addresses_is_facility ON addresses (is_facility);
  ELSE
    -- If table exists, add any missing columns
    BEGIN
      ALTER TABLE addresses 
        ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id),
        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
        ADD COLUMN IF NOT EXISTS address_line TEXT,
        ADD COLUMN IF NOT EXISTS street_address TEXT,
        ADD COLUMN IF NOT EXISTS city TEXT,
        ADD COLUMN IF NOT EXISTS state TEXT,
        ADD COLUMN IF NOT EXISTS postal_code TEXT,
        ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Ethiopia',
        ADD COLUMN IF NOT EXISTS latitude NUMERIC,
        ADD COLUMN IF NOT EXISTS longitude NUMERIC,
        ADD COLUMN IF NOT EXISTS is_facility BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_commercial BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_residential BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS verification_method TEXT,
        ADD COLUMN IF NOT EXISTS address_notes TEXT,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error adding columns to addresses table: %', SQLERRM;
    END;
  END IF;
END$$;

-- Insert sample partner data if table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM partners LIMIT 1) THEN
    INSERT INTO partners (
      id, business_name, contact_person, phone_number, email, 
      business_type, description, working_hours, color, 
      is_facility, is_active, verification_status
    )
    VALUES
      -- MBet-Adera Sorting Facility Hub
      (
        'aaaaaa01-0000-0000-0000-000000000001',
        'MBet-Adera Sorting Facility Hub',
        'Facility Manager',
        '+251911123456',
        'facility@mbetadera.com',
        'sorting_facility',
        'Main sorting and processing hub for all deliveries',
        '{
          "monday": {"open": "08:00", "close": "20:00"},
          "tuesday": {"open": "08:00", "close": "20:00"},
          "wednesday": {"open": "08:00", "close": "20:00"},
          "thursday": {"open": "08:00", "close": "20:00"},
          "friday": {"open": "08:00", "close": "20:00"},
          "saturday": {"open": "09:00", "close": "17:00"},
          "sunday": {"open": "10:00", "close": "15:00"}
        }',
        '#000000',
        true,
        true,
        'verified'
      ),
      
      -- Regular Partner Pickup/Dropoff Points
      (
        'aaaaaa02-0000-0000-0000-000000000002',
        'Bole Supermarket',
        'Abebe Kebede',
        '+251922123456',
        'bole@mbetadera.com',
        'both',
        'Convenient pickup and dropoff point in Bole area',
        '{
          "monday": {"open": "09:00", "close": "21:00"},
          "tuesday": {"open": "09:00", "close": "21:00"},
          "wednesday": {"open": "09:00", "close": "21:00"},
          "thursday": {"open": "09:00", "close": "21:00"},
          "friday": {"open": "09:00", "close": "21:00"},
          "saturday": {"open": "09:00", "close": "21:00"},
          "sunday": {"open": "10:00", "close": "20:00"}
        }',
        '#4CAF50',
        false,
        true,
        'verified'
      ),
      
      (
        'aaaaaa03-0000-0000-0000-000000000003',
        'Mexico Pharmacy',
        'Tigist Haile',
        '+251933123456',
        'mexico@mbetadera.com',
        'both',
        'Pharmacy that serves as pickup and dropoff point in Mexico area',
        '{
          "monday": {"open": "08:30", "close": "22:00"},
          "tuesday": {"open": "08:30", "close": "22:00"},
          "wednesday": {"open": "08:30", "close": "22:00"},
          "thursday": {"open": "08:30", "close": "22:00"},
          "friday": {"open": "08:30", "close": "22:00"},
          "saturday": {"open": "08:30", "close": "22:00"},
          "sunday": {"open": "09:00", "close": "21:00"}
        }',
        '#2196F3',
        false,
        true,
        'verified'
      ),
      
      (
        'aaaaaa04-0000-0000-0000-000000000004',
        'Piassa Market',
        'Solomon Girma',
        '+251944123456',
        'piassa@mbetadera.com',
        'both',
        'Central market location serving historic Piassa district',
        '{
          "monday": {"open": "08:00", "close": "19:00"},
          "tuesday": {"open": "08:00", "close": "19:00"},
          "wednesday": {"open": "08:00", "close": "19:00"},
          "thursday": {"open": "08:00", "close": "19:00"},
          "friday": {"open": "08:00", "close": "19:00"},
          "saturday": {"open": "08:00", "close": "19:00"},
          "sunday": {"open": "09:00", "close": "16:00"}
        }',
        '#FF9800',
        false,
        true,
        'verified'
      ),
      
      (
        'aaaaaa05-0000-0000-0000-000000000005',
        'Kazanchis Office',
        'Hiwot Alemayehu',
        '+251955123456',
        'kazanchis@mbetadera.com',
        'both',
        'Business center in Kazanchis serving local businesses',
        '{
          "monday": {"open": "08:30", "close": "18:00"},
          "tuesday": {"open": "08:30", "close": "18:00"},
          "wednesday": {"open": "08:30", "close": "18:00"},
          "thursday": {"open": "08:30", "close": "18:00"},
          "friday": {"open": "08:30", "close": "18:00"},
          "saturday": {"open": "09:00", "close": "14:00"},
          "sunday": null
        }',
        '#9C27B0',
        false,
        true,
        'verified'
      ),
      
      (
        'aaaaaa06-0000-0000-0000-000000000006',
        'Megenagna Mini Hub',
        'Dawit Bekele',
        '+251966123456',
        'megenagna@mbetadera.com',
        'both',
        'Mini sorting facility and partner location at Megenagna',
        '{
          "monday": {"open": "08:00", "close": "19:00"},
          "tuesday": {"open": "08:00", "close": "19:00"},
          "wednesday": {"open": "08:00", "close": "19:00"},
          "thursday": {"open": "08:00", "close": "19:00"},
          "friday": {"open": "08:00", "close": "19:00"},
          "saturday": {"open": "09:00", "close": "17:00"},
          "sunday": {"open": "10:00", "close": "16:00"}
        }',
        '#F44336',
        true,
        true,
        'verified'
      ),
      
      (
        'aaaaaa07-0000-0000-0000-000000000007',
        'Lamberet Express',
        'Kidus Tadesse',
        '+251977123456',
        'lamberet@mbetadera.com',
        'both',
        'Fast processing point for express deliveries in Lamberet area',
        '{
          "monday": {"open": "07:00", "close": "20:00"},
          "tuesday": {"open": "07:00", "close": "20:00"},
          "wednesday": {"open": "07:00", "close": "20:00"},
          "thursday": {"open": "07:00", "close": "20:00"},
          "friday": {"open": "07:00", "close": "20:00"},
          "saturday": {"open": "08:00", "close": "18:00"},
          "sunday": {"open": "09:00", "close": "17:00"}
        }',
        '#009688',
        false,
        true,
        'verified'
      ),
      
      (
        'aaaaaa08-0000-0000-0000-000000000008',
        'Ayat Terminal',
        'Ruth Mekonnen',
        '+251988123456',
        'ayat@mbetadera.com',
        'both',
        'Terminal location serving the Ayat and CMC areas',
        '{
          "monday": {"open": "07:30", "close": "19:30"},
          "tuesday": {"open": "07:30", "close": "19:30"},
          "wednesday": {"open": "07:30", "close": "19:30"},
          "thursday": {"open": "07:30", "close": "19:30"},
          "friday": {"open": "07:30", "close": "19:30"},
          "saturday": {"open": "08:00", "close": "18:00"},
          "sunday": {"open": "09:00", "close": "17:00"}
        }',
        '#673AB7',
        false,
        true,
        'verified'
      );
  END IF;
END$$;

-- Insert sample address data for partners if addresses table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM addresses WHERE partner_id IS NOT NULL LIMIT 1) THEN
    INSERT INTO addresses (
      id, partner_id, address_line, street_address, city, 
      latitude, longitude, is_facility, is_commercial, is_residential
    )
    VALUES
      -- MBet-Adera Sorting Facility Hub
      (
        'bbbbbb01-0000-0000-0000-000000000001',
        'aaaaaa01-0000-0000-0000-000000000001',
        'MBet-Adera Sorting Facility Hub, Bole Road',
        'Near Bole International Airport',
        'Addis Ababa',
        8.9770,
        38.7995,
        true,
        true,
        false
      ),
      
      -- Bole Supermarket
      (
        'bbbbbb02-0000-0000-0000-000000000002',
        'aaaaaa02-0000-0000-0000-000000000002',
        'Bole Supermarket, Bole Road',
        'Next to Bole Medhanialem Church',
        'Addis Ababa',
        8.9806, 
        38.7578,
        false,
        true,
        false
      ),
      
      -- Mexico Pharmacy
      (
        'bbbbbb03-0000-0000-0000-000000000003',
        'aaaaaa03-0000-0000-0000-000000000003',
        'Mexico Pharmacy, Mexico Square',
        'Mexico Area, Near St. Estifanos Church',
        'Addis Ababa',
        9.0092, 
        38.7645,
        false,
        true,
        false
      ),
      
      -- Piassa Market
      (
        'bbbbbb04-0000-0000-0000-000000000004',
        'aaaaaa04-0000-0000-0000-000000000004',
        'Piassa Market Center',
        'Near Taitu Hotel, Piassa',
        'Addis Ababa',
        9.0333, 
        38.7500,
        false,
        true,
        false
      ),
      
      -- Kazanchis Office
      (
        'bbbbbb05-0000-0000-0000-000000000005',
        'aaaaaa05-0000-0000-0000-000000000005',
        'Kazanchis Business Center',
        'Behind UNECA, Kazanchis',
        'Addis Ababa',
        9.0167, 
        38.7667,
        false,
        true,
        false
      ),
      
      -- Megenagna Mini Hub
      (
        'bbbbbb06-0000-0000-0000-000000000006',
        'aaaaaa06-0000-0000-0000-000000000006',
        'Megenagna Mini Hub',
        'Near Megenagna Roundabout',
        'Addis Ababa',
        9.0233, 
        38.8079,
        true,
        true,
        false
      ),
      
      -- Lamberet Express
      (
        'bbbbbb07-0000-0000-0000-000000000007',
        'aaaaaa07-0000-0000-0000-000000000007',
        'Lamberet Express Center',
        'Near Lamberet Bus Terminal',
        'Addis Ababa',
        9.0490, 
        38.8354,
        false,
        true,
        false
      ),
      
      -- Ayat Terminal
      (
        'bbbbbb08-0000-0000-0000-000000000008',
        'aaaaaa08-0000-0000-0000-000000000008',
        'Ayat Terminal Hub',
        'Near Ayat Condominium, CMC Road',
        'Addis Ababa',
        9.0515, 
        38.8681,
        false,
        true,
        false
      );
  END IF;
END$$;

-- Create the partner_locations view
CREATE OR REPLACE VIEW partner_locations AS
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
  a.is_verified AS address_verified
FROM
  partners p
JOIN
  addresses a ON p.id = a.partner_id
WHERE
  p.is_active = true;

-- Grant access to the view
GRANT SELECT ON partner_locations TO anon;
GRANT SELECT ON partner_locations TO authenticated;
GRANT ALL ON partner_locations TO service_role;

-- Enable RLS but check if policies already exist to avoid errors
DO $$
BEGIN
  -- Enable RLS on partners and addresses
  ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
  ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
  
  -- Check if partners policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'partners' AND policyname = 'partners_select_policy'
  ) THEN
    CREATE POLICY partners_select_policy ON partners
      FOR SELECT 
      TO public
      USING (true);
    RAISE NOTICE 'Created partners_select_policy';
  ELSE
    RAISE NOTICE 'partners_select_policy already exists, skipping creation';
  END IF;
  
  -- Check if addresses policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'addresses' AND policyname = 'addresses_select_policy'
  ) THEN
    CREATE POLICY addresses_select_policy ON addresses
      FOR SELECT 
      TO public
      USING (true);
    RAISE NOTICE 'Created addresses_select_policy';
  ELSE
    RAISE NOTICE 'addresses_select_policy already exists, skipping creation';
  END IF;
END$$;

-- Return success
SELECT 'Partner and address data successfully updated' as result; 