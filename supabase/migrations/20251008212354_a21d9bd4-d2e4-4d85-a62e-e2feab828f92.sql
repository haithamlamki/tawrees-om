-- Fix Security Definer View by explicitly setting SECURITY INVOKER
-- This ensures the view respects RLS policies of the calling user, not the view creator

DROP VIEW IF EXISTS customer_statistics CASCADE;

CREATE VIEW customer_statistics 
WITH (security_invoker = true)
AS
SELECT 
  p.id as customer_id,
  p.full_name,
  p.email,
  p.company_name,
  COUNT(DISTINCT sr.id) as total_requests,
  COUNT(DISTINCT CASE WHEN sr.status = 'approved' THEN sr.id END) as approved_requests,
  SUM(sr.calculated_cost) as total_spent,
  MAX(sr.created_at) as last_request_date,
  COUNT(DISTINCT s.id) as total_shipments
FROM profiles p
LEFT JOIN shipment_requests sr ON sr.customer_id = p.id
LEFT JOIN shipments s ON s.request_id = sr.id
GROUP BY p.id, p.full_name, p.email, p.company_name;

-- Grant access to authenticated users (RLS on base tables controls actual access)
GRANT SELECT ON customer_statistics TO authenticated;

COMMENT ON VIEW customer_statistics IS 
  'Customer statistics view with SECURITY INVOKER - respects RLS policies of the calling user. 
   Access is controlled by RLS policies on profiles, shipment_requests, and shipments tables.';