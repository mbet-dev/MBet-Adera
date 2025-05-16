-- Reset and Populate Partners and Addresses Script
-- This script will:
-- 1. Clean up any existing temporary tables
-- 2. Delete existing data from partners, addresses, partner_locations
-- 3. Add pickup_point_id and dropoff_point_id columns to parcels table if needed
-- 4. Create working hours function
-- 5. Create 20 new partners (18 businesses + 2 facilities)
-- 6. Create matching addresses with proper geographic distribution
-- 7. Populate parcels with test scenarios using sender/receiver information
-- 8. Create or update the parcels_with_addresses view to include pickup/dropoff points
-- 9. Verify data integrity and distribution

-- Start transaction
BEGIN;

-- 1. Clean up any existing temporary tables that might exist
DROP TABLE IF EXISTS temp_duplicate_partners;
DROP TABLE IF EXISTS temp_addresses_with_multiple_partners;
DROP TABLE IF EXISTS temp_partner_address_mapping;

-- 2. Delete existing data in proper order to avoid foreign key constraints
-- First, handle parcel_status_history which references parcels
DELETE FROM parcel_status_history;

-- Handle circular dependency between parcels and price_calculations
-- Temporarily disable foreign key constraints
SET session_replication_role = 'replica';

-- Delete from all tables without constraint checks
DELETE FROM parcels;
DELETE FROM price_calculations;
DELETE FROM partners;
DELETE FROM addresses;

-- Re-enable foreign key constraints
SET session_replication_role = 'origin';

-- 3. Alter parcels table to add pickup_point_id and dropoff_point_id if they don't exist
DO $$
BEGIN
  -- Check if pickup_point_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parcels' AND column_name = 'pickup_point_id'
  ) THEN
    -- Add pickup_point_id column
    EXECUTE 'ALTER TABLE parcels ADD COLUMN pickup_point_id UUID REFERENCES partners(id)';
  END IF;

  -- Check if dropoff_point_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parcels' AND column_name = 'dropoff_point_id'
  ) THEN
    -- Add dropoff_point_id column
    EXECUTE 'ALTER TABLE parcels ADD COLUMN dropoff_point_id UUID REFERENCES partners(id)';
  END IF;
END $$;

-- 4. Create function to generate working hours JSON
CREATE OR REPLACE FUNCTION generate_working_hours(
  mon_open TEXT, mon_close TEXT,
  tue_open TEXT, tue_close TEXT, 
  wed_open TEXT, wed_close TEXT,
  thu_open TEXT, thu_close TEXT,
  fri_open TEXT, fri_close TEXT,
  sat_open TEXT, sat_close TEXT,
  sun_open TEXT, sun_close TEXT
) RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'monday', jsonb_build_object('open', mon_open, 'close', mon_close),
    'tuesday', jsonb_build_object('open', tue_open, 'close', tue_close),
    'wednesday', jsonb_build_object('open', wed_open, 'close', wed_close),
    'thursday', jsonb_build_object('open', thu_open, 'close', thu_close),
    'friday', jsonb_build_object('open', fri_open, 'close', fri_close),
    'saturday', jsonb_build_object('open', sat_open, 'close', sat_close),
    'sunday', jsonb_build_object('open', sun_open, 'close', sun_close)
  );
END;
$$ LANGUAGE plpgsql;

