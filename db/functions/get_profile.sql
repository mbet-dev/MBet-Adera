-- Function to get a single profile by ID
CREATE OR REPLACE FUNCTION get_profile(profile_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    profile_data JSONB;
BEGIN
    SELECT 
        jsonb_build_object(
            'id', p.id,
            'email', p.email,
            'first_name', p.first_name,
            'last_name', p.last_name,
            'full_name', p.full_name,
            'phone_number', p.phone_number,
            'avatar_url', COALESCE(p.avatar_url, 
                'https://ui-avatars.com/api/?name=' || 
                COALESCE(
                    NULLIF(p.first_name, '') || CASE WHEN p.last_name IS NOT NULL THEN '+' || p.last_name ELSE '' END,
                    p.email, 
                    'User'
                ) || '&background=random&color=fff'
            ),
            'role', p.role,
            'created_at', p.created_at,
            'updated_at', p.updated_at
        ) INTO profile_data
    FROM 
        profiles p
    WHERE 
        p.id = profile_id;

    IF profile_data IS NULL THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    RETURN profile_data;
END;
$$;

-- Grant execute privileges to authenticated users
GRANT EXECUTE ON FUNCTION get_profile(UUID) TO authenticated; 