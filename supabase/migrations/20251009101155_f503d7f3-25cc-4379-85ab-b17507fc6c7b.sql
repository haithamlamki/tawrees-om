-- Drop the problematic policies first
DROP POLICY IF EXISTS "Customer users can view their WMS customer" ON wms_customers;
DROP POLICY IF EXISTS "Customer users can view their WMS contracts" ON wms_contracts;
DROP POLICY IF EXISTS "Customer users can view their WMS inventory" ON wms_inventory;

-- Create security definer function to check WMS customer access without recursion
CREATE OR REPLACE FUNCTION public.user_wms_customer_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT customer_id
  FROM public.wms_customer_users
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- Recreate customer user policies with the security definer function
CREATE POLICY "Customer users can view their WMS customer"
ON wms_customers FOR SELECT
TO authenticated
USING (
  id = user_wms_customer_id(auth.uid())
);

CREATE POLICY "Customer users can view their WMS contracts"
ON wms_contracts FOR SELECT
TO authenticated
USING (
  customer_id = user_wms_customer_id(auth.uid())
);

CREATE POLICY "Customer users can view their WMS inventory"
ON wms_inventory FOR SELECT
TO authenticated
USING (
  customer_id = user_wms_customer_id(auth.uid())
);