-- 5. Create the partners and addresses
-- Will use an array approach to make it more maintainable
DO $$
DECLARE
  partner_id UUID;
  address_id UUID;
  
  -- Array of business names
  business_names TEXT[] := ARRAY[
    -- Facilities (2)
    'MBet-Adera Headquarters',
    'MBet-Adera Sorting Facility',
    
    -- Regular businesses (18)
    'Merkato Fashion Gallery',
    'Piassa Electronics',
    'Habesha Cultural Restaurant',
    'Tomoca Coffee Bole',
    'Genet Pharmacy',
    'Eve Beauty Salon',
    'Teshome Electronics',
    'Addis Book Center',
    'Shoa Supermarket Megenagna',
    'Sabegn Ethiopian Fashion',
    'CMC Convenience Store',
    'Kazanchis Computer Center',
    'Bole Office Supplies',
    'Lideta Fresh Market',
    'Kaliti Hardware Store',
    'Lafto Mobile Shop',
    'Jemo Furniture Gallery',
    'Ayat Boutique Bakery'
  ];
  
  -- Array of business types
  business_types TEXT[] := ARRAY[
    'Headquarters',
    'Sorting Facility',
    'Retail - Clothing',
    'Retail - Electronics',
    'Restaurant',
    'Coffee Shop',
    'Pharmacy',
    'Beauty & Cosmetics',
    'Retail - Electronics',
    'Retail - Books',
    'Retail - Supermarket',
    'Retail - Fashion',
    'Retail - Convenience',
    'Retail - Computer',
    'Retail - Office Supplies',
    'Retail - Grocery',
    'Retail - Hardware',
    'Retail - Mobile',
    'Retail - Furniture',
    'Retail - Bakery'
  ];
  
  -- Array of contact persons
  contact_persons TEXT[] := ARRAY[
    'Henok Tesfaye',
    'Sara Abebe',
    'Yonas Berhanu',
    'Amanuel Tesfay',
    'Tigist Haile',
    'Dawit Mengistu',
    'Selam Bekele',
    'Helen Desta',
    'Teshome Arega',
    'Abebe Kebede',
    'Kidist Alemayehu',
    'Meron Haile',
    'Daniel Gebre',
    'Rahel Solomon',
    'Bereket Tadesse',
    'Meskerem Alemu',
    'Solomon Bekele',
    'Hanna Tadesse',
    'Yohannes Alemu',
    'Bethlehem Kebede'
  ];
  
  -- Array of phone numbers
  phone_numbers TEXT[] := ARRAY[
    '+251115570001',
    '+251115570002',
    '+251115570003',
    '+251115570004',
    '+251911234567',
    '+251922345678',
    '+251933456789',
    '+251944567890',
    '+251955678901',
    '+251966789012',
    '+251977890123',
    '+251988901234',
    '+251911987654',
    '+251922876543',
    '+251933765432',
    '+251944654321',
    '+251955543210',
    '+251966432109',
    '+251977321098',
    '+251988210987'
  ];
  
  -- Array of emails
  emails TEXT[] := ARRAY[
    'info@mbet-adera.com',
    'sorting@mbet-adera.com',
    'merkato.fashion@example.com',
    'piassa.electronics@example.com',
    'info@habesharestaurant.com',
    'bole@tomoca.com',
    'info@genetpharmacy.com',
    'appointments@evebeauty.com',
    'sales@teshome-electronics.com',
    'info@addisbookcenter.com',
    'info@shoasupermarket.com',
    'contact@sabegnfashion.com',
    'cmc.store@example.com',
    'kazanchis.computers@example.com',
    'bole.office@example.com',
    'fresh@lidetamarket.com',
    'kaliti.hardware@example.com',
    'lafto.mobile@example.com',
    'info@jemofurniture.com',
    'hello@ayatbakery.com'
  ];
  
  -- Array of colors
  colors TEXT[] := ARRAY[
    '#3498db', -- Blue
    '#2ecc71', -- Green
    '#f39c12', -- Orange
    '#e74c3c', -- Red
    '#9b59b6', -- Purple
    '#f1c40f', -- Yellow
    '#27ae60', -- Dark Green
    '#d35400', -- Burnt Orange
    '#3498db', -- Blue
    '#16a085', -- Teal
    '#e67e22', -- Dark Orange
    '#9b59b6', -- Purple
    '#2980b9', -- Dark Blue
    '#8e44ad', -- Dark Purple
    '#c0392b', -- Dark Red
    '#1abc9c', -- Turquoise
    '#d35400', -- Burnt Orange
    '#7f8c8d', -- Gray
    '#34495e', -- Navy
    '#f39c12'  -- Orange
  ];
  
  -- Array of descriptions
  descriptions TEXT[] := ARRAY[
    'Main headquarters for MBet-Adera operations',
    'Central sorting facility for all parcels',
    'Premium clothing store offering local and imported fashion',
    'Electronics and gadget shop with latest technology products',
    'Traditional Ethiopian cuisine in a cultural setting',
    'Famous Ethiopian coffee shop with fresh roasted beans',
    'Full-service pharmacy with prescription and OTC medications',
    'Premium beauty salon offering hair, nail and skin treatments',
    'Wide range of electronics, computers and accessories',
    'Comprehensive bookstore with local and international titles',
    'Large supermarket with wide range of groceries and household items',
    'Modern Ethiopian fashion and traditional clothing store',
    'Neighborhood convenience store with essential items',
    'Computer and IT equipment shop with repair services',
    'Office supplies, stationery and business equipment store',
    'Fresh produce market with locally sourced fruits and vegetables',
    'Hardware, tools and building supplies store',
    'Mobile phones, accessories and repair services',
    'Quality furniture showroom with traditional and modern styles',
    'Artisanal bakery offering fresh bread and pastries'
  ];
  
  -- Array of address lines
  address_lines TEXT[] := ARRAY[
    'Bole Road, Flamingo Area, Behind Edna Mall',
    'Megenagna, Next to Megenagna Square, Building 27',
    'Merkato, Anwar Mosque Area, Shop 124',
    'Piassa, Churchill Road, Near National Theater',
    'CMC, Silver Spring Apartments Area, Main Street',
    'Bole Dembel Mall, 1st Floor, Shop B12',
    'Gerji Condominium Area, Building C23, Ground Floor',
    'Kazanchis Mall, 4th Floor, Unit 405',
    'Merkato, Dubai Tera Shopping Center, Shop 217',
    'Sarbet, Behind Dembel City Center, Building A3',
    'Megenagna, Sunrise Building, Ground Floor',
    'Mexico Area, Sunshine Building, 2nd Floor',
    'CMC Road, Near Total Gas Station',
    'Kazanchis, Century Mall, 3rd Floor, Unit 302',
    'Bole Road, Wollo Sefer Area, Sunrise Tower',
    'Lideta, Near St. Lideta Church',
    'Kaliti, Industrial Zone, Shop 45',
    'Lafto, Lafto Mall, Shop 23',
    'Jemo, Jemo Michael Area, Building 12',
    'Ayat, Ayat Condominium, Block 5'
  ];
  
  -- Array of street addresses
  street_addresses TEXT[] := ARRAY[
    'Bole Road',
    'Megenagna Avenue',
    'Merkato Market Road',
    'Churchill Road',
    'CMC Road',
    'Ethio-China St',
    'Gerji Road',
    'Ras Mekonen St',
    'Dubai Tera Road',
    'Sarbet Road',
    'Megenagna Avenue',
    'Mexico Square',
    'CMC Road',
    'Kazanchis Main St',
    'Bole Road',
    'Lideta Main St',
    'Kaliti Industrial Ave',
    'Lafto Main Road',
    'Jemo Michael Road',
    'Ayat Road'
  ];
  
  -- Array of latitudes (Addis Ababa area with dispersion)
  latitudes NUMERIC[] := ARRAY[
    9.01330, -- Bole
    9.02050, -- Megenagna 
    9.03650, -- Merkato
    9.03260, -- Piassa
    9.03740, -- CMC
    9.00920, -- Bole Dembel
    9.01490, -- Gerji
    9.01810, -- Kazanchis
    9.03380, -- Dubai Tera
    8.99620, -- Sarbet
    9.02200, -- Megenagna
    9.01470, -- Mexico
    9.03800, -- CMC
    9.01750, -- Kazanchis
    9.01250, -- Bole
    8.98000, -- Lideta
    8.95000, -- Kaliti
    8.96500, -- Lafto
    8.93000, -- Jemo
    9.04500  -- Ayat
  ];
  
  -- Array of longitudes (Addis Ababa area with dispersion)
  longitudes NUMERIC[] := ARRAY[
    38.79950, -- Bole
    38.80180, -- Megenagna
    38.74290, -- Merkato
    38.75020, -- Piassa
    38.76490, -- CMC
    38.78950, -- Bole Dembel
    38.83040, -- Gerji
    38.76020, -- Kazanchis
    38.74470, -- Dubai Tera
    38.76860, -- Sarbet
    38.80300, -- Megenagna
    38.76330, -- Mexico
    38.76600, -- CMC
    38.76100, -- Kazanchis
    38.80100, -- Bole
    38.74500, -- Lideta
    38.77000, -- Kaliti
    38.73500, -- Lafto
    38.72000, -- Jemo
    38.84000  -- Ayat
  ];
  
  -- Array for is_facility flags
  is_facilities BOOLEAN[] := ARRAY[
    true,  -- HQ
    true,  -- Sorting Facility
    false, -- The rest are regular business partners
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false
  ];
  
