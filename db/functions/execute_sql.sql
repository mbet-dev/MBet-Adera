-- Function to execute custom SQL queries for diagnostics
-- WARNING: This should only be accessible to service role for security reasons
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Execute the query and get the results as JSON
    EXECUTE 'SELECT to_jsonb(array_agg(row_to_json(t))) FROM (' || sql_query || ') t' INTO result;
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    -- Return error information as JSON
    RETURN jsonb_build_object(
        'error', SQLERRM,
        'detail', SQLSTATE,
        'query', sql_query
    );
END;
$$;

-- Only grant execute to service role
REVOKE ALL ON FUNCTION execute_sql(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION execute_sql(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION execute_sql(TEXT) TO service_role;

-- Diagnostic query to check parcels data
CREATE OR REPLACE FUNCTION check_parcels_data()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT jsonb_build_object(
            'total_parcels', (SELECT COUNT(*) FROM parcels),
            'active_parcels', (SELECT COUNT(*) FROM parcels WHERE status IN ('pending', 'confirmed', 'picked_up', 'in_transit')),
            'sample_parcels', (
                SELECT jsonb_agg(row_to_json(p))
                FROM (
                    SELECT id, sender_id, receiver_id, status, created_at
                    FROM parcels
                    LIMIT 5
                ) p
            )
        )
    );
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION check_parcels_data() TO service_role; 