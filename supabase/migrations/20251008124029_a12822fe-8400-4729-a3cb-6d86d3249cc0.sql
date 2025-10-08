-- Enable realtime on WMS tables (skip notifications as it's already enabled)
DO $$
BEGIN
  -- Try to add wms_orders to realtime
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE wms_orders;
  EXCEPTION WHEN duplicate_object THEN
    -- Already exists, skip
    NULL;
  END;
  
  -- Try to add wms_inventory to realtime
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE wms_inventory;
  EXCEPTION WHEN duplicate_object THEN
    -- Already exists, skip
    NULL;
  END;
END $$;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_wms_orders_created_at ON wms_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_wms_inventory_sku ON wms_inventory(sku);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Storage RLS for delivery proofs
DROP POLICY IF EXISTS "Users upload delivery proofs" ON storage.objects;
CREATE POLICY "Users upload delivery proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'wms-delivery-proofs' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Users view delivery proofs" ON storage.objects;
CREATE POLICY "Users view delivery proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'wms-delivery-proofs'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Storage RLS for contract documents  
DROP POLICY IF EXISTS "Admins upload contracts" ON storage.objects;
CREATE POLICY "Admins upload contracts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'wms-contract-documents'
  AND has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Users view contracts" ON storage.objects;
CREATE POLICY "Users view contracts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'wms-contract-documents'
  AND has_role(auth.uid(), 'admin'::app_role)
);
