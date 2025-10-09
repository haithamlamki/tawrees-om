-- Ensure WMS customer users can be managed by customer owners/admins

-- Drop existing restrictive policies on wms_customer_users
DROP POLICY IF EXISTS "Users can view their own wms_customer_users row" ON public.wms_customer_users;
DROP POLICY IF EXISTS "Admins can manage WMS customer users" ON public.wms_customer_users;

-- Create comprehensive policies for wms_customer_users table

-- 1. Admins can manage all WMS customer users
CREATE POLICY "Admins can manage all WMS customer users"
ON public.wms_customer_users
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Customer owners/admins can view all users in their organization
CREATE POLICY "Customer admins can view org users"
ON public.wms_customer_users
FOR SELECT
TO authenticated
USING (
  -- User can see all members of their own customer organization
  customer_id IN (
    SELECT customer_id 
    FROM public.wms_customer_users 
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
  OR
  -- Or viewing their own record
  user_id = auth.uid()
);

-- 3. Customer owners/admins can insert new users for their organization
CREATE POLICY "Customer admins can add users to org"
ON public.wms_customer_users
FOR INSERT
TO authenticated
WITH CHECK (
  -- Can only add users to their own customer organization
  customer_id IN (
    SELECT customer_id 
    FROM public.wms_customer_users 
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

-- 4. Customer owners/admins can update users in their organization (except changing customer_id)
CREATE POLICY "Customer admins can update org users"
ON public.wms_customer_users
FOR UPDATE
TO authenticated
USING (
  customer_id IN (
    SELECT customer_id 
    FROM public.wms_customer_users 
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  customer_id IN (
    SELECT customer_id 
    FROM public.wms_customer_users 
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

-- 5. Customer owners/admins can remove users from their organization
CREATE POLICY "Customer admins can remove org users"
ON public.wms_customer_users
FOR DELETE
TO authenticated
USING (
  customer_id IN (
    SELECT customer_id 
    FROM public.wms_customer_users 
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
  AND role != 'owner' -- Cannot delete owners
);

-- Ensure wms_customer_branches policies allow customer admins to view/manage branches
DROP POLICY IF EXISTS "Customer users can view branches" ON public.wms_customer_branches;

CREATE POLICY "Customer users can view their branches"
ON public.wms_customer_branches
FOR SELECT
TO authenticated
USING (
  customer_id = public.user_wms_customer_id(auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Customer admins can manage branches"
ON public.wms_customer_branches
FOR ALL
TO authenticated
USING (
  customer_id IN (
    SELECT customer_id 
    FROM public.wms_customer_users 
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  customer_id IN (
    SELECT customer_id 
    FROM public.wms_customer_users 
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
  OR public.has_role(auth.uid(), 'admin')
);