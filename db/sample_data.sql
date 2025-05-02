-- Sample data for addresses (11 locations in Addis Ababa)
INSERT INTO public.addresses (address_line, street_address, city, latitude, longitude, is_facility) VALUES
-- MBet-Adera Facility Center
('MBet-Adera Sorting Facility', 'Bole Road', 'Addis Ababa', 8.9962, 38.7896, true),
-- Other locations
('Bole Medhanealem', 'Bole Road', 'Addis Ababa', 8.9962, 38.7896, false),
('Megenagna', 'Megenagna Square', 'Addis Ababa', 9.0123, 38.7654, false),
('Mexico', 'Mexico Square', 'Addis Ababa', 9.0234, 38.7543, false),
('Piazza', 'Piazza', 'Addis Ababa', 9.0345, 38.7432, false),
('Saris', 'Saris', 'Addis Ababa', 9.0456, 38.7321, false),
('Kazanchis', 'Kazanchis', 'Addis Ababa', 9.0567, 38.7210, false),
('CMC', 'CMC', 'Addis Ababa', 9.0678, 38.7099, false),
('Gotera', 'Gotera', 'Addis Ababa', 9.0789, 38.6988, false),
('Lideta', 'Lideta', 'Addis Ababa', 9.0890, 38.6877, false),
('Kality', 'Kality', 'Addis Ababa', 9.0901, 38.6766, false);

-- Sample data for profiles
INSERT INTO public.profiles (user_id, first_name, last_name, role, phone_number) VALUES
-- Admin
('00000000-0000-0000-0000-000000000001', 'Admin', 'User', 'admin', '+251911111111'),
-- Staff
('00000000-0000-0000-0000-000000000002', 'Staff1', 'User', 'staff', '+251922222222'),
('00000000-0000-0000-0000-000000000003', 'Staff2', 'User', 'staff', '+251933333333'),
-- Couriers
('00000000-0000-0000-0000-000000000004', 'Courier1', 'User', 'courier', '+251944444444'),
('00000000-0000-0000-0000-000000000005', 'Courier2', 'User', 'courier', '+251955555555'),
('00000000-0000-0000-0000-000000000006', 'Courier3', 'User', 'courier', '+251966666666'),
-- Customers (Senders/Receivers)
('00000000-0000-0000-0000-000000000007', 'Abel', 'User', 'customer', '+251977777777'),
('00000000-0000-0000-0000-000000000008', 'Beza', 'User', 'customer', '+251988888888'),
('00000000-0000-0000-0000-000000000009', 'Chala', 'User', 'customer', '+251999999999'),
('00000000-0000-0000-0000-000000000010', 'Daniel', 'User', 'customer', '+251911111112'),
('00000000-0000-0000-0000-000000000011', 'Feven', 'User', 'customer', '+251911111113'),
('00000000-0000-0000-0000-000000000012', 'Genet', 'User', 'customer', '+251911111114'),
('00000000-0000-0000-0000-000000000013', 'Habtamu', 'User', 'customer', '+251911111115'),
('00000000-0000-0000-0000-000000000014', 'Kidus', 'User', 'customer', '+251911111116'),
('00000000-0000-0000-0000-000000000015', 'Lemlem', 'User', 'customer', '+251911111117'),
('00000000-0000-0000-0000-000000000016', 'Zelalem', 'User', 'customer', '+251911111118');

-- Sample data for wallets
INSERT INTO public.wallets (user_id, profile_id, balance) 
SELECT user_id, id, 1000.00 FROM public.profiles;

-- Sample data for partners
INSERT INTO public.partners (business_name, phone_number, address_id, color) VALUES
('MBet-Adera Facility', '+251911111111', (SELECT id FROM public.addresses WHERE is_facility = true), '#FF0000'),
('Partner1', '+251922222222', (SELECT id FROM public.addresses WHERE address_line = 'Bole Medhanealem'), '#4CAF50'),
('Partner2', '+251933333333', (SELECT id FROM public.addresses WHERE address_line = 'Megenagna'), '#2196F3'),
('Partner3', '+251944444444', (SELECT id FROM public.addresses WHERE address_line = 'Mexico'), '#FFC107');

-- Sample data for parcels with various statuses
INSERT INTO public.parcels (sender_id, receiver_id, pickup_address_id, dropoff_address_id, status) VALUES
-- Pending parcels
((SELECT id FROM public.profiles WHERE first_name = 'Abel'),
 (SELECT id FROM public.profiles WHERE first_name = 'Beza'),
 (SELECT id FROM public.addresses WHERE address_line = 'Bole Medhanealem'),
 (SELECT id FROM public.addresses WHERE address_line = 'Megenagna'),
 'pending'),
((SELECT id FROM public.profiles WHERE first_name = 'Chala'),
 (SELECT id FROM public.profiles WHERE first_name = 'Daniel'),
 (SELECT id FROM public.addresses WHERE address_line = 'Mexico'),
 (SELECT id FROM public.addresses WHERE address_line = 'Piazza'),
 'pending'),
-- In transit parcels
((SELECT id FROM public.profiles WHERE first_name = 'Feven'),
 (SELECT id FROM public.profiles WHERE first_name = 'Genet'),
 (SELECT id FROM public.addresses WHERE address_line = 'Saris'),
 (SELECT id FROM public.addresses WHERE address_line = 'Kazanchis'),
 'in_transit'),
((SELECT id FROM public.profiles WHERE first_name = 'Habtamu'),
 (SELECT id FROM public.profiles WHERE first_name = 'Kidus'),
 (SELECT id FROM public.addresses WHERE address_line = 'CMC'),
 (SELECT id FROM public.addresses WHERE address_line = 'Gotera'),
 'in_transit'),
-- Delivered parcels
((SELECT id FROM public.profiles WHERE first_name = 'Lemlem'),
 (SELECT id FROM public.profiles WHERE first_name = 'Zelalem'),
 (SELECT id FROM public.addresses WHERE address_line = 'Lideta'),
 (SELECT id FROM public.addresses WHERE address_line = 'Kality'),
 'delivered'),
((SELECT id FROM public.profiles WHERE first_name = 'Beza'),
 (SELECT id FROM public.profiles WHERE first_name = 'Chala'),
 (SELECT id FROM public.addresses WHERE address_line = 'Bole Medhanealem'),
 (SELECT id FROM public.addresses WHERE address_line = 'Mexico'),
 'delivered'); 