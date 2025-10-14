-- Step 1: Create security definer function to check WMS customer roles without RLS recursion
CREATE OR REPLACE FUNCTION public.has_wms_customer_role(
  _user_id uuid, 
  _customer_id uuid, 
  _required_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wms_customer_users
    WHERE user_id = _user_id
      AND customer_id = _customer_id
      AND role = ANY(_required_roles)
  )
$$;

-- Step 2: Drop existing policies on wms_customer_users
DROP POLICY IF EXISTS "Admins can manage all WMS customer users" ON public.wms_customer_users;
DROP POLICY IF EXISTS "Users can view their own wms_customer_users row" ON public.wms_customer_users;

-- Step 3: Create comprehensive RLS policies for wms_customer_users

-- SELECT: Users can view their own record, or all users in their customer if they are owner/admin
CREATE POLICY "Users can view wms_customer_users"
ON public.wms_customer_users
FOR SELECT
USING (
  auth.uid() = user_id  -- Own record
  OR has_role(auth.uid(), 'admin'::app_role)  -- System admin
  OR has_wms_customer_role(auth.uid(), customer_id, ARRAY['owner', 'admin'])  -- Customer owner/admin
);

-- INSERT: System admins or customer owners/admins can create users
CREATE POLICY "Authorized users can create wms_customer_users"
ON public.wms_customer_users
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)  -- System admin
  OR has_wms_customer_role(auth.uid(), customer_id, ARRAY['owner', 'admin'])  -- Customer owner/admin
);

-- UPDATE: System admins or customer owners/admins can update users (cannot demote other owners)
CREATE POLICY "Authorized users can update wms_customer_users"
ON public.wms_customer_users
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)  -- System admin can update anything
  OR (
    has_wms_customer_role(auth.uid(), customer_id, ARRAY['owner', 'admin'])  -- Customer owner/admin
    AND NOT (role = 'owner' AND user_id != auth.uid())  -- Cannot demote other owners
  )
);

-- DELETE: System admins or customer owners/admins can delete users (except owners)
CREATE POLICY "Authorized users can delete wms_customer_users"
ON public.wms_customer_users
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)  -- System admin can delete anything
  OR (
    has_wms_customer_role(auth.uid(), customer_id, ARRAY['owner', 'admin'])  -- Customer owner/admin
    AND role != 'owner'  -- Cannot delete owners
  )
);

-- Step 4: Update RLS policies on wms_customer_branches for consistency

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all customer branches" ON public.wms_customer_branches;
DROP POLICY IF EXISTS "Customer users can view their branches" ON public.wms_customer_branches;

-- SELECT: Users can view branches in their customer organization
CREATE POLICY "Users can view wms_customer_branches"
ON public.wms_customer_branches
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)  -- System admin
  OR has_wms_customer_role(auth.uid(), customer_id, ARRAY['owner', 'admin', 'employee', 'accountant', 'viewer'])  -- Any customer user
);

-- INSERT: System admins or customer owners/admins can create branches
CREATE POLICY "Authorized users can create wms_customer_branches"
ON public.wms_customer_branches
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)  -- System admin
  OR has_wms_customer_role(auth.uid(), customer_id, ARRAY['owner', 'admin'])  -- Customer owner/admin
);

-- UPDATE: System admins or customer owners/admins can update branches
CREATE POLICY "Authorized users can update wms_customer_branches"
ON public.wms_customer_branches
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)  -- System admin
  OR has_wms_customer_role(auth.uid(), customer_id, ARRAY['owner', 'admin'])  -- Customer owner/admin
);

-- DELETE: System admins or customer owners/admins can delete branches
CREATE POLICY "Authorized users can delete wms_customer_branches"
ON public.wms_customer_branches
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)  -- System admin
  OR has_wms_customer_role(auth.uid(), customer_id, ARRAY['owner', 'admin'])  -- Customer owner/admin
);