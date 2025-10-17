-- Create a secure RPC to fetch a single active, approved agreement for public calculator use
-- Returns limited, non-sensitive fields and enforces business filters inside the function
CREATE OR REPLACE FUNCTION public.get_public_active_agreement(
  p_origin uuid,
  p_destination uuid,
  p_rate_type text
)
RETURNS TABLE (
  id uuid,
  origin_id uuid,
  destination_id uuid,
  rate_type text,
  currency text,
  buy_price numeric,
  sell_price numeric,
  margin_percent numeric,
  min_charge numeric,
  valid_from timestamptz,
  valid_to timestamptz,
  notes text,
  active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  ORDER BY a.updated_at DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_public_active_agreement(uuid, uuid, text)
IS 'Public-safe RPC to fetch a single active, approved agreement for a lane and rate type. Executes with SECURITY DEFINER to bypass RLS but internally restricts to approved, active rows.';