BEGIN
  -- Loop through each partner and create records
  FOR i IN 1..array_length(business_names, 1) LOOP
    -- Generate IDs
    partner_id := gen_random_uuid();
    address_id := gen_random_uuid();
    
    -- Create partner record
    INSERT INTO partners (
      id, business_name, business_type, description, phone_number, email, 
      contact_person, color, is_facility, working_hours, is_active, 
      verification_status, created_at, updated_at, rating
    ) VALUES (
      partner_id, 
      business_names[i], 
      business_types[i], 
      descriptions[i],
      phone_numbers[i], 
      emails[i], 
      contact_persons[i],
      colors[i], 
      is_facilities[i], 
      CASE 
        WHEN is_facilities[i] = true THEN 
          generate_working_hours('08:00', '20:00', '08:00', '20:00', '08:00', '20:00', 
                               '08:00', '20:00', '08:00', '20:00', '09:00', '17:00', '10:00', '16:00')
        ELSE 
          generate_working_hours('09:00', '18:00', '09:00', '18:00', '09:00', '18:00', 
                               '09:00', '18:00', '09:00', '18:00', '10:00', '17:00', '11:00', '16:00')
      END,
      true, 
      'verified', 
      NOW() - (random() * interval '30 days'), 
      NOW(), 
      CASE WHEN i > 2 THEN 4.0 + random() ELSE 5.0 END
    );
    
    -- Create address record with 1:1 relationship to partner
    INSERT INTO addresses (
      id, partner_id, address_line, street_address, city, state, 
      postal_code, country, latitude, longitude, is_facility, 
      is_verified, created_at, updated_at, is_commercial
    ) VALUES (
      address_id,
      partner_id,
      address_lines[i],
      street_addresses[i],
      'Addis Ababa',
      'Addis Ababa',
      '1000',
      'Ethiopia',
      latitudes[i],
      longitudes[i],
      is_facilities[i],
      true,
      NOW() - (random() * interval '30 days'),
      NOW(),
      true
    );
    
    -- Output progress
    RAISE NOTICE 'Created partner and address: %', business_names[i];
  END LOOP;
