-- Complete parcel schema update script - fixed
BEGIN;

-- 1. Create a new ENUM type for parcel status with all checkpoint values
-- First check if the type already exists, and if it does, drop it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parcel_status') THEN
    DROP TYPE parcel_status CASCADE;
  END IF;
END
$$;

CREATE TYPE parcel_status AS ENUM (
  'order_created',
  'pending_pickup',
  'confirmed',
  'picked_up',
  'in_transit',
  'pending_delivery',
  'delivered',
  'cancelled'
);

-- 2. First drop the dependent view to avoid conflicts
DROP VIEW IF EXISTS public.parcels_with_addresses;

-- 3. Add all missing columns to the parcels table
ALTER TABLE public.parcels
  ADD COLUMN IF NOT EXISTS estimated_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS distance DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS is_fragile BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- 4. Populate the columns with reasonable values for existing records
UPDATE public.parcels 
SET 
    -- Set a reasonable default price between 100-250 ETB
    estimated_price = COALESCE(estimated_price, 100 + (RANDOM() * 150)),
    -- Set a reasonable default distance between 3-20 km
    distance = COALESCE(distance, 3 + (RANDOM() * 17)),
    -- Most packages aren't fragile by default
    is_fragile = COALESCE(is_fragile, FALSE),
    payment_status = COALESCE(payment_status, 'pending');

-- 5. Add a temporary status column with the new type
ALTER TABLE public.parcels
  ADD COLUMN new_status parcel_status;

-- 6. Fetch column info to find the existing status column name
DO $$
DECLARE
    status_column_name TEXT;
BEGIN
    -- Check if there's a column that looks like a status column (common names)
    SELECT column_name INTO status_column_name 
    FROM information_schema.columns 
    WHERE table_name = 'parcels' 
    AND table_schema = 'public'
    AND column_name IN ('status', 'parcel_status', 'delivery_status', 'state', 'parcel_state')
    LIMIT 1;
    
    -- If we found a status column, migrate the data
    IF status_column_name IS NOT NULL THEN
        EXECUTE format('
            UPDATE public.parcels SET
              new_status = CASE
                WHEN %I = ''pending'' THEN ''pending_pickup''::parcel_status
                WHEN %I = ''pickup'' THEN ''pending_pickup''::parcel_status
                WHEN %I = ''confirmed'' THEN ''confirmed''::parcel_status
                WHEN %I = ''picked_up'' THEN ''picked_up''::parcel_status
                WHEN %I = ''in_transit'' THEN ''in_transit''::parcel_status
                WHEN %I = ''out_for_delivery'' THEN ''pending_delivery''::parcel_status
                WHEN %I = ''delivered'' THEN ''delivered''::parcel_status
                WHEN %I = ''cancelled'' THEN ''cancelled''::parcel_status
                ELSE ''order_created''::parcel_status
              END', 
              status_column_name, status_column_name, status_column_name, 
              status_column_name, status_column_name, status_column_name, 
              status_column_name, status_column_name);
              
        -- Drop the old status column
        EXECUTE format('ALTER TABLE public.parcels DROP COLUMN %I', status_column_name);
    ELSE
        -- If no status column was found, set default status
        UPDATE public.parcels SET new_status = 'order_created'::parcel_status;
    END IF;
END
$$;

-- 7. Rename the new status column to 'status'
ALTER TABLE public.parcels
  RENAME COLUMN new_status TO status;

-- 8. Make sure the status column is not null with a default value
ALTER TABLE public.parcels
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'order_created'::parcel_status;

