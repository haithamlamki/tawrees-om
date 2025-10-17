-- Drop existing restrictive partner policies
DROP POLICY IF EXISTS "Partners can create agreements" ON public.agreements;
DROP POLICY IF EXISTS "Partners can approve admin agreements" ON public.agreements;

-- Create comprehensive policy for partners to manage their own agreements
CREATE POLICY "Partners can manage own agreements"
ON public.agreements
FOR ALL
USING (
  has_role(auth.uid(), 'shipping_partner'::app_role) 
  AND partner_id IN (
    SELECT shipping_partner_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'shipping_partner'::app_role
  )
)
WITH CHECK (
  has_role(auth.uid(), 'shipping_partner'::app_role)
  AND partner_id IN (
    SELECT shipping_partner_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'shipping_partner'::app_role
  )
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_agreements_partner_active 
ON public.agreements(partner_id, active) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_agreements_origin_dest_type 
ON public.agreements(origin_id, destination_id, rate_type, active) 
WHERE active = true;

-- Add index for approval status filtering
CREATE INDEX IF NOT EXISTS idx_agreements_approval_status
ON public.agreements(approval_status, active);