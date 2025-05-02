-- Begin transaction
BEGIN;

-- Add package information columns if they don't exist
ALTER TABLE public.parcels 
ADD COLUMN IF NOT EXISTS package_description TEXT,
ADD COLUMN IF NOT EXISTS package_size TEXT,
ADD COLUMN IF NOT EXISTS is_fragile BOOLEAN DEFAULT FALSE;

-- Update MBET789012 with package information (Piassa to Kality)
UPDATE public.parcels
SET 
    package_description = 'Electronics - Laptop and accessories',
    package_size = 'medium',
    is_fragile = TRUE,
    estimated_price = 150.00, -- Add price based on package type and distance
    formatted_price = 'ETB 150.00' -- Format for display
WHERE tracking_code = 'MBET789012';

-- Update MBET123456 with package information (Lideta to CMC)
UPDATE public.parcels
SET 
    package_description = 'Books and stationery supplies',
    package_size = 'small',
    is_fragile = FALSE,
    estimated_price = 85.50, -- Add price based on package type and distance
    formatted_price = 'ETB 85.50' -- Format for display
WHERE tracking_code = 'MBET123456';

-- Add NOT NULL constraints to package information columns
ALTER TABLE public.parcels
ALTER COLUMN package_description SET NOT NULL,
ALTER COLUMN package_size SET NOT NULL,
ALTER COLUMN is_fragile SET NOT NULL;

-- Update the view to include new package information
DROP VIEW IF EXISTS public.parcels_with_addresses;
CREATE VIEW public.parcels_with_addresses AS
SELECT 
    p.*,
    -- Pickup address information
    pickup_addr.address_line AS pickup_address,
    pickup_addr.latitude AS pickup_lat,
    pickup_addr.longitude AS pickup_lng,
    -- Dropoff address information
    dropoff_addr.address_line AS dropoff_address,
    dropoff_addr.latitude AS dropoff_lat,
    dropoff_addr.longitude AS dropoff_lng,
    -- Partner information for pickup (if available)
    pickup_partner.business_name AS pickup_business_name,
    pickup_partner.working_hours AS pickup_working_hours,
    -- Partner information for dropoff (if available)
    dropoff_partner.business_name AS dropoff_business_name,
    dropoff_partner.working_hours AS dropoff_working_hours,
    -- Status display helper
    CASE 
        WHEN p.status = 'pending' THEN 'Pending'
        WHEN p.status = 'in_transit' THEN 'In Transit'
        WHEN p.status = 'delivered' THEN 'Delivered'
        WHEN p.status = 'returned' THEN 'Returned'
        WHEN p.status = 'cancelled' THEN 'Cancelled'
        ELSE 'Unknown'
    END AS status_display,
    -- Package tag for display
    CASE 
        WHEN p.is_fragile THEN 'Fragile' 
        ELSE NULL 
    END AS package_tag
FROM 
    public.parcels p
LEFT JOIN 
    public.addresses pickup_addr ON p.pickup_address_id = pickup_addr.id
LEFT JOIN 
    public.addresses dropoff_addr ON p.dropoff_address_id = dropoff_addr.id
LEFT JOIN 
    public.partners pickup_partner ON pickup_addr.partner_id = pickup_partner.id
LEFT JOIN 
    public.partners dropoff_partner ON dropoff_addr.partner_id = dropoff_partner.id;

-- Ensure permissions on the new view
GRANT SELECT ON public.parcels_with_addresses TO authenticated, service_role;

-- Commit the transaction
COMMIT;
