-- SQL Script to update partner locations in MBet-Adera Supabase database
-- This script modifies the existing partners to be more realistic businesses
-- and designates only two as facility centers

-- First, update the existing hubs to be the HQ and Sorting Facility
-- These will be marked as facilities (is_facility = true) and won't be used for pickup/dropoff
UPDATE partners
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

UPDATE partners
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

-- Update address entries to match the facilities
UPDATE addresses
SET
  is_facility = true
WHERE partner_id IN ('55ccb7f7-e5ff-5ac5-d83c-b8ca95af1ed3', '3016a735-59df-f123-9515-1408fde4304e');

-- Update the remaining hubs to be business partners (NOT facilities)
-- These will be shown on the map as pickup/dropoff locations
UPDATE partners
SET 
  business_name = 'Merkato Fashion Gallery',
  business_type = 'Retail - Clothing',
  description = 'Premium clothing store offering local and imported fashion',
  is_facility = false,  -- This is important! Some components filter out locations where is_facility=true
  contact_person = 'Yonas Berhanu',
  phone_number = '+251115570004',
  email = 'merkato.fashion@example.com',
  color = '#f39c12'
WHERE id = '66ea0909-e8d5-be5c-5fd7-66ecd0bb3c7e';

UPDATE partners
SET 
  business_name = 'Piassa Electronics',
  business_type = 'Retail - Electronics',
  description = 'Electronics and gadget shop with latest technology products',
  is_facility = false,  -- This is important! Some components filter out locations where is_facility=true
  contact_person = 'Amanuel Tesfay',
  phone_number = '+251115570003',
  email = 'piassa.electronics@example.com',
  color = '#e74c3c'
WHERE id = 'e5539e8c-04f5-7bfc-5256-09c32494aa90';

-- Update address entries to NOT be facilities for these partners
UPDATE addresses
SET
  is_facility = false
WHERE partner_id IN ('66ea0909-e8d5-be5c-5fd7-66ecd0bb3c7e', 'e5539e8c-04f5-7bfc-5256-09c32494aa90');

