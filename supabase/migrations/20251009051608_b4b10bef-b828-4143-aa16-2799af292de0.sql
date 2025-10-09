-- Add comprehensive contract fields to match the form requirements
ALTER TABLE wms_contracts
ADD COLUMN IF NOT EXISTS network_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS responsible_person TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS gateway_username TEXT,
ADD COLUMN IF NOT EXISTS gateway_password TEXT,
ADD COLUMN IF NOT EXISTS create_account BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS contract_date DATE,
ADD COLUMN IF NOT EXISTS products_included JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS branches JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment for clarity
COMMENT ON COLUMN wms_contracts.network_name IS 'Network or company name for the contract';
COMMENT ON COLUMN wms_contracts.gateway_username IS 'Username for gateway access';
COMMENT ON COLUMN wms_contracts.gateway_password IS 'Password for gateway access (should be encrypted in production)';
COMMENT ON COLUMN wms_contracts.products_included IS 'JSON array of product IDs included in the contract';
COMMENT ON COLUMN wms_contracts.branches IS 'JSON array of branch information';