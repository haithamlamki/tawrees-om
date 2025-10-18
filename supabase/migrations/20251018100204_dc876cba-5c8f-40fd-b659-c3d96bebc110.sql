-- =========================================
-- Partner Payment Management System
-- =========================================

-- Create enum for payment status
CREATE TYPE payment_status AS ENUM ('pending_confirmation', 'confirmed', 'rejected');

-- Create partner_payments table
CREATE TABLE public.partner_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_reference TEXT UNIQUE NOT NULL,
  admin_id UUID REFERENCES auth.users(id) NOT NULL,
  partner_id UUID REFERENCES public.shipping_partners(id) NOT NULL,
  total_amount NUMERIC(15,3) NOT NULL,
  currency TEXT DEFAULT 'OMR' NOT NULL,
  payment_slip_path TEXT,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status payment_status DEFAULT 'pending_confirmation' NOT NULL,
  notes TEXT,
  partner_notes TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create partner_payment_invoices junction table
CREATE TABLE public.partner_payment_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.partner_payments(id) ON DELETE CASCADE NOT NULL,
  shipment_id UUID REFERENCES public.shipments(id) NOT NULL,
  invoice_amount NUMERIC(15,3) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(payment_id, shipment_id)
);

-- Add payment tracking columns to shipments
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS partner_payment_id UUID REFERENCES public.partner_payments(id),
ADD COLUMN IF NOT EXISTS partner_payment_status TEXT DEFAULT 'unpaid' CHECK (partner_payment_status IN ('unpaid', 'pending_confirmation', 'paid'));

-- Create function to generate payment reference
CREATE OR REPLACE FUNCTION public.generate_payment_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  ref_year INTEGER;
  payment_ref TEXT;
BEGIN
  ref_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(payment_reference, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM partner_payments
  WHERE payment_reference LIKE 'PAY-' || ref_year::TEXT || '-%';
  
  payment_ref := 'PAY-' || ref_year || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN payment_ref;
END;
$$;

-- Create function to get unpaid shipments for partner
CREATE OR REPLACE FUNCTION public.get_unpaid_partner_shipments(p_partner_id UUID)
RETURNS TABLE (
  id UUID,
  tracking_number TEXT,
  customer_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  status TEXT,
  total_amount NUMERIC,
  cost_amount NUMERIC,
  profit NUMERIC,
  tawreed_amount NUMERIC,
  partner_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.tracking_number,
    COALESCE(p.full_name, p.email, 'Unknown') as customer_name,
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
  WHERE 
    s.assigned_partner_id = p_partner_id
    AND s.status IN ('delivered', 'completed')
    AND (s.partner_payment_status IS NULL OR s.partner_payment_status = 'unpaid');
END;
$$;

-- Enable RLS on new tables
ALTER TABLE public.partner_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payment_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_payments
CREATE POLICY "Admins can manage all partner payments"
ON public.partner_payments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can view their own payments"
ON public.partner_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'shipping_partner'::app_role
    AND shipping_partner_id = partner_payments.partner_id
  )
);

CREATE POLICY "Partners can confirm their own payments"
ON public.partner_payments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'shipping_partner'::app_role
    AND shipping_partner_id = partner_payments.partner_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'shipping_partner'::app_role
    AND shipping_partner_id = partner_payments.partner_id
  )
);

-- RLS Policies for partner_payment_invoices
CREATE POLICY "Admins can manage all payment invoices"
ON public.partner_payment_invoices
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can view their payment invoices"
ON public.partner_payment_invoices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM partner_payments pp
    JOIN user_roles ur ON ur.shipping_partner_id = pp.partner_id
    WHERE pp.id = partner_payment_invoices.payment_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'shipping_partner'::app_role
  )
);

-- Create storage bucket for payment slips
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-payment-slips', 'partner-payment-slips', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage bucket
CREATE POLICY "Admins can upload payment slips"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'partner-payment-slips' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins and partners can view payment slips"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'partner-payment-slips' 
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 
      FROM partner_payments pp
      JOIN user_roles ur ON ur.shipping_partner_id = pp.partner_id
      WHERE pp.payment_slip_path = storage.objects.name
      AND ur.user_id = auth.uid()
      AND ur.role = 'shipping_partner'::app_role
    )
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_partner_payments_updated_at
BEFORE UPDATE ON public.partner_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_partner_payments_partner_id ON public.partner_payments(partner_id);
CREATE INDEX idx_partner_payments_status ON public.partner_payments(status);
CREATE INDEX idx_partner_payment_invoices_payment_id ON public.partner_payment_invoices(payment_id);
CREATE INDEX idx_partner_payment_invoices_shipment_id ON public.partner_payment_invoices(shipment_id);
CREATE INDEX idx_shipments_partner_payment_status ON public.shipments(partner_payment_status) WHERE partner_payment_status IS NOT NULL;