-- 9. Update the parcels_with_addresses view to match the new status names
CREATE OR REPLACE VIEW public.parcels_with_addresses AS
SELECT 
  -- Explicitly select all parcel columns
  p.id,
  p.created_at,
  p.updated_at,
  p.pickup_address_id,
  p.dropoff_address_id,
  p.tracking_code,
  p.status,
  p.estimated_price,
  p.distance,
  p.is_fragile,
  p.payment_status,
  
  -- Additional columns from addresses with distinct names
  pickup.address_line as pickup_address_line,
  pickup.city as pickup_city,
  pickup.latitude as pickup_address_latitude,
  pickup.longitude as pickup_address_longitude,
  
  dropoff.address_line as dropoff_address_line,
  dropoff.city as dropoff_city,
  dropoff.latitude as dropoff_address_latitude,
  dropoff.longitude as dropoff_address_longitude,
  
  -- Partner details
  pickup_partner.business_name as pickup_business_name,
  pickup_partner.working_hours as pickup_working_hours,
  pickup_partner.phone_number as pickup_partner_phone,
  pickup_partner.color as pickup_partner_color,
  
  dropoff_partner.business_name as dropoff_business_name,
  dropoff_partner.working_hours as dropoff_working_hours,
  dropoff_partner.phone_number as dropoff_partner_phone,
  dropoff_partner.color as dropoff_partner_color,
  
  -- Calculated fields
  CASE 
    WHEN p.status = 'order_created' THEN 'Order Created'
    WHEN p.status = 'pending_pickup' THEN 'Pending Pickup at Pickup Partner'
    WHEN p.status = 'confirmed' THEN 'Confirmed by Courier / PickedUp'
    WHEN p.status = 'picked_up' THEN 'Picked Up'
    WHEN p.status = 'in_transit' THEN 'In Transit (at MBet-Adera''s Sorting Facility Store)'
    WHEN p.status = 'pending_delivery' THEN 'Pending Delivery at Dropoff Partner'
    WHEN p.status = 'delivered' THEN 'Delivered'
    WHEN p.status = 'cancelled' THEN 'Cancelled'
    ELSE p.status::text
  END as status_display,
  
  ROUND(p.estimated_price, 2) as formatted_price,
  ROUND(p.distance, 1) as formatted_distance,
  
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

