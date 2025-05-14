-- Delivery personnel management
CREATE TABLE IF NOT EXISTS delivery_personnel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  employee_id TEXT UNIQUE,
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'on_leave', 'busy'
  current_location JSONB,
  vehicle_type TEXT,
  vehicle_id TEXT,
  license_number TEXT,
  maximum_capacity NUMERIC, -- in kg
  service_area JSONB, -- geojson of service area
  is_online BOOLEAN DEFAULT false,
  last_online TIMESTAMP WITH TIME ZONE,
  rating NUMERIC DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Personnel shift management
CREATE TABLE IF NOT EXISTS personnel_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personnel_id UUID REFERENCES delivery_personnel(id) NOT NULL,
  shift_start TIMESTAMP WITH TIME ZONE NOT NULL,
  shift_end TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'active', 'completed', 'cancelled'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enhanced parcel tracking with detailed status history
CREATE TABLE IF NOT EXISTS parcel_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id UUID REFERENCES parcels(id) NOT NULL,
  status TEXT NOT NULL,
  location JSONB,
  address_text TEXT,
  notes TEXT,
  performed_by UUID REFERENCES auth.users(id),
  personnel_id UUID REFERENCES delivery_personnel(id),
  verification_code TEXT,
  proof_image_url TEXT,
  signature_url TEXT,
  reason_code TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Parcel assignments to delivery personnel
CREATE TABLE IF NOT EXISTS parcel_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id UUID REFERENCES parcels(id) NOT NULL,
  personnel_id UUID REFERENCES delivery_personnel(id) NOT NULL,
  status TEXT DEFAULT 'assigned', -- 'assigned', 'accepted', 'in_progress', 'completed', 'rejected', 'reassigned'
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID REFERENCES auth.users(id),
  priority INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(parcel_id, personnel_id, status)
);

-- Route optimization for delivery personnel
CREATE TABLE IF NOT EXISTS delivery_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personnel_id UUID REFERENCES delivery_personnel(id) NOT NULL,
  date DATE NOT NULL,
  route_order JSONB, -- array of parcel_ids in order
  estimated_start_time TIMESTAMP WITH TIME ZONE,
  estimated_end_time TIMESTAMP WITH TIME ZONE,
  actual_start_time TIMESTAMP WITH TIME ZONE,
  actual_end_time TIMESTAMP WITH TIME ZONE,
  total_distance NUMERIC, -- in km
  status TEXT DEFAULT 'planned', -- 'planned', 'in_progress', 'completed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(personnel_id, date)
);

-- Personnel location history for path tracking
CREATE TABLE IF NOT EXISTS personnel_location_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personnel_id UUID REFERENCES delivery_personnel(id) NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  accuracy NUMERIC,
  altitude NUMERIC,
  speed NUMERIC,
  heading NUMERIC,
  battery_level NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE delivery_personnel IS 'Information about delivery drivers and couriers';
COMMENT ON TABLE personnel_shifts IS 'Working shifts for delivery personnel';
COMMENT ON TABLE parcel_status_history IS 'Detailed history of all status changes for parcels';
COMMENT ON TABLE parcel_assignments IS 'Assignment of parcels to delivery personnel';
COMMENT ON TABLE delivery_routes IS 'Optimized delivery routes for personnel';
COMMENT ON TABLE personnel_location_history IS 'Location tracking data for delivery personnel'; 