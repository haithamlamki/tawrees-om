-- Update shipments status constraint to include all used status values
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS shipments_status_check;

ALTER TABLE public.shipments ADD CONSTRAINT shipments_status_check 
CHECK (status IN (
  'pending_partner_acceptance',
  'received_from_supplier',
  'processing',
  'in_transit',
  'at_customs',
  'customs',
  'received_muscat_wh',
  'out_for_delivery',
  'delivered',
  'completed',
  'rejected'
));