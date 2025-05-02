-- Function to get paginated parcels for a user
CREATE OR REPLACE FUNCTION get_paginated_parcels(
  user_id UUID,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  receiver_id UUID,
  pickup_address_id UUID,
  dropoff_address_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  tracking_code TEXT,
  package_size TEXT,
  is_fragile BOOLEAN,
  package_description TEXT,
  pickup_contact TEXT,
  dropoff_contact TEXT,
  estimated_price NUMERIC,
  distance NUMERIC,
  pickup_address JSONB,
  dropoff_address JSONB,
  total_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_parcels AS (
    SELECT p.*
    FROM parcels p
    WHERE (p.sender_id = user_id OR p.receiver_id = user_id)
      AND (p_status IS NULL OR p.status = p_status)
    ORDER BY p.created_at DESC
  ),
  total_count AS (
    SELECT COUNT(*) AS count FROM filtered_parcels
  ),
  paginated_parcels AS (
    SELECT p.* FROM filtered_parcels p
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT 
    pp.*,
    (SELECT pa.* FROM addresses pa WHERE pa.id = pp.pickup_address_id)::JSONB AS pickup_address,
    (SELECT da.* FROM addresses da WHERE da.id = pp.dropoff_address_id)::JSONB AS dropoff_address,
    (SELECT count FROM total_count) AS total_count
  FROM paginated_parcels pp;
END;
$$; 