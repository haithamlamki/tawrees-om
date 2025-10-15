-- Add currency column to wms_invoices table
ALTER TABLE public.wms_invoices 
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'OMR';

-- Add comment for documentation
COMMENT ON COLUMN public.wms_invoices.currency IS 'Invoice currency (default: OMR - Omani Rial)';