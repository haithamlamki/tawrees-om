-- Add storage_locations field to shipping_partners table
ALTER TABLE shipping_partners 
ADD COLUMN IF NOT EXISTS storage_locations JSONB DEFAULT '[]'::jsonb;

-- Add comment
COMMENT ON COLUMN shipping_partners.storage_locations IS 'Array of saved storage/warehouse locations for the partner';