END $$;

-- 6. Create test parcels with partner addresses only
DO $$
DECLARE
  -- Get partner IDs
  hq_id UUID;
  sorting_id UUID;
  
  -- For parcel creation
  price_calculation_id UUID;
  parcel_id UUID;
  payment_method_id UUID;
  
  -- Array of package sizes
  sizes TEXT[] := ARRAY['small', 'medium', 'large', 'document'];
  
  -- For tracking code generation
  tracking_prefix TEXT := 'MBA';
  tracking_number TEXT;
  
  -- For random selection
  random_partner_id UUID;
  random_partner2_id UUID;
  random_partner3_id UUID;
  
  -- For address lookup
  pickup_address_id UUID;
  dropoff_address_id UUID;
  pickup_point_id UUID;
  dropoff_point_id UUID;
  
  -- For sender/receiver info
  sender_name TEXT;
  sender_phone TEXT;
  receiver_name TEXT;
  receiver_phone TEXT;
  
  -- Contact information arrays needed for parcels
  contact_persons TEXT[] := ARRAY[
    'Henok Tesfaye',
    'Sara Abebe',
    'Yonas Berhanu',
    'Amanuel Tesfay',
    'Tigist Haile',
    'Dawit Mengistu'
  ];
  
  phone_numbers TEXT[] := ARRAY[
    '+251115570001',
    '+251115570002',
    '+251115570003',
    '+251115570004',
    '+251911234567',
    '+251922345678'
  ];
  
  -- For customer profiles
  customer_ids UUID[];
  customer_count INTEGER;