-- Create new business partners
-- Prepare entries to insert
INSERT INTO partners (
  id, 
  business_name, 
  business_type, 
  description, 
  phone_number, 
  email, 
  contact_person,
  address_id,
  is_facility,
  color,
  working_hours,
  is_active,
  verification_status,
  created_at,
  updated_at
) VALUES 
-- Restaurant
(
  gen_random_uuid(), 
  'Habesha Cultural Restaurant', 
  'Restaurant', 
  'Traditional Ethiopian cuisine in a cultural setting',
  '+251911234567',
  'info@habesharestaurant.com',
  'Tigist Haile',
  '94c88eb7-7c68-43fa-3998-5254b1c66f77',
  false,  -- Not a facility, will be shown on map
  '#9b59b6',
  '{"friday":{"open":"09:00","close":"22:00"},"monday":{"open":"09:00","close":"22:00"},"sunday":{"open":"11:00","close":"22:00"},"tuesday":{"open":"09:00","close":"22:00"},"saturday":{"open":"09:00","close":"23:00"},"thursday":{"open":"09:00","close":"22:00"},"wednesday":{"open":"09:00","close":"22:00"}}',
  true,
  'verified',
  now(),
  now()
),
-- Coffee Shop
(
  gen_random_uuid(), 
  'Tomoca Coffee Bole', 
  'Coffee Shop', 
  'Famous Ethiopian coffee shop with fresh roasted beans',
  '+251922345678',
  'bole@tomoca.com',
  'Dawit Mengistu',
  'e7a241ea-a8dd-f4aa-c26f-73b4192ba861',
  false,  -- Not a facility, will be shown on map
  '#f1c40f',
  '{"friday":{"open":"07:00","close":"20:00"},"monday":{"open":"07:00","close":"20:00"},"sunday":{"open":"08:00","close":"18:00"},"tuesday":{"open":"07:00","close":"20:00"},"saturday":{"open":"07:00","close":"20:00"},"thursday":{"open":"07:00","close":"20:00"},"wednesday":{"open":"07:00","close":"20:00"}}',
  true,
  'verified',
  now(),
  now()
),
-- Pharmacy
(
  gen_random_uuid(), 
  'Genet Pharmacy', 
  'Pharmacy', 
  'Full-service pharmacy with prescription and OTC medications',
  '+251933456789',
  'info@genetpharmacy.com',
  'Selam Bekele',
  'b17f5467-3b1e-2ce3-b3b7-d94e2faf79ca',
  false,  -- Not a facility, will be shown on map
  '#27ae60',
  '{"friday":{"open":"08:00","close":"21:00"},"monday":{"open":"08:00","close":"21:00"},"sunday":{"open":"09:00","close":"18:00"},"tuesday":{"open":"08:00","close":"21:00"},"saturday":{"open":"08:00","close":"21:00"},"thursday":{"open":"08:00","close":"21:00"},"wednesday":{"open":"08:00","close":"21:00"}}',
  true,
  'verified',
  now(),
  now()
),
-- Beauty Salon
(
  gen_random_uuid(), 
  'Eve Beauty Salon', 
  'Beauty & Cosmetics', 
  'Premium beauty salon offering hair, nail and skin treatments',
  '+251944567890',
  'appointments@evebeauty.com',
  'Helen Desta',
  '187ad227-bcfa-9358-f323-8901c77347d1',
  false,  -- Not a facility, will be shown on map
  '#d35400',
  '{"friday":{"open":"09:00","close":"19:00"},"monday":{"open":"09:00","close":"19:00"},"sunday":{"open":"10:00","close":"17:00"},"tuesday":{"open":"09:00","close":"19:00"},"saturday":{"open":"09:00","close":"20:00"},"thursday":{"open":"09:00","close":"19:00"},"wednesday":{"open":"09:00","close":"19:00"}}',
  true,
  'verified',
  now(),
  now()
),
-- Electronics Store
(
  gen_random_uuid(), 
  'Teshome Electronics', 
  'Retail - Electronics', 
  'Wide range of electronics, computers and accessories',
  '+251955678901',
  'sales@teshome-electronics.com',
  'Teshome Arega',
  '210b2ad8-1696-2ba5-049a-466e0856d388',
  false,  -- Not a facility, will be shown on map
  '#3498db',
  '{"friday":{"open":"08:30","close":"18:30"},"monday":{"open":"08:30","close":"18:30"},"sunday":{"open":"10:00","close":"16:00"},"tuesday":{"open":"08:30","close":"18:30"},"saturday":{"open":"08:30","close":"19:00"},"thursday":{"open":"08:30","close":"18:30"},"wednesday":{"open":"08:30","close":"18:30"}}',
  true,
  'verified',
  now(),
  now()
),
-- Bookstore
(
  gen_random_uuid(), 
  'Addis Book Center', 
  'Retail - Books', 
  'Comprehensive bookstore with local and international titles',
  '+251966789012',
  'info@addisbookcenter.com',
  'Abebe Kebede',
  '4cb7e602-b8e3-cd27-7954-ea1b3629aa81',
  false,  -- Not a facility, will be shown on map
  '#16a085',
  '{"friday":{"open":"09:00","close":"18:00"},"monday":{"open":"09:00","close":"18:00"},"sunday":{"open":"11:00","close":"16:00"},"tuesday":{"open":"09:00","close":"18:00"},"saturday":{"open":"09:00","close":"19:00"},"thursday":{"open":"09:00","close":"18:00"},"wednesday":{"open":"09:00","close":"18:00"}}',
  true,
  'verified',
  now(),
  now()
);

-- Update the partner_locations view to reflect these changes
-- This should happen automatically since it's a view that joins partners and addresses
-- However, we can run a manual refresh if needed:

-- REFRESH MATERIALIZED VIEW IF EXISTS partner_locations;

-- If any other tables need updates to ensure consistency, add those commands here 