-- Fix recursive RLS on wms_customer_users and restore access for customer owners
-- 1) Drop problematic policies that referenced the same table and caused recursion
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'wms_customer_users' AND policyname = 'Customer admins can view org users'
  ) THEN
    EXECUTE 'DROP POLICY "Customer admins can view org users" ON public.wms_customer_users';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'wms_customer_users' AND policyname = 'Customer admins can add users to org'
  ) THEN
    EXECUTE 'DROP POLICY "Customer admins can add users to org" ON public.wms_customer_users';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'wms_customer_users' AND policyname = 'Customer admins can update org users'
  ) THEN
    EXECUTE 'DROP POLICY "Customer admins can update org users" ON public.wms_customer_users';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'wms_customer_users' AND policyname = 'Customer admins can remove org users'
  ) THEN
    EXECUTE 'DROP POLICY "Customer admins can remove org users" ON public.wms_customer_users';
  END IF;

  -- Keep existing admin policy if present, we will recreate to be safe
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'wms_customer_users' AND policyname = 'Admins can manage all WMS customer users'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can manage all WMS customer users" ON public.wms_customer_users';
  END IF;

  -- Also (re)drop the own-row policy to ensure a clean slate
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'wms_customer_users' AND policyname = 'Users can view their own wms_customer_users row'
  ) THEN
    EXECUTE 'DROP POLICY "Users can view their own wms_customer_users row" ON public.wms_customer_users';
  END IF;
END $$;

-- 2) Create minimal, non-recursive policies
-- Allow any authenticated user to view their own membership row
CREATE POLICY "Users can view their own wms_customer_users row"
ON public.wms_customer_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow system admins to fully manage wms_customer_users
CREATE POLICY "Admins can manage all WMS customer users"
ON public.wms_customer_users
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- NOTE: We intentionally avoid policies that read from wms_customer_users inside USING/WITH CHECK
-- to prevent infinite recursion. Customer-org-wide management will be handled in a follow-up change
-- via a safe function or backend function enforcing role checks.