BEGIN
  -- Get facility IDs for reference
  SELECT id INTO hq_id FROM partners WHERE business_name = 'MBet-Adera Headquarters';
  SELECT id INTO sorting_id FROM partners WHERE business_name = 'MBet-Adera Sorting Facility';
  
  -- Get customer profiles
  SELECT array_agg(id) INTO customer_ids FROM profiles WHERE role = 'customer' LIMIT 3;
  
  -- Fallback if no customers found
  IF customer_ids IS NULL OR array_length(customer_ids, 1) IS NULL THEN
    -- Create basic customer profiles
    customer_ids := ARRAY[
      gen_random_uuid(),
      gen_random_uuid(),
      gen_random_uuid()
    ];
    
    -- Create 3 customer profiles if none exist
    FOR i IN 1..3 LOOP
      INSERT INTO profiles (
        id, email, first_name, last_name, full_name, phone_number, 
        role, created_at, updated_at, account_status
      ) VALUES (
        customer_ids[i],
        'customer' || i || '@example.com',
        CASE 
          WHEN i = 1 THEN 'Abebe'
          WHEN i = 2 THEN 'Kebede'
          ELSE 'Almaz'
        END,
        CASE 
          WHEN i = 1 THEN 'Kebede'
          WHEN i = 2 THEN 'Tadesse'
          ELSE 'Haile'
        END,
        CASE 
          WHEN i = 1 THEN 'Abebe Kebede'
          WHEN i = 2 THEN 'Kebede Tadesse'
          ELSE 'Almaz Haile'
        END,
        CASE 
          WHEN i = 1 THEN '+251911123456'
          WHEN i = 2 THEN '+251922123456'
          ELSE '+251933123456'
        END,
        'customer',
        NOW(),
        NOW(),
        'active'
      )
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END IF;
  
  -- Get count of customer profiles
  customer_count := array_length(customer_ids, 1);
  RAISE NOTICE 'Found % customer profiles for testing', customer_count;
  
  -- Create dummy payment_method_id if it doesn't exist already
  payment_method_id := gen_random_uuid();
  INSERT INTO payment_methods (id, name, description, is_active, created_at, updated_at)
  VALUES (payment_method_id, 'Cash on Delivery', 'Payment collected on delivery', true, NOW(), NOW())
  ON CONFLICT DO NOTHING; -- In case there's a conflict with an existing entry
  
  -- Temporarily disable constraints for circular references
  SET session_replication_role = 'replica';
  
  -- Create 10 test parcels with various combinations
  FOR i IN 1..10 LOOP
    -- Generate tracking number
    tracking_number := tracking_prefix || to_char(NOW(), 'YYYYMMDD') || LPAD(i::text, 4, '0');
    
    -- Pre-generate IDs
    price_calculation_id := gen_random_uuid();
    parcel_id := gen_random_uuid();
    
    -- Select random partners for pickup/dropoff
    -- Get three different random partners
    SELECT id INTO random_partner_id FROM partners 
    WHERE is_facility = false 
    ORDER BY random() 
    LIMIT 1;
    
    SELECT id INTO random_partner2_id FROM partners 
    WHERE is_facility = false AND id != random_partner_id
    ORDER BY random() 
    LIMIT 1;
    
    SELECT id INTO random_partner3_id FROM partners 
    WHERE is_facility = false AND id != random_partner_id AND id != random_partner2_id
    ORDER BY random() 
    LIMIT 1;
    
    -- Get pickup/dropoff address IDs
    -- Generate scenario based on i
    CASE 
      WHEN i = 1 THEN
        -- Partner1 to Partner2
        SELECT id INTO pickup_address_id FROM addresses WHERE partner_id = random_partner_id;
        SELECT id INTO dropoff_address_id FROM addresses WHERE partner_id = random_partner2_id;
        pickup_point_id := random_partner_id;
        dropoff_point_id := random_partner2_id;
      WHEN i = 2 THEN
        -- Partner2 to Partner3
        SELECT id INTO pickup_address_id FROM addresses WHERE partner_id = random_partner2_id;
        SELECT id INTO dropoff_address_id FROM addresses WHERE partner_id = random_partner3_id;
        pickup_point_id := random_partner2_id;
        dropoff_point_id := random_partner3_id;
      WHEN i = 3 THEN
        -- Partner3 to Partner1
        SELECT id INTO pickup_address_id FROM addresses WHERE partner_id = random_partner3_id;
        SELECT id INTO dropoff_address_id FROM addresses WHERE partner_id = random_partner_id;
        pickup_point_id := random_partner3_id;
        dropoff_point_id := random_partner_id;
      WHEN i = 4 THEN
        -- Partner1 to Sorting Facility
        SELECT id INTO pickup_address_id FROM addresses WHERE partner_id = random_partner_id;
        SELECT id INTO dropoff_address_id FROM addresses WHERE partner_id = sorting_id;
        pickup_point_id := random_partner_id;
        dropoff_point_id := sorting_id;
      WHEN i = 5 THEN
        -- Sorting Facility to Partner2
        SELECT id INTO pickup_address_id FROM addresses WHERE partner_id = sorting_id;
        SELECT id INTO dropoff_address_id FROM addresses WHERE partner_id = random_partner2_id;
        pickup_point_id := sorting_id;
        dropoff_point_id := random_partner2_id;
      WHEN i = 6 THEN
        -- Partner3 to HQ
        SELECT id INTO pickup_address_id FROM addresses WHERE partner_id = random_partner3_id;
        SELECT id INTO dropoff_address_id FROM addresses WHERE partner_id = hq_id;
        pickup_point_id := random_partner3_id;
        dropoff_point_id := hq_id;
      WHEN i = 7 THEN
        -- HQ to Partner1
        SELECT id INTO pickup_address_id FROM addresses WHERE partner_id = hq_id;
        SELECT id INTO dropoff_address_id FROM addresses WHERE partner_id = random_partner_id;
        pickup_point_id := hq_id;
        dropoff_point_id := random_partner_id;
      WHEN i = 8 THEN
        -- Partner2 to Partner3
        SELECT id INTO pickup_address_id FROM addresses WHERE partner_id = random_partner2_id;
        SELECT id INTO dropoff_address_id FROM addresses WHERE partner_id = random_partner3_id;
        pickup_point_id := random_partner2_id;
        dropoff_point_id := random_partner3_id;
      WHEN i = 9 THEN
        -- Partner1 to HQ
        SELECT id INTO pickup_address_id FROM addresses WHERE partner_id = random_partner_id;
        SELECT id INTO dropoff_address_id FROM addresses WHERE partner_id = hq_id;
        pickup_point_id := random_partner_id;
        dropoff_point_id := hq_id;
      ELSE
        -- Sorting Facility to Partner3
        SELECT id INTO pickup_address_id FROM addresses WHERE partner_id = sorting_id;
        SELECT id INTO dropoff_address_id FROM addresses WHERE partner_id = random_partner3_id;
        pickup_point_id := sorting_id;
        dropoff_point_id := random_partner3_id;
    END CASE;
    
    -- Get sender and receiver information from profiles
    SELECT full_name, phone_number INTO sender_name, sender_phone
    FROM profiles 
    WHERE id = customer_ids[1 + (i % customer_count)];
    
    SELECT full_name, phone_number INTO receiver_name, receiver_phone
    FROM profiles 
    WHERE id = customer_ids[1 + ((i + 1) % customer_count)];
    
    -- Create price calculation with pre-generated parcel_id 
    INSERT INTO price_calculations (
      id, parcel_id, base_price, distance_fee, weight_fee, 
      subtotal, total_price, created_at
    ) VALUES (
      price_calculation_id,
      parcel_id, -- Use pre-generated ID to avoid NULL constraint
      50.0 + (random() * 50),
      10.0 + (random() * 40),
      5.0 + (random() * 20),
      0, -- Will be calculated
      0, -- Will be calculated
      NOW()
    );
    
    -- Update subtotal and total
    UPDATE price_calculations 
    SET subtotal = base_price + COALESCE(distance_fee, 0) + COALESCE(weight_fee, 0),
        total_price = base_price + COALESCE(distance_fee, 0) + COALESCE(weight_fee, 0)
    WHERE id = price_calculation_id;
    
    -- Create the parcel using partner addresses only and the pre-generated ID
    INSERT INTO parcels (
      id, sender_id, receiver_id, pickup_address_id, dropoff_address_id,
      tracking_code, status, delivery_type, package_size, weight,
      dimensions, estimated_delivery_time, pickup_contact, pickup_phone,
      dropoff_contact, dropoff_phone, created_at, updated_at, 
      handle_with_care, requires_refrigeration, is_fragile,
      delivery_instructions, estimated_price, actual_price, payment_status, 
      payment_method_id, price_calculation_id, pickup_point_id, dropoff_point_id
    ) VALUES (
      parcel_id, -- Use pre-generated ID
      customer_ids[1 + (i % customer_count)], -- Sender ID from customer profiles
      customer_ids[1 + ((i + 1) % customer_count)], -- Receiver ID from customer profiles (different from sender)
      pickup_address_id,
      dropoff_address_id,
      tracking_number,
      CASE 
        WHEN i <= 2 THEN 'pending'
        WHEN i <= 4 THEN 'picked_up'
        WHEN i <= 6 THEN 'in_transit'
        WHEN i <= 8 THEN 'out_for_delivery'
        ELSE 'delivered'
      END,
      CASE 
        WHEN i % 3 = 0 THEN 'express' 
        WHEN i % 3 = 1 THEN 'standard'
        ELSE 'scheduled'
      END,
      sizes[(i % array_length(sizes, 1)) + 1],
      0.5 + (random() * 9.5), -- 0.5kg to 10kg
      jsonb_build_object(
        'length', 10 + (random() * 40),
        'width', 10 + (random() * 30),
        'height', 5 + (random() * 25)
      ),
      NOW() + (interval '1 day' * (1 + (i % 5))),
      sender_name, -- Use sender's name from profile
      sender_phone, -- Use sender's phone from profile
      receiver_name, -- Use receiver's name from profile
      receiver_phone, -- Use receiver's phone from profile
      NOW() - (interval '1 day' * (10 - i)), -- Create dates in sequence
      NOW(),
      i % 2 = 0, -- Alternating true/false
      i % 5 = 0, -- Every fifth parcel
      i % 3 = 0, -- Every third parcel
      CASE 
        WHEN i % 4 = 0 THEN 'Please handle with care'
        WHEN i % 4 = 1 THEN 'Call before delivery'
        WHEN i % 4 = 2 THEN 'Leave at door if no answer'
        ELSE 'Requires signature'
      END,
      (SELECT total_price FROM price_calculations WHERE id = price_calculation_id),
      (SELECT total_price FROM price_calculations WHERE id = price_calculation_id),
      'paid', -- Based on sample data, all records use 'paid'
      payment_method_id,
      price_calculation_id,
      pickup_point_id,
      dropoff_point_id
    );
    
    -- Create parcel status history without user references
    INSERT INTO parcel_status_history (
      id, parcel_id, status, notes, created_at
    ) VALUES (
      gen_random_uuid(),
      parcel_id,
      'created',
      'Parcel created in system',
      NOW() - (interval '1 day' * (10 - i))
    );
    
    -- Add additional status updates based on parcel status
    IF i > 2 THEN
      INSERT INTO parcel_status_history (
        id, parcel_id, status, notes, created_at
      ) VALUES (
        gen_random_uuid(),
        parcel_id,
        'picked_up',
        'Parcel picked up from origin',
        NOW() - (interval '1 day' * (10 - i)) + interval '2 hours'
      );
    END IF;
    
    IF i > 4 THEN
      INSERT INTO parcel_status_history (
        id, parcel_id, status, notes, created_at
      ) VALUES (
        gen_random_uuid(),
        parcel_id,
        'in_transit',
        'Parcel in transit to destination',
        NOW() - (interval '1 day' * (10 - i)) + interval '4 hours'
      );
    END IF;
    
    IF i > 6 THEN
      INSERT INTO parcel_status_history (
        id, parcel_id, status, notes, created_at
      ) VALUES (
        gen_random_uuid(),
        parcel_id,
        'out_for_delivery',
        'Parcel out for final delivery',
        NOW() - (interval '1 day' * (10 - i)) + interval '6 hours'
      );
    END IF;
    
    IF i > 8 THEN
      INSERT INTO parcel_status_history (
        id, parcel_id, status, notes, created_at
      ) VALUES (
        gen_random_uuid(),
        parcel_id,
        'delivered',
        'Parcel successfully delivered',
        NOW() - (interval '1 day' * (10 - i)) + interval '8 hours'
      );
    END IF;
    
    RAISE NOTICE 'Created parcel with tracking code: %', tracking_number;
  END LOOP;
  
  -- Re-enable constraints
  SET session_replication_role = 'origin';
