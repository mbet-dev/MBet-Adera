-- Step 1: Add NOT NULL constraints to essential fields in parcels table and set defaults
BEGIN;

-- First, update any existing records with sample values to avoid constraint violations
UPDATE public.parcels 
SET 
    package_description = COALESCE(package_description, 'Standard package') 
WHERE package_description IS NULL;

UPDATE public.parcels 
SET 
    package_size = COALESCE(package_size, 'medium') 
WHERE package_size IS NULL;

UPDATE public.parcels 
SET 
    pickup_contact = COALESCE(pickup_contact, '+251911000000') 
WHERE pickup_contact IS NULL;

UPDATE public.parcels 
SET 
    dropoff_contact = COALESCE(dropoff_contact, '+251922000000') 
WHERE dropoff_contact IS NULL;

UPDATE public.parcels 
SET 
    is_fragile = COALESCE(is_fragile, false) 
WHERE is_fragile IS NULL;

-- Add the constraints
ALTER TABLE public.parcels 
    ALTER COLUMN package_description SET NOT NULL,
    ALTER COLUMN package_size SET NOT NULL,
    ALTER COLUMN pickup_contact SET NOT NULL,
    ALTER COLUMN dropoff_contact SET NOT NULL,
    ALTER COLUMN pickup_address_id SET NOT NULL,
    ALTER COLUMN dropoff_address_id SET NOT NULL,
    ALTER COLUMN is_fragile SET NOT NULL;

-- Step 2: Add additional useful fields from our form
ALTER TABLE public.parcels 
    ADD COLUMN IF NOT EXISTS estimated_price DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS distance DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' NOT NULL,
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing records with sample values for the new columns
UPDATE public.parcels 
SET 
    estimated_price = 
        CASE 
            WHEN package_size = 'document' THEN 80 + (RANDOM() * 20)
            WHEN package_size = 'small' THEN 120 + (RANDOM() * 30)
            WHEN package_size = 'medium' THEN 180 + (RANDOM() * 40)
            WHEN package_size = 'large' THEN 250 + (RANDOM() * 50)
            ELSE 150
        END,
    distance = 5 + (RANDOM() * 15),
    notes = 'Sample delivery note';

-- Step 3: Enhance the parcels_with_addresses view
DROP VIEW IF EXISTS public.parcels_with_addresses;

CREATE OR REPLACE VIEW public.parcels_with_addresses AS
SELECT 
    p.*,
    -- Pickup address details
    pickup.latitude as pickup_latitude,
    pickup.longitude as pickup_longitude,
    pickup.address_line as pickup_address,
    pickup.city as pickup_city,
    
    -- Dropoff address details
    dropoff.latitude as dropoff_latitude,
    dropoff.longitude as dropoff_longitude,
    dropoff.address_line as dropoff_address,
    dropoff.city as dropoff_city,
    
    -- Partner details for pickup location
    pickup_partner.business_name as pickup_business_name,
    pickup_partner.working_hours as pickup_working_hours,
    pickup_partner.phone_number as pickup_partner_phone,
    pickup_partner.email as pickup_partner_email,
    pickup_partner.color as pickup_partner_color,
    
    -- Partner details for dropoff location
    dropoff_partner.business_name as dropoff_business_name,
    dropoff_partner.working_hours as dropoff_working_hours,
    dropoff_partner.phone_number as dropoff_partner_phone,
    dropoff_partner.email as dropoff_partner_email,
    dropoff_partner.color as dropoff_partner_color,
    
    -- Calculated delivery information
    CASE 
        WHEN p.status = 'picked_up' THEN 'In progress'
        WHEN p.status = 'in_transit' THEN 'On the way'
        WHEN p.status = 'delivered' THEN 'Completed'
        WHEN p.status = 'pending' THEN 'Awaiting pickup'
        WHEN p.status = 'cancelled' THEN 'Cancelled'
        ELSE p.status
    END as status_display,
    
    -- Price and distance formatting
    ROUND(p.estimated_price, 2) as formatted_price,
    ROUND(p.distance, 1) as formatted_distance,
    
    -- Display tags
    CASE
        WHEN p.is_fragile = true THEN 'Fragile'
        ELSE NULL
    END as fragile_tag
FROM 
    public.parcels p
LEFT JOIN 
    public.addresses pickup ON p.pickup_address_id = pickup.id
LEFT JOIN 
    public.addresses dropoff ON p.dropoff_address_id = dropoff.id
LEFT JOIN 
    public.partners pickup_partner ON pickup.partner_id = pickup_partner.id
LEFT JOIN 
    public.partners dropoff_partner ON dropoff.partner_id = dropoff_partner.id;

-- Grant appropriate permissions
GRANT SELECT ON public.parcels_with_addresses TO authenticated;

COMMIT;