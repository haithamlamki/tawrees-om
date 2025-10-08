-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_wms_inventory_customer;
DROP INDEX IF EXISTS idx_wms_inventory_sku;
DROP INDEX IF EXISTS idx_wms_inventory_status;

-- Recreate indexes
CREATE INDEX idx_wms_inventory_customer ON public.wms_inventory(customer_id);
CREATE INDEX idx_wms_inventory_sku ON public.wms_inventory(sku);
CREATE INDEX idx_wms_inventory_status ON public.wms_inventory(status);