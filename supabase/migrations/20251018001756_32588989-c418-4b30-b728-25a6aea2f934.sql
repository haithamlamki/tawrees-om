-- Create secure function to get shipment invoices for users
CREATE OR REPLACE FUNCTION public.get_shipment_invoices_for_user(p_partner_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  tracking_number text,
  customer_name text,
  partner_name text,
  created_at timestamp with time zone,
  status text,
  total_amount numeric,
  cost_amount numeric,
  profit numeric,
  tawreed_amount numeric,
  partner_amount numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_is_accountant boolean;
  v_is_partner boolean;
  v_user_partner_id uuid;
BEGIN
  -- Check user roles
  v_is_admin := has_role(auth.uid(), 'admin'::app_role);
  v_is_accountant := has_role(auth.uid(), 'accountant'::app_role);
  v_is_partner := has_role(auth.uid(), 'shipping_partner'::app_role);
  
  -- Get partner_id for shipping partner users
  IF v_is_partner THEN
    SELECT shipping_partner_id INTO v_user_partner_id
    FROM user_roles
    WHERE user_id = auth.uid() AND role = 'shipping_partner'::app_role
    LIMIT 1;
  END IF;
  
  -- Return data based on role
  RETURN QUERY
  SELECT 
    s.id,
    s.tracking_number,
    COALESCE(p.full_name, p.email, 'Unknown') as customer_name,
    COALESCE(sp.company_name, 'Unassigned') as partner_name,
    s.created_at,
    s.status,
    sr.calculated_cost as total_amount,
    COALESCE(
      (SELECT a.buy_price 
       FROM agreements a 
       WHERE a.partner_id = s.assigned_partner_id 
         AND a.rate_type::text = sr.shipping_type 
         AND a.active = true 
       LIMIT 1),
      sr.calculated_cost * 0.70
    ) as cost_amount,
    GREATEST(
      sr.calculated_cost - COALESCE(
        (SELECT a.buy_price 
         FROM agreements a 
         WHERE a.partner_id = s.assigned_partner_id 
           AND a.rate_type::text = sr.shipping_type 
           AND a.active = true 
         LIMIT 1),
        sr.calculated_cost * 0.70
      ),
      0
    ) as profit,
    GREATEST(
      sr.calculated_cost - COALESCE(
        (SELECT a.buy_price 
         FROM agreements a 
         WHERE a.partner_id = s.assigned_partner_id 
           AND a.rate_type::text = sr.shipping_type 
           AND a.active = true 
         LIMIT 1),
        sr.calculated_cost * 0.70
      ),
      0
    ) / 2 as tawreed_amount,
    GREATEST(
      sr.calculated_cost - COALESCE(
        (SELECT a.buy_price 
         FROM agreements a 
         WHERE a.partner_id = s.assigned_partner_id 
           AND a.rate_type::text = sr.shipping_type 
           AND a.active = true 
         LIMIT 1),
        sr.calculated_cost * 0.70
      ),
      0
    ) / 2 as partner_amount
  FROM shipments s
  JOIN shipment_requests sr ON sr.id = s.request_id
  LEFT JOIN profiles p ON p.id = sr.customer_id
  LEFT JOIN shipping_partners sp ON sp.id = s.assigned_partner_id
  WHERE 
    -- Status filter: only delivered or completed shipments
    s.status IN ('delivered', 'completed')
    AND (
      -- Admin/Accountant: can see all, optionally filter by partner
      (v_is_admin OR v_is_accountant) AND (p_partner_id IS NULL OR s.assigned_partner_id = p_partner_id)
      OR
      -- Shipping partner: only see their own shipments
      (v_is_partner AND s.assigned_partner_id = v_user_partner_id)
    )
  ORDER BY s.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
REVOKE ALL ON FUNCTION public.get_shipment_invoices_for_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shipment_invoices_for_user(uuid) TO authenticated;