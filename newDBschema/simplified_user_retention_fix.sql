-- Simplified fix for the materialized view error
-- This script fixes the user_retention view by using sender_id instead of user_id

-- Drop the existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS user_retention;

-- Create the fixed materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS user_retention AS
WITH user_activity AS (
  SELECT
    sender_id,
    date_trunc('day', created_at)::date AS activity_date,
    MIN(date_trunc('day', created_at)::date) OVER (PARTITION BY sender_id) AS first_active_date
  FROM
    parcels
  WHERE
    sender_id IS NOT NULL
  GROUP BY
    sender_id, date_trunc('day', created_at)::date
)
SELECT
  first_active_date,
  activity_date,
  (activity_date - first_active_date) AS days_since_first_active,
  COUNT(DISTINCT sender_id) AS user_count
FROM
  user_activity
GROUP BY
  first_active_date, activity_date
ORDER BY
  first_active_date, activity_date;

-- Create index for the view if it doesn't exist
DROP INDEX IF EXISTS idx_user_retention_first_date;
CREATE INDEX IF NOT EXISTS idx_user_retention_first_date ON user_retention (first_active_date);

-- Update or create the refresh function
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY IF EXISTS delivery_statistics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_retention;
END;
$$ LANGUAGE plpgsql;

-- Add documentation comment
COMMENT ON MATERIALIZED VIEW user_retention IS 'User retention analysis by cohort based on sender_id'; 