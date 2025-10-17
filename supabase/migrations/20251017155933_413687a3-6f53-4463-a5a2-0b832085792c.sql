-- Ensure admins can manage shipping rates via RLS
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

-- Drop existing overly restrictive policies with same names if they exist
DROP POLICY IF EXISTS "Admins can manage shipping rates" ON public.shipping_rates;
DROP POLICY IF EXISTS "Anyone can view active shipping rates" ON public.shipping_rates;

-- Allow admins full access
CREATE POLICY "Admins can manage shipping rates"
ON public.shipping_rates
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ensure authenticated users can view active rates if needed by other pages
CREATE POLICY "Anyone can view active shipping rates"
ON public.shipping_rates
FOR SELECT
USING (is_active = true);