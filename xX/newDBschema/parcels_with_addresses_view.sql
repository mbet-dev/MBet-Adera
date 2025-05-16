-- Create a view that joins parcels with pickup and dropoff addresses
-- This view helps reduce verbose logging and database queries

-- Check if the view already exists
CREATE OR REPLACE VIEW public.parcels_with_addresses AS
SELECT
  p.id,
  p.tracking_code,
  p.sender_id,
  p.pickup_address_id,
  p.dropoff_address_id,
  p.package_size,
  p.weight,
  p.is_fragile,
  p.status,
  CASE
    WHEN p.status = 'pending' THEN 'Waiting'
    WHEN p.status = 'accepted' THEN 'Accepted'
    WHEN p.status = 'picked_up' THEN 'Picked Up'
    WHEN p.status = 'in_transit' THEN 'In Transit'
    WHEN p.status = 'delivered' THEN 'Delivered'
    WHEN p.status = 'cancelled' THEN 'Cancelled'
    ELSE INITCAP(p.status)
  END AS status_display,
  p.created_at,
  p.updated_at,
  
  -- Pickup address details
  pa.address_line AS pickup_address,
  pa.city AS pickup_city,
  pa.latitude AS pickup_latitude,
  pa.longitude AS pickup_longitude,
  pse.business_name AS pickup_business_name,
  pse.color AS pickup_partner_color,
  
  -- Dropoff address details
  da.address_line AS dropoff_address,
  da.city AS dropoff_city,
  da.latitude AS dropoff_latitude,
  da.longitude AS dropoff_longitude,
  NULL AS dropoff_business_name,
  NULL AS dropoff_partner_color
FROM
  public.parcels p
LEFT JOIN
  public.addresses pa ON p.pickup_address_id = pa.id
LEFT JOIN
  public.addresses da ON p.dropoff_address_id = da.id
LEFT JOIN
  -- Join to get pickup location partner info through sender
  public.partners pse ON p.sender_id = pse.id;

-- Grant appropriate permissions
ALTER VIEW public.parcels_with_addresses OWNER TO postgres;
GRANT SELECT ON public.parcels_with_addresses TO anon;
GRANT SELECT ON public.parcels_with_addresses TO authenticated;
GRANT ALL ON public.parcels_with_addresses TO service_role; 
