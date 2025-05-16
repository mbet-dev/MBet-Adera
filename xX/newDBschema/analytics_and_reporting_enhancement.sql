-- Analytics and reporting tables
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_date DATE NOT NULL,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_parcels INTEGER DEFAULT 0,
  new_parcels INTEGER DEFAULT 0,
  completed_deliveries INTEGER DEFAULT 0,
  active_deliveries INTEGER DEFAULT 0,
  cancelled_deliveries INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  average_delivery_time NUMERIC DEFAULT 0, -- in hours
  average_rating NUMERIC DEFAULT 0,
  metrics_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(metric_date)
);

-- Partner performance metrics
CREATE TABLE IF NOT EXISTS partner_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID REFERENCES partners(id) NOT NULL,
  metric_date DATE NOT NULL,
  total_parcels INTEGER DEFAULT 0,
  parcels_processed INTEGER DEFAULT 0,
  average_processing_time NUMERIC DEFAULT 0, -- in minutes
  customer_ratings NUMERIC DEFAULT 0,
  metrics_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(partner_id, metric_date)
);

-- Personnel performance metrics
CREATE TABLE IF NOT EXISTS personnel_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personnel_id UUID REFERENCES delivery_personnel(id) NOT NULL,
  metric_date DATE NOT NULL,
  deliveries_assigned INTEGER DEFAULT 0,
  deliveries_completed INTEGER DEFAULT 0,
  on_time_deliveries INTEGER DEFAULT 0,
  average_delivery_time NUMERIC DEFAULT 0, -- in minutes
  total_distance NUMERIC DEFAULT 0, -- in km
  customer_ratings NUMERIC DEFAULT 0,
  metrics_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(personnel_id, metric_date)
);

-- Create materialized views for faster reporting
CREATE MATERIALIZED VIEW IF NOT EXISTS delivery_statistics AS
SELECT
  date_trunc('day', parcels.created_at)::date AS date,
  COUNT(*) AS total_parcels,
  SUM(CASE WHEN parcels.status = 'delivered' THEN 1 ELSE 0 END) AS delivered_parcels,
  AVG(CASE
    WHEN parcels.status = 'delivered' AND parcels.actual_delivery_time IS NOT NULL
    THEN EXTRACT(EPOCH FROM (parcels.actual_delivery_time - parcels.created_at))/3600
    ELSE NULL
  END) AS avg_delivery_time_hours,
  COUNT(DISTINCT parcels.sender_id) AS active_senders,
  SUM(CASE WHEN payments.payment_status = 'completed' THEN payments.amount ELSE 0 END) AS total_revenue
FROM
  parcels
LEFT JOIN
  payments ON parcels.id = payments.parcel_id
GROUP BY
  date_trunc('day', parcels.created_at)::date
ORDER BY
  date DESC;

-- User retention view
CREATE MATERIALIZED VIEW IF NOT EXISTS user_retention AS
WITH user_activity AS (
  SELECT
    user_id,
    date_trunc('day', created_at)::date AS activity_date,
    MIN(date_trunc('day', created_at)::date) OVER (PARTITION BY user_id) AS first_active_date
  FROM
    parcels
  GROUP BY
    user_id, date_trunc('day', created_at)::date
)
SELECT
  first_active_date,
  activity_date,
  (activity_date - first_active_date) AS days_since_first_active,
  COUNT(DISTINCT user_id) AS user_count
FROM
  user_activity
GROUP BY
  first_active_date, activity_date
ORDER BY
  first_active_date, activity_date;

-- Create refresh function for materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY delivery_statistics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_retention;
  -- Add more views here as needed
END;
$$ LANGUAGE plpgsql;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_parcels_created_at ON parcels (created_at);
CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels (status);
CREATE INDEX IF NOT EXISTS idx_parcels_sender_id ON parcels (sender_id);
CREATE INDEX IF NOT EXISTS idx_payments_parcel_id ON payments (parcel_id);
CREATE INDEX IF NOT EXISTS idx_delivery_stats_date ON delivery_statistics (date);
CREATE INDEX IF NOT EXISTS idx_user_retention_first_date ON user_retention (first_active_date);

COMMENT ON TABLE system_metrics IS 'Daily system-wide performance metrics';
COMMENT ON TABLE partner_metrics IS 'Performance metrics for partner locations';
COMMENT ON TABLE personnel_metrics IS 'Performance metrics for delivery personnel';
COMMENT ON MATERIALIZED VIEW delivery_statistics IS 'Pre-calculated statistics for delivery performance';
COMMENT ON MATERIALIZED VIEW user_retention IS 'User retention analysis by cohort'; 