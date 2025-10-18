-- Add new columns to shipments table for enhanced status tracking
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS container_number text,
ADD COLUMN IF NOT EXISTS container_tracking_url text,
ADD COLUMN IF NOT EXISTS assigned_driver_id uuid REFERENCES public.wms_drivers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status_metadata jsonb DEFAULT '{}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.shipments.container_number IS 'Container number for sea freight tracking (format: 4 letters + 7 digits, e.g., MSCU1234567)';
COMMENT ON COLUMN public.shipments.container_tracking_url IS 'Auto-generated SeaRates tracking URL for live container tracking';
COMMENT ON COLUMN public.shipments.assigned_driver_id IS 'Driver assigned for final delivery (required when status = out_for_delivery)';
COMMENT ON COLUMN public.shipments.status_metadata IS 'Additional metadata for each status (e.g., received_from_supplier details, photo references)';

-- Create index for faster driver lookups
CREATE INDEX IF NOT EXISTS idx_shipments_assigned_driver ON public.shipments(assigned_driver_id);

-- Create index for container number searches
CREATE INDEX IF NOT EXISTS idx_shipments_container_number ON public.shipments(container_number) WHERE container_number IS NOT NULL;