-- 10. Create a new table to track parcel status history/timeline
DROP TABLE IF EXISTS public.parcel_status_history CASCADE;
CREATE TABLE IF NOT EXISTS public.parcel_status_history (
    id SERIAL PRIMARY KEY,
    parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
    status_text TEXT NOT NULL, -- Store as text initially
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    created_by UUID REFERENCES auth.users(id)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_parcel_status_history_parcel_id 
ON public.parcel_status_history(parcel_id);

-- Add RLS policies for the new table
ALTER TABLE public.parcel_status_history ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT ON public.parcel_status_history TO authenticated;
GRANT SELECT ON public.parcels_with_addresses TO authenticated;

-- 11. Retroactively populate status history for existing parcels
INSERT INTO public.parcel_status_history (parcel_id, status_text, notes, created_at)
SELECT 
  id, 
  status::text, 
  'Initial status record created during migration', 
  updated_at
FROM public.parcels;

-- 12. Add a trigger to automatically record status changes
CREATE OR REPLACE FUNCTION public.record_parcel_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only insert if status has changed
    IF OLD.status IS NULL OR OLD.status <> NEW.status THEN
        INSERT INTO public.parcel_status_history (
            parcel_id, 
            status_text,
            notes,
            created_by
        ) VALUES (
            NEW.id,
            NEW.status::text,
            'Status updated to ' || NEW.status::text,
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on parcels table
DROP TRIGGER IF EXISTS on_parcel_status_change ON public.parcels;
CREATE TRIGGER on_parcel_status_change
AFTER UPDATE OF status ON public.parcels
FOR EACH ROW
EXECUTE FUNCTION public.record_parcel_status_change();

-- 13. Backup existing status values
CREATE TABLE IF NOT EXISTS temp_parcel_status_backup AS 
SELECT id, status::text as status_text 
FROM public.parcels;

-- 14. Drop the view that depends on the status type
DROP VIEW IF EXISTS public.parcels_with_addresses;

-- 15. Drop existing enum type (cascade will remove it from the table)
DROP TYPE IF EXISTS parcel_status CASCADE;

-- 16. Create new enum type with all statuses
CREATE TYPE parcel_status AS ENUM (
  'order_created',
  'pending_pickup',
  'confirmed',
  'picked_up',
  'in_transit',
  'pending_delivery',
  'delivered',
  'cancelled'
);

-- 17. Add the status column back with the new type
ALTER TABLE public.parcels
  ADD COLUMN status parcel_status NOT NULL DEFAULT 'order_created';

-- 18. Migrate the old status values
UPDATE public.parcels p
SET status = CASE
    WHEN b.status_text = 'pending' THEN 'pending_pickup'
    WHEN b.status_text = 'pickup' THEN 'pending_pickup'
    WHEN b.status_text = 'confirmed' THEN 'confirmed'
    WHEN b.status_text = 'picked_up' THEN 'picked_up'
    WHEN b.status_text = 'in_transit' THEN 'in_transit'
    WHEN b.status_text = 'out_for_delivery' THEN 'pending_delivery'
    WHEN b.status_text = 'delivered' THEN 'delivered'
    WHEN b.status_text = 'cancelled' THEN 'cancelled'
    ELSE 'order_created'
END::parcel_status
FROM temp_parcel_status_backup b
WHERE p.id = b.id;

-- 19. Drop the temporary backup table
DROP TABLE temp_parcel_status_backup;

-- 20. Recreate the view
CREATE OR REPLACE VIEW public.parcels_with_addresses AS
SELECT 
  -- Explicitly select all parcel columns
  p.id,
  p.created_at,
  p.updated_at,
  p.pickup_address_id,
  p.dropoff_address_id,
  p.tracking_code,
  p.status,
  p.estimated_price,
  p.distance,
  p.is_fragile,
  p.payment_status,
  
  -- Additional columns from addresses with distinct names
  pickup.address_line as pickup_address_line,
  pickup.city as pickup_city,
  pickup.latitude as pickup_address_latitude,
  pickup.longitude as pickup_address_longitude,
  
  dropoff.address_line as dropoff_address_line,
  dropoff.city as dropoff_city,
  dropoff.latitude as dropoff_address_latitude,
  dropoff.longitude as dropoff_address_longitude,
  
  -- Partner details
  pickup_partner.business_name as pickup_business_name,
  pickup_partner.working_hours as pickup_working_hours,
  pickup_partner.phone_number as pickup_partner_phone,
  pickup_partner.color as pickup_partner_color,
  
  dropoff_partner.business_name as dropoff_business_name,
  dropoff_partner.working_hours as dropoff_working_hours,
  dropoff_partner.phone_number as dropoff_partner_phone,
  dropoff_partner.color as dropoff_partner_color,
  
  -- Calculated fields
  CASE 
    WHEN p.status = 'order_created' THEN 'Order Created'
    WHEN p.status = 'pending_pickup' THEN 'Pending Pickup at Pickup Partner'
    WHEN p.status = 'confirmed' THEN 'Confirmed by Courier / PickedUp'
    WHEN p.status = 'picked_up' THEN 'Picked Up'
    WHEN p.status = 'in_transit' THEN 'In Transit (at MBet-Adera''s Sorting Facility Store)'
    WHEN p.status = 'pending_delivery' THEN 'Pending Delivery at Dropoff Partner'
    WHEN p.status = 'delivered' THEN 'Delivered'
    WHEN p.status = 'cancelled' THEN 'Cancelled'
    ELSE p.status::text
  END as status_display,
  
  ROUND(p.estimated_price, 2) as formatted_price,
  ROUND(p.distance, 1) as formatted_distance,
  
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

-- 21. Grant permissions
GRANT SELECT ON public.parcels_with_addresses TO authenticated, service_role;

-- Commit all changes
COMMIT;