END $$;

-- Drop the working hours function since it's no longer needed
DROP FUNCTION IF EXISTS generate_working_hours;

-- 7. Create or update the parcels_with_addresses view to include pickup_point and dropoff_point
DROP VIEW IF EXISTS parcels_with_addresses;

CREATE VIEW parcels_with_addresses AS
SELECT
  p.id,
  p.tracking_code,
  p.sender_id,
  p.receiver_id,
  p.pickup_address_id,
  p.dropoff_address_id,
  p.pickup_point_id,
  p.dropoff_point_id,
  p.package_size,
  p.weight,
  p.is_fragile,
  p.status,
  CASE
    WHEN p.status = 'pending' THEN 'Waiting'
    WHEN p.status = 'accepted' THEN 'Accepted'
    WHEN p.status = 'picked_up' THEN 'Picked Up'
    WHEN p.status = 'in_transit' THEN 'In Transit'
    WHEN p.status = 'delivered' THEN 'Delivered'
    WHEN p.status = 'cancelled' THEN 'Cancelled'
    ELSE INITCAP(p.status)
  END AS status_display,
  p.created_at,
  p.updated_at,
  
  -- Pickup address details
  pa.address_line AS pickup_address,
  pa.city AS pickup_city,
  pa.latitude AS pickup_latitude,
  pa.longitude AS pickup_longitude,
  
  -- Pickup point (partner) details
  pp.id AS pickup_partner_id,
  pp.business_name AS pickup_business_name,
  pp.color AS pickup_partner_color,
  pp.business_type AS pickup_partner_type,
  
  -- Dropoff address details
  da.address_line AS dropoff_address,
  da.city AS dropoff_city,
  da.latitude AS dropoff_latitude,
  da.longitude AS dropoff_longitude,
  
  -- Dropoff point (partner) details
  dp.id AS dropoff_partner_id,
  dp.business_name AS dropoff_business_name,
  dp.color AS dropoff_partner_color,
  dp.business_type AS dropoff_partner_type
