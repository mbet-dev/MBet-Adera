-- Function to get paginated parcels for a user with improved filtering and sorting
CREATE OR REPLACE FUNCTION get_paginated_parcels(
  user_id UUID,
  p_status TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_direction TEXT DEFAULT 'desc',
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
DECLARE
  sort_column TEXT;
  sort_order TEXT;
  status_filter TEXT[];
BEGIN
  -- Determine sort column
  IF p_sort_by = 'price' THEN
    sort_column := 'estimated_price';
  ELSIF p_sort_by = 'created' THEN
    sort_column := 'created_at';
  ELSE
    sort_column := COALESCE(p_sort_by, 'created_at');
  END IF;
  
  -- Determine sort order
  IF p_sort_direction = 'asc' THEN
    sort_order := 'ASC';
  ELSE
    sort_order := 'DESC';
  END IF;
  
  -- Handle special case for active status
  IF p_status = 'active' THEN
    status_filter := ARRAY['confirmed', 'picked_up', 'in_transit'];
  ELSIF p_status IS NOT NULL AND p_status != 'all' THEN
    status_filter := ARRAY[p_status];
  ELSE
    status_filter := NULL;
  END IF;
  
  -- Use dynamic SQL for sorting
  RETURN QUERY EXECUTE
  'WITH filtered_parcels AS (
    SELECT p.*
    FROM parcels p
    WHERE (p.sender_id = $1 OR p.receiver_id = $1)
      AND (' || CASE 
             WHEN status_filter IS NULL THEN 'TRUE'
             ELSE 'p.status = ANY($2)' 
           END || ')
    ORDER BY p.' || sort_column || ' ' || sort_order || '
  ),
  total_count AS (
    SELECT COUNT(*) AS count FROM filtered_parcels
  ),
  paginated_parcels AS (
    SELECT p.* FROM filtered_parcels p
    LIMIT $3
    OFFSET $4
  )
  SELECT 
    pp.*,
    (SELECT row_to_json(pa.*)::jsonb FROM addresses pa WHERE pa.id = pp.pickup_address_id) AS pickup_address,
    (SELECT row_to_json(da.*)::jsonb FROM addresses da WHERE da.id = pp.dropoff_address_id) AS dropoff_address,
    (SELECT count FROM total_count) AS total_count
  FROM paginated_parcels pp'
  USING user_id, status_filter, p_limit, p_offset;
END;
$$; 