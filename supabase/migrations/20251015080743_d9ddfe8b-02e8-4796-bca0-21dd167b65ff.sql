-- Add quantity_consumed column to wms_inventory table
ALTER TABLE wms_inventory 
ADD COLUMN IF NOT EXISTS quantity_consumed INTEGER NOT NULL DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN wms_inventory.quantity_consumed IS 'Total quantity consumed/used from this inventory item across all approved orders';