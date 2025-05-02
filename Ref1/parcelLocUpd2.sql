-- First, insert some realistic addresses into the addresses table
INSERT INTO public.addresses 
(latitude, longitude, address_line, city)
VALUES 
(9.0297, 38.7625, 'Bole Medhanealem, Near Edna Mall', 'Addis Ababa'),
(9.0104, 38.7612, 'Meskel Square, Main Square', 'Addis Ababa'),
(8.9936, 38.7273, 'Merkato Market, Central Area', 'Addis Ababa'),
(9.0134, 38.7878, 'Megenagna Roundabout, Near Atlas Hotel', 'Addis Ababa');

-- Get the first two parcel IDs to update
DO $$
DECLARE
    parcel_id_1 UUID;
    parcel_id_2 UUID;
    address_id_1 UUID;
    address_id_2 UUID;
    address_id_3 UUID;
    address_id_4 UUID;
BEGIN
    -- Get two parcel IDs
    SELECT id INTO parcel_id_1 FROM public.parcels LIMIT 1;
    SELECT id INTO parcel_id_2 FROM public.parcels WHERE id != parcel_id_1 LIMIT 1;
    
    -- Get the new address IDs
    SELECT id INTO address_id_1 FROM public.addresses WHERE address_line = 'Bole Medhanealem, Near Edna Mall' LIMIT 1;
    SELECT id INTO address_id_2 FROM public.addresses WHERE address_line = 'Meskel Square, Main Square' LIMIT 1;
    SELECT id INTO address_id_3 FROM public.addresses WHERE address_line = 'Merkato Market, Central Area' LIMIT 1;
    SELECT id INTO address_id_4 FROM public.addresses WHERE address_line = 'Megenagna Roundabout, Near Atlas Hotel' LIMIT 1;
    
    -- Update first parcel with Bole pickup and Meskel Square dropoff
    IF parcel_id_1 IS NOT NULL THEN
        UPDATE public.parcels 
        SET 
            pickup_address_id = address_id_1,
            dropoff_address_id = address_id_2
        WHERE id = parcel_id_1;
    END IF;
    
    -- Update second parcel with Merkato pickup and Megenagna dropoff
    IF parcel_id_2 IS NOT NULL THEN
        UPDATE public.parcels 
        SET 
            pickup_address_id = address_id_3,
            dropoff_address_id = address_id_4
        WHERE id = parcel_id_2;
    END IF;
END $$;
