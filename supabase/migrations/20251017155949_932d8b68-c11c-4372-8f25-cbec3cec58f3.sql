-- Ensure admins can manage shipping rates via RLS
DO $$ BEGIN
  -- Enable RLS if not already enabled
  EXECUTE 'ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN others THEN
  -- ignore if already enabled or table missing
  NULL;
END $$;

-- Drop existing overly restrictive policies with same names if they exist
DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='shipping_rates' AND policyname='Admins can manage shipping rates';
  IF FOUND THEN
    EXECUTE 'DROP POLICY "Admins can manage shipping rates" ON public.shipping_rates';
  END IF;
END $$;

-- Allow admins full access
CREATE POLICY "Admins can manage shipping rates"
ON public.shipping_rates
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ensure authenticated users can view active rates if needed by other pages
DO $$ BEGIN
  PERFORM 1 FROM pg_policies WHERE schemaname='public' AND tablename='shipping_rates' AND policyname='Anyone can view active shipping rates';
  IF NOT FOUND THEN
    CREATE POLICY "Anyone can view active shipping rates"
    ON public.shipping_rates
    FOR SELECT
    USING (is_active = true);
  END IF;
END $$;