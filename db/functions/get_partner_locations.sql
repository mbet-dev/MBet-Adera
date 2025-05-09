-- Function to fetch partner locations with joined address data
CREATE OR REPLACE FUNCTION get_partner_locations()
RETURNS TABLE (
  id UUID,
  business_name TEXT,
  color TEXT,
  working_hours JSONB,
  phone_number TEXT,
  is_facility BOOLEAN,
  address_id UUID,
  address_line TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  city TEXT
) LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.business_name,
    p.color,
    p.working_hours,
    p.phone_number,
    p.is_facility,
    p.address_id,
    a.address_line,
    a.latitude,
    a.longitude,
    a.city
  FROM 
    partners p
  LEFT JOIN 
    addresses a ON p.address_id = a.id
  WHERE 
    a.latitude IS NOT NULL 
    AND a.longitude IS NOT NULL;
END;
$$;

-- Grant execute privileges to authenticated users
GRANT EXECUTE ON FUNCTION get_partner_locations() TO authenticated; 