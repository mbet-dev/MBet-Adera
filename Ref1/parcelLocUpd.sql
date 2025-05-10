-- 1. First, ensure we have a proper addresses table if it doesn't exist already
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    address_line TEXT NOT NULL,
    city TEXT,
    postal_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add columns to parcels table to reference addresses
ALTER TABLE public.parcels 
    ADD COLUMN IF NOT EXISTS pickup_address_id UUID REFERENCES public.addresses(id),
    ADD COLUMN IF NOT EXISTS dropoff_address_id UUID REFERENCES public.addresses(id);

-- 3. Create default addresses for existing parcels that have NULL addresses
INSERT INTO public.addresses (latitude, longitude, address_line)
SELECT 9.0222, 38.7468, 'Default Pickup Location'
WHERE NOT EXISTS (SELECT 1 FROM public.addresses WHERE address_line = 'Default Pickup Location');

INSERT INTO public.addresses (latitude, longitude, address_line)
SELECT 9.0265, 38.7557, 'Default Dropoff Location'
WHERE NOT EXISTS (SELECT 1 FROM public.addresses WHERE address_line = 'Default Dropoff Location');

-- 4. Get the IDs of the default addresses
DO $$
DECLARE
    default_pickup_id UUID;
    default_dropoff_id UUID;
BEGIN
    SELECT id INTO default_pickup_id FROM public.addresses WHERE address_line = 'Default Pickup Location' LIMIT 1;
    SELECT id INTO default_dropoff_id FROM public.addresses WHERE address_line = 'Default Dropoff Location' LIMIT 1;

    -- 5. Update existing parcels to use default addresses if they're NULL
    UPDATE public.parcels
    SET pickup_address_id = default_pickup_id
    WHERE pickup_address_id IS NULL;
    
    UPDATE public.parcels
    SET dropoff_address_id = default_dropoff_id
    WHERE dropoff_address_id IS NULL;
END $$;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parcels_pickup_address ON public.parcels(pickup_address_id);
CREATE INDEX IF NOT EXISTS idx_parcels_dropoff_address ON public.parcels(dropoff_address_id);

-- 7. Now add NOT NULL constraints to ensure addresses are always required
ALTER TABLE public.parcels
    ALTER COLUMN pickup_address_id SET NOT NULL,
    ALTER COLUMN dropoff_address_id SET NOT NULL;

-- 8. Create a trigger to ensure new parcels always have addresses
CREATE OR REPLACE FUNCTION public.ensure_parcel_addresses()
RETURNS TRIGGER AS $$
DECLARE
    default_pickup_id UUID;
    default_dropoff_id UUID;
BEGIN
    -- If addresses are not provided, use defaults
    IF NEW.pickup_address_id IS NULL THEN
        SELECT id INTO default_pickup_id FROM public.addresses WHERE address_line = 'Default Pickup Location' LIMIT 1;
        NEW.pickup_address_id := default_pickup_id;
    END IF;
    
    IF NEW.dropoff_address_id IS NULL THEN
        SELECT id INTO default_dropoff_id FROM public.addresses WHERE address_line = 'Default Dropoff Location' LIMIT 1;
        NEW.dropoff_address_id := default_dropoff_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS ensure_parcel_addresses_trigger ON public.parcels;
CREATE TRIGGER ensure_parcel_addresses_trigger
BEFORE INSERT OR UPDATE ON public.parcels
FOR EACH ROW
EXECUTE FUNCTION public.ensure_parcel_addresses();

-- 9. Add a view for easier querying of parcel data with address information
CREATE OR REPLACE VIEW public.parcels_with_addresses AS
SELECT 
    p.*,
    pickup.latitude as pickup_latitude,
    pickup.longitude as pickup_longitude,
    pickup.address_line as pickup_address,
    dropoff.latitude as dropoff_latitude,
    dropoff.longitude as dropoff_longitude,
    dropoff.address_line as dropoff_address
FROM 
    public.parcels p
LEFT JOIN 
    public.addresses pickup ON p.pickup_address_id = pickup.id
LEFT JOIN 
    public.addresses dropoff ON p.dropoff_address_id = dropoff.id;

-- 10. Grant appropriate permissions
GRANT ALL ON public.addresses TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.addresses TO authenticated;
GRANT SELECT ON public.parcels_with_addresses TO authenticated;
