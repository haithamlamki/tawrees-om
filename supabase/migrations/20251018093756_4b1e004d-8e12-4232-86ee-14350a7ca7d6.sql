-- Allow shipping partners to update status on assigned shipments
-- Ensure RLS is enabled on shipments table
ALTER TABLE IF EXISTS public.shipments ENABLE ROW LEVEL SECURITY;

-- Create policy for shipping partners to UPDATE assigned shipments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'shipments' AND policyname = 'Partners can update assigned shipments'
  ) THEN
    CREATE POLICY "Partners can update assigned shipments"
    ON public.shipments
    FOR UPDATE
    USING (
      has_role(auth.uid(), 'shipping_partner'::app_role)
      AND assigned_partner_id IN (
        SELECT ur.shipping_partner_id
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'shipping_partner'::app_role
      )
    )
    WITH CHECK (
      has_role(auth.uid(), 'shipping_partner'::app_role)
      AND assigned_partner_id IN (
        SELECT ur.shipping_partner_id
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'shipping_partner'::app_role
      )
    );
  END IF;
END $$;

-- Optional: allow partners to view shipments they are assigned to (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'shipments' AND policyname = 'Partners can view assigned shipments'
  ) THEN
    CREATE POLICY "Partners can view assigned shipments"
    ON public.shipments
    FOR SELECT
    USING (
      has_role(auth.uid(), 'shipping_partner'::app_role)
      AND assigned_partner_id IN (
        SELECT ur.shipping_partner_id
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'shipping_partner'::app_role
      )
    );
  END IF;
END $$;
