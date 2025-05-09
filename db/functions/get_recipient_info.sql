-- Function to get recipient information for a parcel
CREATE OR REPLACE FUNCTION get_recipient_info(parcel_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    recipient_data JSONB;
BEGIN
    SELECT 
        jsonb_build_object(
            'id', p.id,
            'first_name', p.first_name,
            'last_name', p.last_name,
            'full_name', COALESCE(
                p.first_name || ' ' || p.last_name,
                p.full_name,
                'Unknown Recipient'
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
        ) INTO recipient_data
    FROM 
        parcels pr
    JOIN 
        profiles p ON pr.receiver_id = p.id
    WHERE 
        pr.id = parcel_id;

    IF recipient_data IS NULL THEN
        RAISE EXCEPTION 'Recipient not found for parcel %', parcel_id;
    END IF;

    RETURN recipient_data;
END;
$$;

-- Grant execute privileges to authenticated users
GRANT EXECUTE ON FUNCTION get_recipient_info(UUID) TO authenticated; 