FROM
  parcels p
LEFT JOIN
  addresses pa ON p.pickup_address_id = pa.id
LEFT JOIN
  addresses da ON p.dropoff_address_id = da.id
LEFT JOIN
  partners pp ON p.pickup_point_id = pp.id
LEFT JOIN
  partners dp ON p.dropoff_point_id = dp.id;

-- Grant appropriate permissions to the view
GRANT SELECT ON parcels_with_addresses TO anon;
GRANT SELECT ON parcels_with_addresses TO authenticated;
GRANT ALL ON parcels_with_addresses TO service_role;

-- 8. Verify data counts
SELECT 'partners' as table_name, COUNT(*) as record_count FROM partners;
SELECT 'addresses' as table_name, COUNT(*) as record_count FROM addresses;
SELECT 'partner_locations view' as view_name, COUNT(*) as record_count FROM partner_locations;
SELECT 'parcels' as table_name, COUNT(*) as record_count FROM parcels;
SELECT 'parcel_status_history' as table_name, COUNT(*) as record_count FROM parcel_status_history;
SELECT 'price_calculations' as table_name, COUNT(*) as record_count FROM price_calculations;
SELECT 'parcels_with_addresses view' as view_name, COUNT(*) as record_count FROM parcels_with_addresses;

-- 9. Verify data distribution
SELECT 'Parcel Package Sizes' as metric;
SELECT package_size, COUNT(*) as count FROM parcels GROUP BY package_size ORDER BY package_size;

