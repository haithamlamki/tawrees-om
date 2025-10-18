-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_shipment_invoices_for_user(uuid);

-- Recreate the function with payment_status included
CREATE OR REPLACE FUNCTION public.get_shipment_invoices_for_user(p_partner_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  tracking_number text,
  customer_name text,
  created_at timestamp with time zone,
  status text,
  total_amount numeric,
  cost_amount numeric,
  profit numeric,
  tawreed_amount numeric,
  partner_amount numeric,
  partner_name text,
  partner_id uuid,
  payment_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.tracking_number,
    p.full_name as customer_name,
    s.created_at,
    s.status,
    COALESCE(psq.original_amount, 0) as total_amount,
    COALESCE(psq.partner_quoted_amount, 0) as cost_amount,
    COALESCE(psq.original_amount - psq.partner_quoted_amount, 0) as profit,
    COALESCE((psq.original_amount - psq.partner_quoted_amount) * 0.5, 0) as tawreed_amount,
    COALESCE((psq.original_amount - psq.partner_quoted_amount) * 0.5, 0) as partner_amount,
    sp.company_name as partner_name,
    s.assigned_partner_id as partner_id,
    CASE 
      WHEN pp.status = 'confirmed' THEN 'paid'
      WHEN pp.status = 'pending_confirmation' THEN 'processed'
      ELSE 'unpaid'
    END as payment_status
  FROM shipments s
  JOIN shipment_requests sr ON sr.id = s.request_id
  JOIN profiles p ON p.id = sr.customer_id
  LEFT JOIN partner_shipping_quotes psq ON psq.shipment_id = s.id
  LEFT JOIN shipping_partners sp ON sp.id = s.assigned_partner_id
  LEFT JOIN partner_payment_invoices ppi ON ppi.shipment_id = s.id
  LEFT JOIN partner_payments pp ON pp.id = ppi.payment_id
  WHERE s.status = 'delivered'
    AND (p_partner_id IS NULL OR s.assigned_partner_id = p_partner_id)
  ORDER BY s.created_at DESC;
END;
$$;