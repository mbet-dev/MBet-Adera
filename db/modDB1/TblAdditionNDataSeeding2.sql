-- 1. Update existing parcels with realistic data using existing profiles and addresses
UPDATE public.parcels
SET 
    sender_id = (SELECT id FROM public.profiles WHERE first_name = 'Customer' AND last_name = 'One'),
    receiver_id = (SELECT id FROM public.profiles WHERE first_name = 'Customer' AND last_name = 'Two'),
    pickup_address_id = (SELECT id FROM public.addresses WHERE address_line LIKE '%Bole Road%'),
    dropoff_address_id = (SELECT id FROM public.addresses WHERE address_line LIKE '%Megenagna%')
WHERE id = '340d0752-0faf-a2c9-ac91-c888a4c458ab';

UPDATE public.parcels
SET 
    sender_id = (SELECT id FROM public.profiles WHERE first_name = 'Customer' AND last_name = 'Three'),
    receiver_id = (SELECT id FROM public.profiles WHERE first_name = 'Customer' AND last_name = 'Four'),
    pickup_address_id = (SELECT id FROM public.addresses WHERE address_line LIKE '%Mexico Square%'),
    dropoff_address_id = (SELECT id FROM public.addresses WHERE address_line LIKE '%Kazanchis%')
WHERE id = '4fe45c58-0f9e-6ba2-e00b-b5f215c141b0';

UPDATE public.parcels
SET 
    sender_id = (SELECT id FROM public.profiles WHERE first_name = 'Customer' AND last_name = 'Five'),
    receiver_id = (SELECT id FROM public.profiles WHERE first_name = 'Customer' AND last_name = 'Six'),
    pickup_address_id = (SELECT id FROM public.addresses WHERE address_line LIKE '%CMC%'),
    dropoff_address_id = (SELECT id FROM public.addresses WHERE address_line LIKE '%Piassa%')
WHERE id = '512b5993-1df8-9df3-dad8-a92129379ec7';

UPDATE public.parcels
SET 
    sender_id = (SELECT id FROM public.profiles WHERE first_name = 'Customer' AND last_name = 'Seven'),
    receiver_id = (SELECT id FROM public.profiles WHERE first_name = 'Customer' AND last_name = 'Eight'),
    pickup_address_id = (SELECT id FROM public.addresses WHERE address_line LIKE '%Gerji%'),
    dropoff_address_id = (SELECT id FROM public.addresses WHERE address_line LIKE '%Merkato%')
WHERE id = '5e5b3721-00b2-008c-8c53-285b0ccec8fc';

UPDATE public.parcels
SET 
    sender_id = (SELECT id FROM public.profiles WHERE first_name = 'Customer' AND last_name = 'Nine'),
    receiver_id = (SELECT id FROM public.profiles WHERE first_name = 'Customer' AND last_name = 'Ten'),
    pickup_address_id = (SELECT id FROM public.addresses WHERE address_line LIKE '%Jemo%'),
    dropoff_address_id = (SELECT id FROM public.addresses WHERE address_line LIKE '%MBet-Adera Sorting Facility%')
WHERE id = 'a4c13aa5-9d3c-043f-6d0b-9a721765c336';

UPDATE public.parcels
SET 
    sender_id = (SELECT id FROM public.profiles WHERE first_name = 'Customer' AND last_name = 'Two'),
    receiver_id = (SELECT id FROM public.profiles WHERE first_name = 'Customer' AND last_name = 'Three'),
    pickup_address_id = (SELECT id FROM public.addresses WHERE address_line LIKE '%Megenagna%'),
    dropoff_address_id = (SELECT id FROM public.addresses WHERE address_line LIKE '%Mexico Square%')
WHERE id = 'dd2dc47a-b6bb-cbf9-e866-74f3a3e19864';

