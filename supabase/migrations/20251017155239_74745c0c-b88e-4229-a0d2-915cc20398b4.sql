-- Update get_public_active_agreement to prefer global (company) rates over partner-specific rates
CREATE OR REPLACE FUNCTION public.get_public_active_agreement(p_origin uuid, p_destination uuid, p_rate_type text)
 RETURNS TABLE(id uuid, origin_id uuid, destination_id uuid, rate_type text, currency text, buy_price numeric, sell_price numeric, margin_percent numeric, min_charge numeric, valid_from timestamp with time zone, valid_to timestamp with time zone, notes text, active boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    a.id,
    a.origin_id,
    a.destination_id,
    a.rate_type::text,
    a.currency,
    a.buy_price,
    a.sell_price,
    a.margin_percent,
    a.min_charge,
    a.valid_from,
    a.valid_to,
    a.notes,
    a.active
  FROM public.agreements a
  WHERE a.origin_id = p_origin
    AND a.destination_id = p_destination
    AND a.rate_type::text = p_rate_type
    AND a.active = true
    AND a.approval_status = 'approved'::approval_status
    AND a.valid_from <= now()
    AND (a.valid_to IS NULL OR a.valid_to >= now())
  ORDER BY 
    (CASE WHEN a.partner_id IS NULL THEN 0 ELSE 1 END), -- NULL partner_id (global rates) first
    a.updated_at DESC
  LIMIT 1;
$function$;