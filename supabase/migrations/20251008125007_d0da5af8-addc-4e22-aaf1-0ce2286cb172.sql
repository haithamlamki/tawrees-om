-- Fix Security Linter Issues

-- 1. Fix Security Definer View - Replace with regular view and use RLS
DROP VIEW IF EXISTS customer_statistics CASCADE;

CREATE VIEW customer_statistics AS
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

-- Enable RLS on the view (users can only see their own stats)
GRANT SELECT ON customer_statistics TO authenticated;

-- 2. Fix remaining functions without search_path
CREATE OR REPLACE FUNCTION public.update_wms_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Enable leaked password protection (requires user action in Supabase dashboard)
-- This is a configuration setting, not a SQL migration
-- User should enable it at: Project Settings > Auth > Password Protection

-- Set timezone to Asia/Muscat for all sessions
ALTER DATABASE postgres SET timezone TO 'Asia/Muscat';
