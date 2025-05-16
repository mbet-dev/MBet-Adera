-- SQL Script to update partner locations in MBet-Adera Supabase database
-- This script works directly with the partner_locations table

-- PART 1: Update existing partner locations to be HQ and Sorting Facility

-- Update the existing hubs to be the HQ and Sorting Facility
UPDATE partner_locations
SET 
  business_name = 'MBet-Adera Headquarters',
  business_type = 'Headquarters',
  description = 'Main headquarters for MBet-Adera operations',
  is_facility = true,
  contact_person = 'Henok Tesfaye',
  phone_number = '+251115570001',
  email = 'info@mbet-adera.com',
  color = '#3498db'
WHERE id = '55ccb7f7-e5ff-5ac5-d83c-b8ca95af1ed3';

UPDATE partner_locations
SET 
  business_name = 'MBet-Adera Sorting Facility',
  business_type = 'Sorting Facility',
  description = 'Central sorting facility for all parcels',
  is_facility = true,
  contact_person = 'Sara Abebe',
  phone_number = '+251115570002',
  email = 'sorting@mbet-adera.com',
  color = '#2ecc71'
WHERE id = '3016a735-59df-f123-9515-1408fde4304e';

-- Update the remaining hubs to be business partners (NOT facilities)
UPDATE partner_locations
SET 
  business_name = 'Merkato Fashion Gallery',
  business_type = 'Retail - Clothing',
  description = 'Premium clothing store offering local and imported fashion',
  is_facility = false,
  contact_person = 'Yonas Berhanu',
  phone_number = '+251115570004',
  email = 'merkato.fashion@example.com',
  color = '#f39c12'
WHERE id = '66ea0909-e8d5-be5c-5fd7-66ecd0bb3c7e';

UPDATE partner_locations
SET 
  business_name = 'Piassa Electronics',
  business_type = 'Retail - Electronics',
  description = 'Electronics and gadget shop with latest technology products',
  is_facility = false,
  contact_person = 'Amanuel Tesfay',
  phone_number = '+251115570003',
  email = 'piassa.electronics@example.com',
  color = '#e74c3c'
WHERE id = 'e5539e8c-04f5-7bfc-5256-09c32494aa90';

-- PART 2: Add new partner locations

