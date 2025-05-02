-- WARNING: This function allows arbitrary SQL execution and should only be callable by admins
-- Create a function to execute SQL commands for migrations
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;

-- Only allow the service role to execute this function
REVOKE ALL ON FUNCTION exec_sql(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION exec_sql(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role; 