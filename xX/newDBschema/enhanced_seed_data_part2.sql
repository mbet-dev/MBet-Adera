-- MBet-Adera Enhanced Seed Data Script - Part 2
-- This script adds more parcel test scenarios with realistic sample data

-- Start transaction
BEGIN;

-- =====================================================
-- 5. ADDITIONAL PARCELS 
-- =====================================================
INSERT INTO parcels (
  id, sender_id, receiver_id, pickup_address_id, dropoff_address_id, 
  tracking_code, status, delivery_type, package_size, weight, 
  dimensions, estimated_delivery_time, actual_delivery_time,
  pickup_contact, pickup_phone, dropoff_contact, dropoff_phone, 
  created_at, handle_with_care, is_fragile, delivery_instructions
)
VALUES
  -- Cancelled parcel
  (
    'e5f6e5f6-a5a5-b5b5-c5c5-d5d5e5e5f5f5', 
    'aaaaaaaa-0000-1111-2222-333333333333', -- sender: Bereket
    'bbbbbbbb-0000-1111-2222-333333333333', -- receiver: Kidist
    'a1a1a1a1-1a1a-1a1a-1a1a-1a1a1a1a1a1a', -- pickup: Sarbet
    'a2a2a2a2-2a2a-2a2a-2a2a-2a2a2a2a2a2a', -- dropoff: Gerji
    'MB-TRK-005', 
    'cancelled', 
    'standard', 
    'small', 
    1.8, 
    '{"length": 20, "width": 15, "height": 10}', 
    NOW() - interval '5 hours', 
    NULL,
    'Bereket Girma', 
    '+251911223344', 
    'Kidist Demeke', 
    '+251922334455', 
    NOW() - interval '8 hours',
    false,
    false,
    'Cancelled due to incorrect address'
  ),
  
  -- Attempted delivery but failed
  (
    'f6f6f6f6-b6b6-c6c6-d6d6-e6e6f6f6a6a6', 
    'bbbbbbbb-0000-1111-2222-333333333333', -- sender: Kidist
    'cccccccc-0000-1111-2222-333333333333', -- receiver: Teshome
    'a2a2a2a2-2a2a-2a2a-2a2a-2a2a2a2a2a2a', -- pickup: Gerji
    'a3a3a3a3-3a3a-3a3a-3a3a-3a3a3a3a3a3a', -- dropoff: CMC
    'MB-TRK-006', 
    'failed_delivery', 
    'express', 
    'medium', 
    4.3, 
    '{"length": 35, "width": 25, "height": 20}', 
    NOW() - interval '1 day', 
    NULL,
    'Kidist Demeke', 
    '+251922334455', 
    'Teshome Bekele', 
    '+251933445566', 
    NOW() - interval '2 days',
    false,
    false,
    'Recipient not available, will try again tomorrow'
  ),
  
  -- Returned to sender
  (
    'a7a7a7a7-b7b7-c7c7-d7d7-e7e7f7f7a7a7', 
    'cccccccc-0000-1111-2222-333333333333', -- sender: Teshome
    'aaaaaaaa-0000-1111-2222-333333333333', -- receiver: Bereket
    'a3a3a3a3-3a3a-3a3a-3a3a-3a3a3a3a3a3a', -- pickup: CMC
    'a1a1a1a1-1a1a-1a1a-1a1a-1a1a1a1a1a1a', -- dropoff: Sarbet
    'MB-TRK-007', 
    'returned_to_sender', 
    'standard', 
    'large', 
    6.5, 
    '{"length": 45, "width": 30, "height": 25}', 
    NOW() - interval '4 days', 
    NULL,
    'Teshome Bekele', 
    '+251933445566', 
    'Bereket Girma', 
    '+251911223344', 
    NOW() - interval '6 days',
    true,
    false,
    'Returned after 3 failed delivery attempts'
  ),
  
  -- On hold parcel
  (
    'a8a8a8a8-b8b8-c8c8-d8d8-e8e8f8f8a8a8', 
    'aaaaaaaa-0000-1111-2222-333333333333', -- sender: Bereket
    'cccccccc-0000-1111-2222-333333333333', -- receiver: Teshome
    'a1a1a1a1-1a1a-1a1a-1a1a-1a1a1a1a1a1a', -- pickup: Sarbet
    'a3a3a3a3-3a3a-3a3a-3a3a-3a3a3a3a3a3a', -- dropoff: CMC
    'MB-TRK-008', 
    'on_hold', 
    'standard', 
    'small', 
    1.5, 
    '{"length": 15, "width": 12, "height": 10}', 
    NOW() + interval '1 day', 
    NULL,
    'Bereket Girma', 
    '+251911223344', 
    'Teshome Bekele', 
    '+251933445566', 
    NOW() - interval '1 day',
    false,
    true,
    'Custom clearance pending, held at warehouse'
  ),
  
  -- International shipment
  (
    'a9a9a9a9-b9b9-c9c9-d9d9-e9e9f9f9a9a9', 
    'aaaaaaaa-0000-1111-2222-333333333333', -- sender: Bereket (using existing user)
    'bbbbbbbb-0000-1111-2222-333333333333', -- receiver: Kidist
    'a4a4a4a4-4a4a-4a4a-4a4a-4a4a4a4a4a4a', -- pickup: Kirkos Area (valid address)
    'a2a2a2a2-2a2a-2a2a-2a2a-2a2a2a2a2a2a', -- dropoff: Gerji
    'MB-TRK-009', 
    'in_transit', 
    'express', 
    'medium', 
    3.8, 
    '{"length": 30, "width": 25, "height": 20}', 
    NOW() + interval '5 days', 
    NULL,
    'Bereket Girma', -- updated to match new sender
    '+251911223344', -- updated to match new sender
    'Kidist Demeke', 
    '+251922334455', 
    NOW() - interval '1 day',
    true,
    true,
    'International shipment with customs documentation'
  ),
  
  -- Same-day rush delivery
  (
    'b0b0b0b0-c0c0-d0d0-e0e0-f0f0a0a0b0b0', 
    'bbbbbbbb-0000-1111-2222-333333333333', -- sender: Kidist
    'cccccccc-0000-1111-2222-333333333333', -- receiver: Teshome (using existing user)
    'a2a2a2a2-2a2a-2a2a-2a2a-2a2a2a2a2a2a', -- pickup: Gerji
    'a5a5a5a5-5a5a-5a5a-5a5a-5a5a5a5a5a5a', -- dropoff: Ayat Area (valid address)
    'MB-TRK-010', 
    'processing', 
    'express', 
    'small', 
    0.8, 
    '{"length": 12, "width": 8, "height": 5}', 
    NOW() + interval '4 hours', 
    NULL,
    'Kidist Demeke', 
    '+251922334455', 
    'Teshome Bekele', -- updated to match new receiver
    '+251933445566', -- updated to match new receiver
    NOW() - interval '1 hour',
    true,
    false,
    'Rush delivery - critical medical supplies'
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. ADDITIONAL PARCEL STATUS HISTORY
-- =====================================================
INSERT INTO parcel_status_history (parcel_id, status, location, address_text, notes, performed_by)
VALUES
  -- History for cancelled parcel
  (
    'e5f6e5f6-a5a5-b5b5-c5c5-d5d5e5e5f5f5', 
    'created', 
    '{"latitude": 8.9930, "longitude": 38.7600}', 
    'Sarbet Area, Addis Ababa', 
    'Parcel registered in system', 
    'aaaaaaaa-0000-1111-2222-333333333333'
  ),
  (
    'e5f6e5f6-a5a5-b5b5-c5c5-d5d5e5e5f5f5', 
    'processing', 
    '{"latitude": 8.9865, "longitude": 38.7912}', 
    'MBet-Adera Hub Bole', 
    'Parcel received at hub for processing', 
    '88888888-0000-1111-2222-333333333333'
  ),
  (
    'e5f6e5f6-a5a5-b5b5-c5c5-d5d5e5e5f5f5', 
    'cancelled', 
    '{"latitude": 8.9865, "longitude": 38.7912}', 
    'MBet-Adera Hub Bole', 
    'Parcel cancelled by customer request', 
    '88888888-0000-1111-2222-333333333333'
  ),
  
  -- History for failed delivery parcel
  (
    'f6f6f6f6-b6b6-c6c6-d6d6-e6e6f6f6a6a6', 
    'created', 
    '{"latitude": 8.9982, "longitude": 38.8036}', 
    'Gerji Area, Addis Ababa', 
    'Parcel registered in system', 
    'bbbbbbbb-0000-1111-2222-333333333333'
  ),
  (
    'f6f6f6f6-b6b6-c6c6-d6d6-e6e6f6f6a6a6', 
    'processing', 
    '{"latitude": 9.0233, "longitude": 38.8079}', 
    'MBet-Adera Hub Megenagna', 
    'Parcel received at hub for processing', 
    '99999999-0000-1111-2222-333333333333'
  ),
  (
    'f6f6f6f6-b6b6-c6c6-d6d6-e6e6f6f6a6a6', 
    'in_transit', 
    '{"latitude": 9.0233, "longitude": 38.8079}', 
    'MBet-Adera Hub Megenagna', 
    'Parcel dispatched for delivery', 
    'dddddddd-0000-1111-2222-333333333333'
  ),
  (
    'f6f6f6f6-b6b6-c6c6-d6d6-e6e6f6f6a6a6', 
    'failed_delivery', 
    '{"latitude": 9.0257, "longitude": 38.8359}', 
    'CMC Area, Addis Ababa', 
    'Delivery attempted but recipient not available', 
    'dddddddd-0000-1111-2222-333333333333'
  ),
  
  -- History for returned_to_sender parcel
  (
    'a7a7a7a7-b7b7-c7c7-d7d7-e7e7f7f7a7a7', 
    'created', 
    '{"latitude": 9.0257, "longitude": 38.8359}', 
    'CMC Area, Addis Ababa', 
    'Parcel registered in system', 
    'cccccccc-0000-1111-2222-333333333333'
  ),
  (
    'a7a7a7a7-b7b7-c7c7-d7d7-e7e7f7f7a7a7', 
    'processing', 
    '{"latitude": 9.0233, "longitude": 38.8079}', 
    'MBet-Adera Hub Megenagna', 
    'Parcel received at hub for processing', 
    '88888888-0000-1111-2222-333333333333'
  ),
  (
    'a7a7a7a7-b7b7-c7c7-d7d7-e7e7f7f7a7a7', 
    'in_transit', 
    '{"latitude": 9.0233, "longitude": 38.8079}', 
    'MBet-Adera Hub Megenagna', 
    'Parcel dispatched for delivery', 
    'eeeeeeee-0000-1111-2222-333333333333'
  ),
  (
    'a7a7a7a7-b7b7-c7c7-d7d7-e7e7f7f7a7a7', 
    'failed_delivery', 
    '{"latitude": 8.9930, "longitude": 38.7600}', 
    'Sarbet Area, Addis Ababa', 
    'Delivery attempted but recipient not available', 
    'eeeeeeee-0000-1111-2222-333333333333'
  ),
  (
    'a7a7a7a7-b7b7-c7c7-d7d7-e7e7f7f7a7a7', 
    'returned_to_sender', 
    '{"latitude": 9.0257, "longitude": 38.8359}', 
    'CMC Area, Addis Ababa', 
    'Parcel returned to sender after multiple delivery attempts', 
    'eeeeeeee-0000-1111-2222-333333333333'
  ),
  
  -- History for on_hold parcel
  (
    'a8a8a8a8-b8b8-c8c8-d8d8-e8e8f8f8a8a8', 
    'created', 
    '{"latitude": 8.9930, "longitude": 38.7600}', 
    'Sarbet Area, Addis Ababa', 
    'Parcel registered in system', 
    'aaaaaaaa-0000-1111-2222-333333333333'
  ),
  (
    'a8a8a8a8-b8b8-c8c8-d8d8-e8e8f8f8a8a8', 
    'processing', 
    '{"latitude": 8.9865, "longitude": 38.7912}', 
    'MBet-Adera Hub Bole', 
    'Parcel received at hub for processing', 
    '99999999-0000-1111-2222-333333333333'
  ),
  (
    'a8a8a8a8-b8b8-c8c8-d8d8-e8e8f8f8a8a8', 
    'on_hold', 
    '{"latitude": 8.9865, "longitude": 38.7912}', 
    'MBet-Adera Hub Bole', 
    'Parcel held due to missing documentation', 
    '99999999-0000-1111-2222-333333333333'
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. ADDITIONAL PARCEL ASSIGNMENTS
-- =====================================================
INSERT INTO parcel_assignments (
  parcel_id, personnel_id, status, assigned_at, accepted_at, completed_at, assigned_by, priority
)
VALUES
  -- Attempted but failed delivery
  (
    'f6f6f6f6-b6b6-c6c6-d6d6-e6e6f6f6a6a6', 
    '33334444-5555-6666-7777-888899990000', 
    'failed', 
    NOW() - interval '36 hours', 
    NOW() - interval '35 hours', 
    NOW() - interval '30 hours', 
    '88888888-0000-1111-2222-333333333333', 
    2
  ),
  -- Returned to sender assignment
  (
    'a7a7a7a7-b7b7-c7c7-d7d7-e7e7f7f7a7a7', 
    '44445555-6666-7777-8888-999900001111', 
    'returned', 
    NOW() - interval '5 days', 
    NOW() - interval '5 days' + interval '1 hour', 
    NOW() - interval '4 days', 
    '99999999-0000-1111-2222-333333333333', 
    1
  ),
  -- Pending new driver assignment
  (
    'a9a9a9a9-b9b9-c9c9-d9d9-e9e9f9f9a9a9', 
    '55556666-7777-8888-9999-000011112222', 
    'pending', 
    NOW() - interval '2 hours', 
    NULL, 
    NULL, 
    '88888888-0000-1111-2222-333333333333', 
    3
  )
ON CONFLICT DO NOTHING;

-- Commit transaction
COMMIT;

-- End of enhanced seed data - part 2 