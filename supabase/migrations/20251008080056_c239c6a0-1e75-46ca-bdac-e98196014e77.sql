-- Add approval workflow to agreements table

-- Create approval status enum
CREATE TYPE public.approval_status AS ENUM ('pending_admin', 'pending_partner', 'approved', 'rejected');

-- Add approval fields to agreements table
ALTER TABLE public.agreements 
ADD COLUMN IF NOT EXISTS approval_status approval_status DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Update RLS policies for agreements to support approval workflow

-- Drop existing policies
DROP POLICY IF EXISTS "Partners can manage own agreements" ON public.agreements;
DROP POLICY IF EXISTS "Partners can view own agreements" ON public.agreements;

-- Partners can insert agreements (pending admin approval)
CREATE POLICY "Partners can create agreements"
ON public.agreements
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'shipping_partner') AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() 
    AND role = 'shipping_partner'
    AND shipping_partner_id = partner_id
  )
);

-- Partners can view agreements related to their partner_id
CREATE POLICY "Partners can view related agreements"
ON public.agreements
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'shipping_partner') AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() 
    AND role = 'shipping_partner'
    AND shipping_partner_id = partner_id
  )
);

-- Partners can approve agreements created by admin
CREATE POLICY "Partners can approve admin agreements"
ON public.agreements
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'shipping_partner') AND
  approval_status = 'pending_partner' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() 
    AND role = 'shipping_partner'
    AND shipping_partner_id = partner_id
  )
);

-- Admins can approve partner agreements
CREATE POLICY "Admins can approve partner agreements"
ON public.agreements
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin') AND
  (approval_status = 'pending_admin' OR approval_status = 'approved' OR approval_status = 'rejected')
);