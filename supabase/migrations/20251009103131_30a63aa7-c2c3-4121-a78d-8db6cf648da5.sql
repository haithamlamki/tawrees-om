-- Fix RLS infinite recursion and restore access for WMS modules

-- 1) Ensure RLS is enabled on relevant tables
ALTER TABLE IF EXISTS public.wms_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wms_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wms_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wms_customer_users ENABLE ROW LEVEL SECURITY;

-- 2) Drop ALL existing policies on the affected tables to remove recursive ones
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wms_customer_users'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.wms_customer_users', r.policyname);
  END LOOP;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wms_customers'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.wms_customers', r.policyname);
  END LOOP;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wms_contracts'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.wms_contracts', r.policyname);
  END LOOP;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wms_inventory'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.wms_inventory', r.policyname);
  END LOOP;
END $$;

-- 3) Recreate minimal, non-recursive policies
-- Note: has_role and user_wms_customer_id already exist as SECURITY DEFINER functions

-- wms_customer_users: Admin full access, users can view their own membership
CREATE POLICY "Admins can manage WMS customer users"
ON public.wms_customer_users
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own wms_customer_users row"
ON public.wms_customer_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- wms_customers: Admin manage all; customer users can view their own customer
CREATE POLICY "Admins can manage WMS customers"
ON public.wms_customers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customer users can view their WMS customer"
ON public.wms_customers
FOR SELECT
TO authenticated
USING (id = public.user_wms_customer_id(auth.uid()));

-- wms_contracts: Admin manage all; customer users can view own contracts
CREATE POLICY "Admins can manage WMS contracts"
ON public.wms_contracts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customer users can view own WMS contracts"
ON public.wms_contracts
FOR SELECT
TO authenticated
USING (customer_id = public.user_wms_customer_id(auth.uid()));

-- wms_inventory: Admin manage all; customer users can view own inventory
CREATE POLICY "Admins can manage WMS inventory"
ON public.wms_inventory
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customer users can view own WMS inventory"
ON public.wms_inventory
FOR SELECT
TO authenticated
USING (customer_id = public.user_wms_customer_id(auth.uid()));
