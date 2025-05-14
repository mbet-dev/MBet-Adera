-- Enhanced role management system
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User role assignments
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  role_id UUID REFERENCES roles(id) NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Extended user profile for additional user data
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS device_tokens JSONB, -- For push notifications to multiple devices
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS verification_status JSONB DEFAULT '{"email": false, "phone": false, "identity": false}',
ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{"total_parcels_sent": 0, "total_parcels_received": 0, "completed_deliveries": 0}';

-- Insert default roles
INSERT INTO roles (name, description, is_system_role, permissions)
VALUES 
('Customer', 'Regular user who can send and receive parcels', true, '["create_parcel", "view_own_parcels", "track_parcels", "manage_profile"]'),
('Partner', 'Business partner who can receive and process parcels', true, '["view_assigned_parcels", "update_parcel_status", "manage_profile"]'),
('Driver', 'Delivery personnel who can deliver parcels', true, '["view_assigned_parcels", "update_parcel_status", "manage_profile", "update_location"]'),
('Staff', 'Internal staff who can manage parcels and support', true, '["view_all_parcels", "manage_parcels", "support_chat", "manage_partners"]'),
('Admin', 'System administrator with full access', true, '["*"]')
ON CONFLICT DO NOTHING;

-- User verification system
CREATE TABLE IF NOT EXISTS user_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  verification_type TEXT NOT NULL, -- 'email', 'phone', 'id_document', 'address'
  status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  verification_data JSONB,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User activity log
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  activity_type TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE roles IS 'System roles with associated permissions';
COMMENT ON TABLE user_roles IS 'Assignment of roles to users';
COMMENT ON TABLE user_verifications IS 'Verification status for user identity and contact methods';
COMMENT ON TABLE user_activity_log IS 'Audit log of user activities within the system'; 