-- Begin transaction
BEGIN;

-- Add the missing location columns if they don't exist
ALTER TABLE public.parcels 
ADD COLUMN IF NOT EXISTS pickup_latitude NUMERIC,
ADD COLUMN IF NOT EXISTS pickup_longitude NUMERIC,
ADD COLUMN IF NOT EXISTS dropoff_latitude NUMERIC,
ADD COLUMN IF NOT EXISTS dropoff_longitude NUMERIC,
ADD COLUMN IF NOT EXISTS distance NUMERIC,
ADD COLUMN IF NOT EXISTS formatted_distance TEXT;

-- Set default values for all existing records
-- (using a placeholder default value that will be overwritten for our samples)
UPDATE public.parcels
SET 
    pickup_latitude = 9.0222,   -- Default location (Addis Ababa city center)
    pickup_longitude = 38.7468,
    dropoff_latitude = 9.0222,
    dropoff_longitude = 38.7468
WHERE 
    pickup_latitude IS NULL OR 
    pickup_longitude IS NULL OR 
    dropoff_latitude IS NULL OR 
    dropoff_longitude IS NULL;

-- Update MBET789012: Piassa to Kality
UPDATE public.parcels
SET 
    pickup_latitude = 9.0349,
    pickup_longitude = 38.7504,
    pickup_address_id = (
        SELECT id FROM public.addresses
        WHERE address_line LIKE '%Piassa%'
        LIMIT 1
    ),
    dropoff_latitude = 8.9494,
    dropoff_longitude = 38.7910,
    dropoff_address_id = (
        SELECT id FROM public.addresses
        WHERE address_line LIKE '%Kality%'
        LIMIT 1
    )
WHERE tracking_code = 'MBET789012';

-- If no matching addresses exist, create them
DO $$
BEGIN
    -- Create Piassa address if not exists
    IF NOT EXISTS (SELECT 1 FROM public.addresses WHERE address_line LIKE '%Piassa%') THEN
        INSERT INTO public.addresses (address_line, latitude, longitude)
        VALUES ('Piassa, Addis Ababa', 9.0349, 38.7504);
    END IF;
    
    -- Create Kality address if not exists
    IF NOT EXISTS (SELECT 1 FROM public.addresses WHERE address_line LIKE '%Kality%') THEN
        INSERT INTO public.addresses (address_line, latitude, longitude)
        VALUES ('Kality, Addis Ababa', 8.9494, 38.7910);
    END IF;
    
    -- Link newly created addresses if needed
    UPDATE public.parcels
    SET 
        pickup_address_id = (SELECT id FROM public.addresses WHERE address_line LIKE '%Piassa%' LIMIT 1)
    WHERE tracking_code = 'MBET789012' AND pickup_address_id IS NULL;
    
    UPDATE public.parcels
    SET 
        dropoff_address_id = (SELECT id FROM public.addresses WHERE address_line LIKE '%Kality%' LIMIT 1)
    WHERE tracking_code = 'MBET789012' AND dropoff_address_id IS NULL;
END $$;

-- Update MBET123456: Lideta to CMC
UPDATE public.parcels
SET 
    pickup_latitude = 9.0138,
    pickup_longitude = 38.7384,
    pickup_address_id = (
        SELECT id FROM public.addresses
        WHERE address_line LIKE '%Lideta%'
        LIMIT 1
    ),
    dropoff_latitude = 9.0530,
    dropoff_longitude = 38.7635,
    dropoff_address_id = (
        SELECT id FROM public.addresses
        WHERE address_line LIKE '%CMC%'
        LIMIT 1
    )
WHERE tracking_code = 'MBET123456';

-- If no matching addresses exist, create them
DO $$
BEGIN
    -- Create Lideta address if not exists
    IF NOT EXISTS (SELECT 1 FROM public.addresses WHERE address_line LIKE '%Lideta%') THEN
        INSERT INTO public.addresses (address_line, latitude, longitude)
        VALUES ('Lideta, Addis Ababa', 9.0138, 38.7384);
    END IF;
    
    -- Create CMC address if not exists
    IF NOT EXISTS (SELECT 1 FROM public.addresses WHERE address_line LIKE '%CMC%') THEN
        INSERT INTO public.addresses (address_line, latitude, longitude)
        VALUES ('CMC, Addis Ababa', 9.0530, 38.7635);
    END IF;
    
    -- Link newly created addresses if needed
    UPDATE public.parcels
    SET 
        pickup_address_id = (SELECT id FROM public.addresses WHERE address_line LIKE '%Lideta%' LIMIT 1)
    WHERE tracking_code = 'MBET123456' AND pickup_address_id IS NULL;
    
    UPDATE public.parcels
    SET 
        dropoff_address_id = (SELECT id FROM public.addresses WHERE address_line LIKE '%CMC%' LIMIT 1)
    WHERE tracking_code = 'MBET123456' AND dropoff_address_id IS NULL;
END $$;

-- Update distances based on coordinates
UPDATE public.parcels
SET 
    distance = (
        6371 * acos(
            cos(radians(pickup_latitude)) * cos(radians(dropoff_latitude)) * 
            cos(radians(dropoff_longitude) - radians(pickup_longitude)) + 
            sin(radians(pickup_latitude)) * sin(radians(dropoff_latitude))
        )
    ),
    formatted_distance = ROUND(
        6371 * acos(
            cos(radians(pickup_latitude)) * cos(radians(dropoff_latitude)) * 
            cos(radians(dropoff_longitude) - radians(pickup_longitude)) + 
            sin(radians(pickup_latitude)) * sin(radians(dropoff_latitude))
        )::numeric, 1
    )::text || ' km'
WHERE tracking_code IN ('MBET789012', 'MBET123456');

-- Now add NOT NULL constraints after all data is populated
ALTER TABLE public.parcels
ALTER COLUMN pickup_latitude SET NOT NULL,
ALTER COLUMN pickup_longitude SET NOT NULL,
ALTER COLUMN dropoff_latitude SET NOT NULL,
ALTER COLUMN dropoff_longitude SET NOT NULL,
ALTER COLUMN distance SET NOT NULL,
ALTER COLUMN formatted_distance SET NOT NULL;

-- Commit the transaction
COMMIT;
