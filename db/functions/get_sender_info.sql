-- Function to get sender information for a parcel
CREATE OR REPLACE FUNCTION get_sender_info(parcel_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    sender_data JSONB;
BEGIN
    SELECT 
        jsonb_build_object(
            'id', p.id,
            'first_name', p.first_name,
            'last_name', p.last_name,
            'full_name', COALESCE(
                p.first_name || ' ' || p.last_name,
                p.full_name,
                'Unknown Sender'
            ),
            'phone_number', COALESCE(p.phone_number, 'Not provided'),
            'avatar_url', COALESCE(p.avatar_url, 
                'https://ui-avatars.com/api/?name=' || 
                COALESCE(
                    NULLIF(p.first_name, '') || CASE WHEN p.last_name IS NOT NULL THEN '+' || p.last_name ELSE '' END,
                    p.email, 
                    'User'
                ) || '&background=random&color=fff'
            )
        ) INTO sender_data
    FROM 
        parcels pr
    JOIN 
        profiles p ON pr.sender_id = p.id
    WHERE 
        pr.id = parcel_id;

    IF sender_data IS NULL THEN
        RAISE EXCEPTION 'Sender not found for parcel %', parcel_id;
    END IF;

    RETURN sender_data;
END;
$$;

-- Grant execute privileges to authenticated users
GRANT EXECUTE ON FUNCTION get_sender_info(UUID) TO authenticated; 