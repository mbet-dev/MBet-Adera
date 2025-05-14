-- MBet-Adera Enhanced Seed Data Script - Part 3
-- This script adds more payment and pricing test scenarios with realistic sample data

-- Start transaction
BEGIN;

-- =====================================================
-- 8. ADDITIONAL PAYMENTS
-- =====================================================
INSERT INTO payments (
  id, parcel_id, amount, payment_method, payment_status, transaction_id, 
  gateway_id, gateway_transaction_id, currency
)
VALUES
  -- Payment for cancelled parcel (refunded)
  (
    'b5b5b5b5-c5c5-d5d5-e5e5-f5f5a5a5b5b5', 
    'e5f6e5f6-a5a5-b5b5-c5c5-d5d5e5e5f5f5', 
    90.00, 
    'chapa', 
    'refunded', 
    'TXN-005',
    (SELECT id FROM payment_gateways WHERE provider = 'Chapa' LIMIT 1),
    'CP-TXN-56789',
    'ETB'
  ),
  -- Payment for failed delivery (pending refund)
  (
    'b6b6b6b6-c6c6-d6d6-e6e6-f6f6a6a6b6b6', 
    'f6f6f6f6-b6b6-c6c6-d6d6-e6e6f6f6a6a6', 
    135.25, 
    'telebirr', 
    'pending_refund', 
    'TXN-006',
    (SELECT id FROM payment_gateways WHERE provider = 'TeleBirr' LIMIT 1),
    'TB-TXN-67890',
    'ETB'
  ),
  -- Payment for returned parcel (partial refund)
  (
    'b7b7b7b7-c7c7-d7d7-e7e7-f7f7a7a7b7b7', 
    'a7a7a7a7-b7b7-c7c7-d7d7-e7e7f7f7a7a7', 
    195.50, 
    'yenepay', 
    'partially_refunded', 
    'TXN-007',
    (SELECT id FROM payment_gateways WHERE provider = 'YenePay' LIMIT 1),
    'YP-TXN-23456',
    'ETB'
  ),
  -- Payment for on_hold parcel (on hold)
  (
    'b8b8b8b8-c8c8-d8d8-e8e8-f8f8a8a8b8b8', 
    'a8a8a8a8-b8b8-c8c8-d8d8-e8e8f8f8a8a8', 
    75.80, 
    'cash', 
    'on_hold', 
    'TXN-008',
    (SELECT id FROM payment_gateways WHERE provider = 'cash' LIMIT 1),
    NULL,
    'ETB'
  ),
  -- Payment for international shipment (completed)
  (
    'b9b9b9b9-c9c9-d9d9-e9e9-f9f9a9a9b9b9', 
    'a9a9a9a9-b9b9-c9c9-d9d9-e9e9f9f9a9a9', 
    450.00, 
    'chapa', 
    'completed', 
    'TXN-009',
    (SELECT id FROM payment_gateways WHERE provider = 'Chapa' LIMIT 1),
    'CP-TXN-34567',
    'ETB'
  ),
  -- Payment for rush delivery (completed)
  (
    'c0c0c0c0-d0d0-e0e0-f0f0-a0a0b0b0c0c0', 
    'b0b0b0b0-c0c0-d0d0-e0e0-f0f0a0a0b0b0', 
    175.25, 
    'telebirr', 
    'completed', 
    'TXN-010',
    (SELECT id FROM payment_gateways WHERE provider = 'TeleBirr' LIMIT 1),
    'TB-TXN-45678',
    'ETB'
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- 9. ADDITIONAL PRICE CALCULATIONS
-- =====================================================
INSERT INTO price_calculations (
  id, parcel_id, base_price, distance_fee, weight_fee, 
  subtotal, tax_amount, tax_rate, total_price
)
VALUES
  -- Price calc for cancelled parcel
  (
    'c5c5c5c5-d5d5-e5e5-f5f5-a5a5b5b5c5c5', 
    'e5f6e5f6-a5a5-b5b5-c5c5-d5d5e5e5f5f5', 
    50.00, 
    25.00, 
    3.60, 
    78.60, 
    11.40, 
    15.00, 
    90.00
  ),
  -- Price calc for failed delivery parcel
  (
    'c6c6c6c6-d6d6-e6e6-f6f6-a6a6b6b6c6c6', 
    'f6f6f6f6-b6b6-c6c6-d6d6-e6e6f6f6a6a6', 
    70.00, 
    40.00, 
    8.60, 
    118.60, 
    16.65, 
    15.00, 
    135.25
  ),
  -- Price calc for returned parcel
  (
    'c7c7c7c7-d7d7-e7e7-f7f7-a7a7b7b7c7c7', 
    'a7a7a7a7-b7b7-c7c7-d7d7-e7e7f7f7a7a7', 
    50.00, 
    80.00, 
    13.00, 
    143.00, 
    52.50, 
    15.00, 
    195.50
  ),
  -- Price calc for on hold parcel
  (
    'c8c8c8c8-d8d8-e8e8-f8f8-a8a8b8b8c8c8', 
    'a8a8a8a8-b8b8-c8c8-d8d8-e8e8f8f8a8a8', 
    50.00, 
    15.00, 
    3.00, 
    68.00, 
    7.80, 
    15.00, 
    75.80
  ),
  -- Price calc for international shipment
  (
    'c9c9c9c9-d9d9-e9e9-f9f9-a9a9b9b9c9c9', 
    'a9a9a9a9-b9b9-c9c9-d9d9-e9e9f9f9a9a9', 
    150.00, 
    180.00, 
    60.00, 
    390.00, 
    60.00, 
    15.00, 
    450.00
  ),
  -- Price calc for rush delivery
  (
    'd0d0d0d0-e0e0-f0f0-a0a0-b0b0c0c0d0d0', 
    'b0b0b0b0-c0c0-d0d0-e0e0-f0f0a0a0b0b0', 
    100.00, 
    40.00, 
    12.00, 
    152.00, 
    23.25, 
    15.00, 
    175.25
  )
ON CONFLICT DO NOTHING;

-- Update parcels to reference price_calculation_id
UPDATE parcels 
SET price_calculation_id = 'c5c5c5c5-d5d5-e5e5-f5f5-a5a5b5b5c5c5' 
WHERE id = 'e5f6e5f6-a5a5-b5b5-c5c5-d5d5e5e5f5f5';

UPDATE parcels 
SET price_calculation_id = 'c6c6c6c6-d6d6-e6e6-f6f6-a6a6b6b6c6c6' 
WHERE id = 'f6f6f6f6-b6b6-c6c6-d6d6-e6e6f6f6a6a6';

UPDATE parcels 
SET price_calculation_id = 'c7c7c7c7-d7d7-e7e7-f7f7-a7a7b7b7c7c7' 
WHERE id = 'a7a7a7a7-b7b7-c7c7-d7d7-e7e7f7f7a7a7';

UPDATE parcels 
SET price_calculation_id = 'c8c8c8c8-d8d8-e8e8-f8f8-a8a8b8b8c8c8' 
WHERE id = 'a8a8a8a8-b8b8-c8c8-d8d8-e8e8f8f8a8a8';

UPDATE parcels 
SET price_calculation_id = 'c9c9c9c9-d9d9-e9e9-f9f9-a9a9b9b9c9c9' 
WHERE id = 'a9a9a9a9-b9b9-c9c9-d9d9-e9e9f9f9a9a9';

UPDATE parcels 
SET price_calculation_id = 'd0d0d0d0-e0e0-f0f0-a0a0-b0b0c0c0d0d0' 
WHERE id = 'b0b0b0b0-c0c0-d0d0-e0e0-f0f0a0a0b0b0';

-- =====================================================
-- 10. ADDITIONAL FAVORITE LOCATIONS AND CONTACTS
-- =====================================================
-- Skipping favorite_locations due to constraint issues

INSERT INTO favorite_contacts (user_id, name, phone_number, email)
VALUES
  ('aaaaaaaa-0000-1111-2222-333333333333', 'Kidist Demeke', '+251922334455', 'kidist@example.com'),
  ('aaaaaaaa-0000-1111-2222-333333333333', 'Abebe Kebede', '+251911234567', 'abebe@example.com'),
  ('bbbbbbbb-0000-1111-2222-333333333333', 'Teshome Bekele', '+251933445566', 'teshome@example.com'),
  ('cccccccc-0000-1111-2222-333333333333', 'Selam Haile', '+251922345678', 'selam@example.com')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 11. TEST DELIVERY NOTES, RATINGS, AND FEEDBACK
-- =====================================================
-- Creating a new table for delivery notes if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'delivery_notes') THEN
        CREATE TABLE delivery_notes (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            parcel_id UUID NOT NULL REFERENCES parcels(id),
            note_type VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            created_by UUID REFERENCES profiles(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            is_internal BOOLEAN DEFAULT false
        );
    END IF;
END
$$;

-- Creating a new table for delivery ratings if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'delivery_ratings') THEN
        CREATE TABLE delivery_ratings (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            parcel_id UUID NOT NULL REFERENCES parcels(id),
            user_id UUID NOT NULL REFERENCES profiles(id),
            rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
            feedback TEXT,
            rating_category VARCHAR(50) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END
$$;

-- Insert sample delivery notes
INSERT INTO delivery_notes (parcel_id, note_type, content, created_by, is_internal)
VALUES
  ('e5f6e5f6-a5a5-b5b5-c5c5-d5d5e5e5f5f5', 'delivery', 'Package delivered to front desk receptionist', '88888888-0000-1111-2222-333333333333', false),
  ('f6f6f6f6-b6b6-c6c6-d6d6-e6e6f6f6a6a6', 'issue', 'Customer requested specific delivery time', '99999999-0000-1111-2222-333333333333', true),
  ('f6f6f6f6-b6b6-c6c6-d6d6-e6e6f6f6a6a6', 'attempt', 'Recipient not available, left delivery notice', 'dddddddd-0000-1111-2222-333333333333', false),
  ('a7a7a7a7-b7b7-c7c7-d7d7-e7e7f7f7a7a7', 'return', 'Package returning to sender after 3 failed attempts', 'eeeeeeee-0000-1111-2222-333333333333', false),
  ('a8a8a8a8-b8b8-c8c8-d8d8-e8e8f8f8a8a8', 'hold', 'Documentation incomplete, waiting for customer', '99999999-0000-1111-2222-333333333333', true)
ON CONFLICT DO NOTHING;

-- Insert sample delivery ratings
INSERT INTO delivery_ratings (parcel_id, user_id, rating, feedback, rating_category)
VALUES
  ('e5f6e5f6-a5a5-b5b5-c5c5-d5d5e5e5f5f5', 'aaaaaaaa-0000-1111-2222-333333333333', 5, 'Excellent service, package arrived safely', 'overall'),
  ('e5f6e5f6-a5a5-b5b5-c5c5-d5d5e5e5f5f5', 'aaaaaaaa-0000-1111-2222-333333333333', 4, 'Driver was very professional', 'driver'),
  ('e5f6e5f6-a5a5-b5b5-c5c5-d5d5e5e5f5f5', 'aaaaaaaa-0000-1111-2222-333333333333', 5, 'Packaging was perfect', 'packaging'),
  ('f6f6f6f6-b6b6-c6c6-d6d6-e6e6f6f6a6a6', 'bbbbbbbb-0000-1111-2222-333333333333', 3, 'Service was okay but took longer than expected', 'overall'),
  ('a7a7a7a7-b7b7-c7c7-d7d7-e7e7f7f7a7a7', 'aaaaaaaa-0000-1111-2222-333333333333', 2, 'Package returned without enough delivery attempts', 'overall')
ON CONFLICT DO NOTHING;

-- Commit transaction
COMMIT;

-- End of enhanced seed data - part 3 