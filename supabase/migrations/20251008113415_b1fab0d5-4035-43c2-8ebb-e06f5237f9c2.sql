-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Add admin_notes column to wms_product_requests
ALTER TABLE public.wms_product_requests 
ADD COLUMN IF NOT EXISTS admin_notes TEXT;