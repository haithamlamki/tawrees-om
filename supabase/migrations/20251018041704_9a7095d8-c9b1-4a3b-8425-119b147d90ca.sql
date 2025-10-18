-- Fix recursive RLS by introducing SECURITY DEFINER helpers and updating policies
-- 1) Helper functions (non-recursive)
CREATE OR REPLACE FUNCTION public.can_partner_view_shipment(_user_id uuid, _shipment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shipments s
    JOIN public.user_roles ur
      ON ur.user_id = _user_id
     AND ur.role = 'shipping_partner'::app_role
     AND ur.shipping_partner_id = s.assigned_partner_id
    WHERE s.id = _shipment_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_partner_view_request(_user_id uuid, _request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shipments s
    JOIN public.user_roles ur
      ON ur.user_id = _user_id
     AND ur.role = 'shipping_partner'::app_role
     AND ur.shipping_partner_id = s.assigned_partner_id
    WHERE s.request_id = _request_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_request_owned_by_user(_user_id uuid, _request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shipment_requests sr
    WHERE sr.id = _request_id AND sr.customer_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_partner_view_profile(_user_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shipment_requests sr
    JOIN public.shipments s ON s.request_id = sr.id
    JOIN public.user_roles ur
      ON ur.user_id = _user_id
     AND ur.role = 'shipping_partner'::app_role
     AND ur.shipping_partner_id = s.assigned_partner_id
    WHERE sr.customer_id = _profile_id
  );
$$;

-- 2) Update policies to use helpers (drop old recursive ones if present)
-- Shipments: customer view policy (avoid referencing shipment_requests directly)
DROP POLICY IF EXISTS "Customers can view shipments for their requests" ON public.shipments;
CREATE POLICY "Customers can view shipments for their requests (non-recursive)"
ON public.shipments
FOR SELECT
USING (public.is_request_owned_by_user(auth.uid(), request_id));

-- Shipments: partner view policy
DROP POLICY IF EXISTS "Partners can view assigned shipments" ON public.shipments;
CREATE POLICY "Partners can view assigned shipments (non-recursive)"
ON public.shipments
FOR SELECT
USING (public.can_partner_view_shipment(auth.uid(), id));

-- Shipment requests: partner view policy
DROP POLICY IF EXISTS "Partners can view assigned shipment requests" ON public.shipment_requests;
CREATE POLICY "Partners can view assigned shipment requests (non-recursive)"
ON public.shipment_requests
FOR SELECT
USING (public.can_partner_view_request(auth.uid(), id));

-- Profiles: partner view policy (avoid cross-table references)
DROP POLICY IF EXISTS "Partners can view customer profiles for assigned shipments" ON public.profiles;
CREATE POLICY "Partners can view customer profiles for assigned shipments (non-recursive)"
ON public.profiles
FOR SELECT
USING (public.can_partner_view_profile(auth.uid(), id));

-- 3) Ensure partners can read their own company record to load dashboard header
DO $$ BEGIN
  PERFORM 1 FROM information_schema.tables 
   WHERE table_schema='public' AND table_name='shipping_partners';
  IF FOUND THEN
    ALTER TABLE public.shipping_partners ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Partners can view own partner record" ON public.shipping_partners;
    CREATE POLICY "Partners can view own partner record"
    ON public.shipping_partners
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role = 'shipping_partner'::app_role
          AND ur.shipping_partner_id = shipping_partners.id
      )
      OR public.has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;
END $$;
