-- Drop the existing view first
DROP VIEW IF EXISTS public.parcels_with_addresses;

-- Create an enhanced view including partner information
CREATE OR REPLACE VIEW public.parcels_with_addresses AS
SELECT 
    p.*,
    -- Pickup address details
    pickup.latitude as pickup_latitude,
    pickup.longitude as pickup_longitude,
    pickup.address_line as pickup_address,
    -- Dropoff address details
    dropoff.latitude as dropoff_latitude,
    dropoff.longitude as dropoff_longitude,
    dropoff.address_line as dropoff_address,
    -- Partner details for pickup location
    pickup_partner.business_name as pickup_business_name,
    pickup_partner.working_hours as pickup_working_hours,
    -- Partner details for dropoff location
    dropoff_partner.business_name as dropoff_business_name,
    dropoff_partner.working_hours as dropoff_working_hours
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