-- Add 6 new partner locations to the partner_locations table
INSERT INTO partner_locations (
  id,
  business_name,
  contact_person,
  phone_number,
  email,
  business_type,
  description,
  working_hours,
  color,
  is_facility,
  is_active,
  verification_status,
  rating,
  address_line,
  street_address,
  city,
  state,
  postal_code,
  country,
  latitude,
  longitude,
  address_verified
) VALUES 
-- Restaurant
(
  gen_random_uuid(),
  'Habesha Cultural Restaurant',
  'Tigist Haile',
  '+251911234567',
  'info@habesharestaurant.com',
  'Restaurant',
  'Traditional Ethiopian cuisine in a cultural setting',
  '{
    "monday": {"open": "09:00", "close": "22:00"},
    "tuesday": {"open": "09:00", "close": "22:00"},
    "wednesday": {"open": "09:00", "close": "22:00"},
    "thursday": {"open": "09:00", "close": "22:00"},
    "friday": {"open": "09:00", "close": "22:00"},
    "saturday": {"open": "09:00", "close": "23:00"},
    "sunday": {"open": "11:00", "close": "22:00"}
  }',
  '#9b59b6',
  false,
  true,
  'verified',
  4.8,
  'CMC, Silver Spring Apartments Area, Main Street',
  'CMC Road',
  'Addis Ababa',
  'Addis Ababa',
  '1000',
  'Ethiopia',
  9.03740,
  38.76490,
  true
),
-- Coffee Shop
(
  gen_random_uuid(),
  'Tomoca Coffee Bole',
  'Dawit Mengistu',
  '+251922345678',
  'bole@tomoca.com',
  'Coffee Shop',
  'Famous Ethiopian coffee shop with fresh roasted beans',
  '{
    "monday": {"open": "07:00", "close": "20:00"},
    "tuesday": {"open": "07:00", "close": "20:00"},
    "wednesday": {"open": "07:00", "close": "20:00"},
    "thursday": {"open": "07:00", "close": "20:00"},
    "friday": {"open": "07:00", "close": "20:00"},
    "saturday": {"open": "07:00", "close": "20:00"},
    "sunday": {"open": "08:00", "close": "18:00"}
  }',
  '#f1c40f',
  false,
  true,
  'verified',
  4.9,
  'Bole Dembel Mall, 1st Floor, Shop B12',
  'Ethio-China St',
  'Addis Ababa',
  'Addis Ababa',
  '1000',
  'Ethiopia',
  9.00920,
  38.78950,
  true
),
-- Pharmacy
(
  gen_random_uuid(),
  'Genet Pharmacy',
  'Selam Bekele',
  '+251933456789',
  'info@genetpharmacy.com',
  'Pharmacy',
  'Full-service pharmacy with prescription and OTC medications',
  '{
    "monday": {"open": "08:00", "close": "21:00"},
    "tuesday": {"open": "08:00", "close": "21:00"},
    "wednesday": {"open": "08:00", "close": "21:00"},
    "thursday": {"open": "08:00", "close": "21:00"},
    "friday": {"open": "08:00", "close": "21:00"},
    "saturday": {"open": "08:00", "close": "21:00"},
    "sunday": {"open": "09:00", "close": "18:00"}
  }',
  '#27ae60',
  false,
  true,
  'verified',
  4.6,
  'Gerji Condominium Area, Building C23, Ground Floor',
  'Gerji Road',
  'Addis Ababa',
  'Addis Ababa',
  '1000',
  'Ethiopia',
  9.01490,
  38.83040,
  true
),
-- Beauty Salon
(
  gen_random_uuid(),
  'Eve Beauty Salon',
  'Helen Desta',
  '+251944567890',
  'appointments@evebeauty.com',
  'Beauty & Cosmetics',
  'Premium beauty salon offering hair, nail and skin treatments',
  '{
    "monday": {"open": "09:00", "close": "19:00"},
    "tuesday": {"open": "09:00", "close": "19:00"},
    "wednesday": {"open": "09:00", "close": "19:00"},
    "thursday": {"open": "09:00", "close": "19:00"},
    "friday": {"open": "09:00", "close": "19:00"},
    "saturday": {"open": "09:00", "close": "20:00"},
    "sunday": {"open": "10:00", "close": "17:00"}
  }',
  '#d35400',
  false,
  true,
  'verified',
  4.7,
  'Kazanchis Mall, 4th Floor, Unit 405',
  'Ras Mekonen St',
  'Addis Ababa',
  'Addis Ababa',
  '1000',
  'Ethiopia',
  9.01810,
  38.76020,
  true
),
-- Electronics Store
(
  gen_random_uuid(),
  'Teshome Electronics',
  'Teshome Arega',
  '+251955678901',
  'sales@teshome-electronics.com',
  'Retail - Electronics',
  'Wide range of electronics, computers and accessories',
  '{
    "monday": {"open": "08:30", "close": "18:30"},
    "tuesday": {"open": "08:30", "close": "18:30"},
    "wednesday": {"open": "08:30", "close": "18:30"},
    "thursday": {"open": "08:30", "close": "18:30"},
    "friday": {"open": "08:30", "close": "18:30"},
    "saturday": {"open": "08:30", "close": "19:00"},
    "sunday": {"open": "10:00", "close": "16:00"}
  }',
  '#3498db',
  false,
  true,
  'verified',
  4.5,
  'Merkato, Dubai Tera Shopping Center, Shop 217',
  'Dubai Tera Road',
  'Addis Ababa',
  'Addis Ababa',
  '1000',
  'Ethiopia',
  9.03380,
  38.74470,
  true
),
-- Bookstore
(
  gen_random_uuid(),
  'Addis Book Center',
  'Abebe Kebede',
  '+251966789012',
  'info@addisbookcenter.com',
  'Retail - Books',
  'Comprehensive bookstore with local and international titles',
  '{
    "monday": {"open": "09:00", "close": "18:00"},
    "tuesday": {"open": "09:00", "close": "18:00"},
    "wednesday": {"open": "09:00", "close": "18:00"},
    "thursday": {"open": "09:00", "close": "18:00"},
    "friday": {"open": "09:00", "close": "18:00"},
    "saturday": {"open": "09:00", "close": "19:00"},
    "sunday": {"open": "11:00", "close": "16:00"}
  }',
  '#16a085',
  false,
  true,
  'verified',
  4.4,
  'Sarbet, Behind Dembel City Center, Building A3',
  'Sarbet Road',
  'Addis Ababa',
  'Addis Ababa',
  '1000',
  'Ethiopia',
  8.99620,
  38.76860,
  true
),
-- Supermarket
(
  gen_random_uuid(),
  'Shoa Supermarket',
  'Kidist Alemayehu',
  '+251977890123',
  'info@shoasupermarket.com',
  'Retail - Supermarket',
  'Large supermarket with wide range of groceries and household items',
  '{
    "monday": {"open": "08:00", "close": "20:00"},
    "tuesday": {"open": "08:00", "close": "20:00"},
    "wednesday": {"open": "08:00", "close": "20:00"},
    "thursday": {"open": "08:00", "close": "20:00"},
    "friday": {"open": "08:00", "close": "20:00"},
    "saturday": {"open": "08:00", "close": "21:00"},
    "sunday": {"open": "09:00", "close": "19:00"}
  }',
  '#e67e22',
  false,
  true,
  'verified',
  4.6,
  'Bole Road, Near Bole Medhanialem Church',
  'Bole Road',
  'Addis Ababa',
  'Addis Ababa',
  '1000',
  'Ethiopia',
  9.01450,
  38.78000,
  true
),
-- Clothing Store
(
  gen_random_uuid(),
  'Sabegn Ethiopian Fashion',
  'Meron Haile',
  '+251988901234',
  'contact@sabegnfashion.com',
  'Retail - Fashion',
  'Modern Ethiopian fashion and traditional clothing store',
  '{
    "monday": {"open": "09:00", "close": "19:00"},
    "tuesday": {"open": "09:00", "close": "19:00"},
    "wednesday": {"open": "09:00", "close": "19:00"},
    "thursday": {"open": "09:00", "close": "19:00"},
    "friday": {"open": "09:00", "close": "19:00"},
    "saturday": {"open": "09:00", "close": "20:00"},
    "sunday": {"open": "10:00", "close": "17:00"}
  }',
  '#9b59b6',
  false,
  true,
  'verified',
  4.7,
  'Mexico Area, Sunshine Building, 2nd Floor',
  'Mexico Square',
  'Addis Ababa',
  'Addis Ababa',
  '1000',
  'Ethiopia',
  9.01470,
  38.76330,
  true
);

-- PART 3: Regarding redundant tables

/* 
IMPORTANT NOTE: Based on analysis, we CANNOT safely drop the 'partners' and 'addresses' tables 
because there are foreign key dependencies.

The 'parcels' table directly references 'addresses' via 'pickup_address_id' and 'dropoff_address_id'.
Dropping these tables would break existing functionality.

Instead, we recommend:
1. Keep the tables but focus on using partner_locations for new development
2. Consider a database migration in the future to consolidate these tables
3. Update application code to use partner_locations instead of partners/addresses where possible

Here's a sample query to help identify dependencies:

SELECT
  tc.table_schema, 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND (ccu.table_name = 'partners' OR ccu.table_name = 'addresses');
*/ 