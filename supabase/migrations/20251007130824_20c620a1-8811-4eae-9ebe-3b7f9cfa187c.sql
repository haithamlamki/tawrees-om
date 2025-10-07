-- Phase 3: Enhanced customer management (corrected - views don't have RLS)
-- Add email column to profiles first
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email text;

-- Update existing profiles with email from auth.users
UPDATE public.profiles
SET email = (
  SELECT email FROM auth.users WHERE auth.users.id = profiles.id
)
WHERE email IS NULL;

-- Add more customer profile fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS payment_preference text DEFAULT 'before_shipping',
ADD COLUMN IF NOT EXISTS customer_notes text;

-- Create a view for customer shipment statistics
CREATE OR REPLACE VIEW public.customer_statistics AS
SELECT 
  p.id as customer_id,
  p.full_name,
  p.company_name,
  p.email,
  COUNT(DISTINCT sr.id) as total_requests,
  COUNT(DISTINCT CASE WHEN sr.status = 'approved' THEN sr.id END) as approved_requests,
  COUNT(DISTINCT s.id) as total_shipments,
  COALESCE(SUM(sr.calculated_cost), 0) as total_spent,
  MAX(sr.created_at) as last_request_date
FROM public.profiles p
LEFT JOIN public.shipment_requests sr ON sr.customer_id = p.id
LEFT JOIN public.shipments s ON s.request_id = sr.id
GROUP BY p.id, p.full_name, p.company_name, p.email;

-- Grant access to the view (views inherit RLS from underlying tables)
GRANT SELECT ON public.customer_statistics TO authenticated;

-- Update profiles RLS to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));