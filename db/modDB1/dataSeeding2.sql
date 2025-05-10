-- 4. Add more sample users
-- First, create auth users
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
('00000000-0000-0000-0000-000000000017', 'meklit@example.com', '{"first_name": "Meklit", "last_name": "User", "phone_number": "+251911111119"}'::jsonb),
('00000000-0000-0000-0000-000000000018', 'nahom@example.com', '{"first_name": "Nahom", "last_name": "User", "phone_number": "+251911111120"}'::jsonb),
('00000000-0000-0000-0000-000000000019', 'rahel@example.com', '{"first_name": "Rahel", "last_name": "User", "phone_number": "+251911111121"}'::jsonb),
('00000000-0000-0000-0000-000000000020', 'samuel@example.com', '{"first_name": "Samuel", "last_name": "User", "phone_number": "+251911111122"}'::jsonb),
('00000000-0000-0000-0000-000000000021', 'support1@staff.com', '{"first_name": "Support1", "last_name": "User", "phone_number": "+251911111123"}'::jsonb),
('00000000-0000-0000-0000-000000000022', 'support2@staff.com', '{"first_name": "Support2", "last_name": "User", "phone_number": "+251911111124"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- The trigger will automatically create profiles and wallets for these users

-- 5. Add sample notifications
INSERT INTO public.notifications (user_id, title, message, type) VALUES
-- Parcel updates
((SELECT id FROM public.profiles WHERE first_name = 'Abel'),
 'Parcel Update',
 'Your parcel #340d0752 has been picked up and is in transit',
 'parcel_update'),
((SELECT id FROM public.profiles WHERE first_name = 'Chala'),
 'Parcel Update',
 'Your parcel #4fe45c58 has been delivered successfully',
 'parcel_update'),
-- System notifications
((SELECT id FROM public.profiles WHERE first_name = 'Beza'),
 'Welcome to MBet-Adera',
 'Thank you for joining MBet-Adera! We are excited to serve you.',
 'system'),
-- Payment notifications
((SELECT id FROM public.profiles WHERE first_name = 'Feven'),
 'Payment Successful',
 'Your payment of 150 ETB has been processed successfully',
 'payment'),
-- Support notifications
((SELECT id FROM public.profiles WHERE first_name = 'Habtamu'),
 'Support Ticket Update',
 'Your support ticket #12345 has been resolved',
 'support')
ON CONFLICT DO NOTHING;

-- 6. Add sample chat data
-- Create a support chat room if it doesn't exist
INSERT INTO public.chat_rooms (name, is_private) VALUES
('Support Center', false)
ON CONFLICT (name) DO NOTHING;

-- Add participants to support chat
INSERT INTO public.chat_room_participants (room_id, user_id, role)
SELECT 
    (SELECT id FROM public.chat_rooms WHERE name = 'Support Center'),
    id,
    CASE 
        WHEN role = 'staff' THEN 'staff'
        ELSE 'customer'
    END
FROM public.profiles
WHERE role IN ('staff', 'customer')
ON CONFLICT (room_id, user_id) DO NOTHING;

-- Add some sample chat messages
INSERT INTO public.chat_messages (room_id, sender_id, message, is_system)
VALUES
((SELECT id FROM public.chat_rooms WHERE name = 'Support Center'),
 (SELECT id FROM public.profiles WHERE first_name = 'Support1'),
 'Welcome to MBet-Adera Support! How can we help you today?',
 true),
((SELECT id FROM public.chat_rooms WHERE name = 'Support Center'),
 (SELECT id FROM public.profiles WHERE first_name = 'Abel'),
 'Hi, I have a question about my parcel delivery status',
 false),
((SELECT id FROM public.chat_rooms WHERE name = 'Support Center'),
 (SELECT id FROM public.profiles WHERE first_name = 'Support2'),
 'I can help you with that. Could you please provide your parcel ID?',
 false)
ON CONFLICT DO NOTHING;
