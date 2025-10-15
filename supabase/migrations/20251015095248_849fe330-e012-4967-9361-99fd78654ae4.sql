-- Add inventory_id column to wms_invoice_items table
ALTER TABLE public.wms_invoice_items 
ADD COLUMN IF NOT EXISTS inventory_id UUID REFERENCES public.wms_inventory(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_wms_invoice_items_inventory_id 
ON public.wms_invoice_items(inventory_id);

-- Add comment for documentation
COMMENT ON COLUMN public.wms_invoice_items.inventory_id IS 'Reference to the inventory item that was invoiced';