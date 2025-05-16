-- Payment Gateway Integration Tables
CREATE TABLE IF NOT EXISTS payment_gateways (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL,  -- 'YenePay', 'Chapa', 'TeleBirr', 'internal_wallet', 'cash'
  is_active BOOLEAN DEFAULT true,
  configuration JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add payment detail extensions to existing payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS gateway_id UUID REFERENCES payment_gateways(id),
ADD COLUMN IF NOT EXISTS gateway_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS gateway_response JSONB,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ETB',
ADD COLUMN IF NOT EXISTS processing_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payer_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS payment_notes TEXT,
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Insert default payment gateways
INSERT INTO payment_gateways (name, provider, configuration)
VALUES 
('Wallet', 'internal_wallet', '{"description": "Internal wallet payment system"}'),
('Cash on Delivery', 'cash', '{"description": "Cash payment upon delivery"}'),
('YenePay', 'YenePay', '{"api_url": "https://yenepay.com/api", "requires_setup": true}'),
('Chapa', 'Chapa', '{"api_url": "https://api.chapa.co", "requires_setup": true}'),
('TeleBirr', 'TeleBirr', '{"api_url": "https://api.ethiotelecom.et/telebirr", "requires_setup": true}')
ON CONFLICT DO NOTHING;

-- Payment transaction history for detailed tracking
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES payments(id) NOT NULL,
  status TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL, -- 'authorization', 'capture', 'refund', 'void'
  gateway_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE payment_gateways IS 'Configured payment providers and their settings';
COMMENT ON TABLE payment_transactions IS 'Detailed payment transaction history with status changes'; 