SELECT 'Parcel Status Distribution' as metric;
SELECT status, COUNT(*) as count FROM parcels GROUP BY status ORDER BY status;

SELECT 'Parcel Delivery Type Distribution' as metric;
SELECT delivery_type, COUNT(*) as count FROM parcels GROUP BY delivery_type ORDER BY delivery_type;

SELECT 'Parcel Payment Status Distribution' as metric;
SELECT payment_status, COUNT(*) as count FROM parcels GROUP BY payment_status ORDER BY payment_status;

SELECT 'Partner Types' as metric;
SELECT business_type, COUNT(*) as count FROM partners GROUP BY business_type ORDER BY business_type;

SELECT 'City Distribution' as metric;
SELECT city, COUNT(*) as count FROM addresses GROUP BY city ORDER BY city;

SELECT 'Facility Count' as metric;
SELECT is_facility, COUNT(*) as count FROM partners GROUP BY is_facility ORDER BY is_facility;

SELECT 'Customer Usage in Parcels' as metric;
SELECT profiles.id, profiles.full_name, 
  COUNT(CASE WHEN parcels.sender_id = profiles.id THEN 1 END) as sent_parcels,
  COUNT(CASE WHEN parcels.receiver_id = profiles.id THEN 1 END) as received_parcels
FROM profiles
LEFT JOIN parcels ON profiles.id = parcels.sender_id OR profiles.id = parcels.receiver_id
WHERE profiles.role = 'customer'
GROUP BY profiles.id, profiles.full_name
ORDER BY sent_parcels DESC, received_parcels DESC;

SELECT 'Pickup/Dropoff Point Usage' as metric;
SELECT 
  p.id, 
  p.business_name, 
  p.business_type,
  COUNT(CASE WHEN parcels.pickup_point_id = p.id THEN 1 END) as pickup_count,
  COUNT(CASE WHEN parcels.dropoff_point_id = p.id THEN 1 END) as dropoff_count,
  COUNT(CASE WHEN parcels.pickup_point_id = p.id OR parcels.dropoff_point_id = p.id THEN 1 END) as total_usage
FROM partners p
LEFT JOIN parcels ON p.id = parcels.pickup_point_id OR p.id = parcels.dropoff_point_id
GROUP BY p.id, p.business_name, p.business_type
ORDER BY total_usage DESC;

COMMIT; 