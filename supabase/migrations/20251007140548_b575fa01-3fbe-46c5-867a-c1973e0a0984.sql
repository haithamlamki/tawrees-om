-- Step 2: Create shipping_partners table
CREATE TABLE IF NOT EXISTS public.shipping_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on shipping_partners
ALTER TABLE public.shipping_partners ENABLE ROW LEVEL SECURITY;

-- Admins can manage shipping partners
CREATE POLICY "Admins can manage shipping partners"
ON public.shipping_partners
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Partners can view their own company
CREATE POLICY "Partners can view own company"
ON public.shipping_partners
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role = 'shipping_partner'::app_role
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = auth.uid()
      AND ur2.role = 'shipping_partner'::app_role
    )
  )
);

-- Step 3: Add shipping_partner_id to user_roles
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS shipping_partner_id uuid REFERENCES public.shipping_partners(id) ON DELETE CASCADE;

-- Step 4: Add assigned_to and assigned_partner_id to shipments
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_partner_id uuid REFERENCES public.shipping_partners(id) ON DELETE SET NULL;

-- Step 5: Update shipments RLS policies for new roles

-- Employees can view assigned shipments
CREATE POLICY "Employees can view assigned shipments"
ON public.shipments
FOR SELECT
USING (
  has_role(auth.uid(), 'employee'::app_role) 
  AND assigned_to = auth.uid()
);

-- Employees can update assigned shipments
CREATE POLICY "Employees can update assigned shipments"
ON public.shipments
FOR UPDATE
USING (
  has_role(auth.uid(), 'employee'::app_role) 
  AND assigned_to = auth.uid()
);

-- Shipping partners can view their assigned shipments
CREATE POLICY "Partners can view assigned shipments"
ON public.shipments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role = 'shipping_partner'::app_role
    AND shipping_partner_id = shipments.assigned_partner_id
  )
);

-- Shipping partners can update their assigned shipments
CREATE POLICY "Partners can update assigned shipments"
ON public.shipments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role = 'shipping_partner'::app_role
    AND shipping_partner_id = shipments.assigned_partner_id
  )
);

-- Step 6: Update shipment_requests policies for accountants

-- Accountants can view all requests
CREATE POLICY "Accountants can view all requests"
ON public.shipment_requests
FOR SELECT
USING (has_role(auth.uid(), 'accountant'::app_role));

-- Step 7: Update payments policies for accountants

-- Accountants can view all payments
CREATE POLICY "Accountants can view all payments"
ON public.payments
FOR SELECT
USING (has_role(auth.uid(), 'accountant'::app_role));

-- Step 8: Update quotes policies for accountants

-- Accountants can view all quotes
CREATE POLICY "Accountants can view all quotes"
ON public.quotes
FOR SELECT
USING (has_role(auth.uid(), 'accountant'::app_role));

-- Step 9: Add trigger for shipping_partners updated_at
CREATE TRIGGER update_shipping_partners_updated_at
  BEFORE UPDATE ON public.shipping_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 10: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_shipping_partner ON public.user_roles(shipping_partner_id);
CREATE INDEX IF NOT EXISTS idx_shipments_assigned_to ON public.shipments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_shipments_assigned_partner ON public.shipments(assigned_partner_id);