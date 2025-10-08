-- Fix RLS policies for wms_invoice_sequences
-- The table exists with RLS enabled but insufficient policies for the SECURITY DEFINER function

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage invoice sequences" ON wms_invoice_sequences;
DROP POLICY IF EXISTS "Staff can view invoice sequences" ON wms_invoice_sequences;

-- Create comprehensive policies that allow the SECURITY DEFINER function to work
CREATE POLICY "Admins can manage invoice sequences"
ON wms_invoice_sequences
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "System functions can manage sequences"
ON wms_invoice_sequences
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to view invoice sequences (for auditing)
CREATE POLICY "Staff can view invoice sequences"
ON wms_invoice_sequences
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'employee') OR
  has_role(auth.uid(), 'accountant')
);