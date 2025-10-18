-- Add storage_locations to shipping_partners table
ALTER TABLE shipping_partners 
ADD COLUMN IF NOT EXISTS storage_locations jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN shipping_partners.storage_locations IS 'Array of storage locations: [{id, name, address, is_default}]';

-- Add currency to shipment_requests table
ALTER TABLE shipment_requests 
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'OMR';

COMMENT ON COLUMN shipment_requests.currency IS 'Currency used for calculated_cost (USD, OMR, etc)';

-- Update partner_shipping_quotes table
ALTER TABLE partner_shipping_quotes 
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'OMR',
ADD COLUMN IF NOT EXISTS requires_customer_approval boolean DEFAULT true;

COMMENT ON COLUMN partner_shipping_quotes.currency IS 'Currency for the quote amounts';
COMMENT ON COLUMN partner_shipping_quotes.requires_customer_approval IS 'Whether this quote needs customer approval (false if no changes)';