-- Fix for the materialized view that's causing the error
-- Replace user_id with sender_id in the user retention materialized view

-- Drop the existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS user_retention;

-- Create the fixed materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS user_retention AS
WITH user_activity AS (
  SELECT
    sender_id, -- Changed from user_id to sender_id
    date_trunc('day', created_at)::date AS activity_date,
    MIN(date_trunc('day', created_at)::date) OVER (PARTITION BY sender_id) AS first_active_date -- Changed here too
  FROM
    parcels
  WHERE
    sender_id IS NOT NULL -- Added safety check
  GROUP BY
    sender_id, date_trunc('day', created_at)::date -- Changed here too
)
SELECT
  first_active_date,
  activity_date,
  (activity_date - first_active_date) AS days_since_first_active,
  COUNT(DISTINCT sender_id) AS user_count -- Changed here too
FROM
  user_activity
GROUP BY
  first_active_date, activity_date
ORDER BY
  first_active_date, activity_date;

-- Update the refresh function to match
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY delivery_statistics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_retention;
  -- Add more views here as needed
END;
$$ LANGUAGE plpgsql;

-- Create index for the fixed view
DROP INDEX IF EXISTS idx_user_retention_first_date;
CREATE INDEX IF NOT EXISTS idx_user_retention_first_date ON user_retention (first_active_date);

COMMENT ON MATERIALIZED VIEW user_retention IS 'User retention analysis by cohort based on sender_id'; 