-- 2. Create chat system tables if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_rooms') THEN
        CREATE TABLE public.chat_rooms (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT,
            is_private BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE public.chat_room_participants (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            room_id UUID REFERENCES public.chat_rooms ON DELETE CASCADE,
            user_id UUID REFERENCES auth.users ON DELETE CASCADE,
            role TEXT CHECK (role IN ('customer', 'staff', 'ai')),
            joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE public.chat_messages (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            room_id UUID REFERENCES public.chat_rooms ON DELETE CASCADE,
            sender_id UUID REFERENCES auth.users ON DELETE CASCADE,
            message TEXT NOT NULL,
            is_system BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Enable RLS for chat tables
        ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.chat_room_participants ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

        -- Create policies for chat tables
        CREATE POLICY "Users can view rooms they participate in"
            ON public.chat_rooms FOR SELECT
            USING (EXISTS (
                SELECT 1 FROM public.chat_room_participants
                WHERE room_id = chat_rooms.id AND user_id = auth.uid()
            ));

        CREATE POLICY "Users can view their own room participants"
            ON public.chat_room_participants FOR SELECT
            USING (user_id = auth.uid());

        CREATE POLICY "Users can view messages in their rooms"
            ON public.chat_messages FOR SELECT
            USING (EXISTS (
                SELECT 1 FROM public.chat_room_participants
                WHERE room_id = chat_messages.room_id AND user_id = auth.uid()
            ));
    END IF;
END $$;

-- 3. Add sample notifications using existing users
INSERT INTO public.notifications (user_id, title, message, type) VALUES
-- Parcel updates
((SELECT id FROM public.profiles WHERE first_name = 'Customer' AND last_name = 'One'),
 'Parcel Update',
 'Your parcel #340d0752 has been picked up and is in transit',
 'parcel_update'),
((SELECT id FROM public.profiles WHERE first_name = 'Customer' AND last_name = 'Three'),
 'Parcel Update',
 'Your parcel #4fe45c58 has been delivered successfully',
 'parcel_update'),
-- System notifications
((SELECT id FROM public.profiles WHERE first_name = 'Customer' AND last_name = 'Two'),
 'Welcome to MBet-Adera',
 'Thank you for joining MBet-Adera! We are excited to serve you.',
 'system'),
-- Payment notifications
((SELECT id FROM public.profiles WHERE first_name = 'Customer' AND last_name = 'Five'),
 'Payment Successful',
 'Your payment of 150 ETB has been processed successfully',
 'payment'),
-- Support notifications
((SELECT id FROM public.profiles WHERE first_name = 'Customer' AND last_name = 'Seven'),
 'Support Ticket Update',
 'Your support ticket #12345 has been resolved',
 'support');

-- 4. Add sample chat data using existing users
-- Create a support chat room if it doesn't exist
INSERT INTO public.chat_rooms (name, is_private) VALUES
('Support Center', false);

-- Add participants to support chat using existing staff and customers
INSERT INTO public.chat_room_participants (room_id, user_id, role)
SELECT 
    (SELECT id FROM public.chat_rooms WHERE name = 'Support Center'),
    id,
    CASE 
        WHEN role = 'staff' THEN 'staff'
        ELSE 'customer'
    END
FROM public.profiles
WHERE role IN ('staff', 'customer');

-- Add some sample chat messages using existing users
INSERT INTO public.chat_messages (room_id, sender_id, message, is_system)
VALUES
((SELECT id FROM public.chat_rooms WHERE name = 'Support Center'),
 (SELECT id FROM public.profiles WHERE first_name = 'Staff' AND last_name = 'One'),
 'Welcome to MBet-Adera Support! How can we help you today?',
 true),
((SELECT id FROM public.chat_rooms WHERE name = 'Support Center'),
 (SELECT id FROM public.profiles WHERE first_name = 'Customer' AND last_name = 'One'),
 'Hi, I have a question about my parcel delivery status',
 false),
((SELECT id FROM public.chat_rooms WHERE name = 'Support Center'),
 (SELECT id FROM public.profiles WHERE first_name = 'Staff' AND last_name = 'Two'),
 'I can help you with that. Could you please provide your parcel ID?',
 false);
