-- Create rate history table to track changes over time
CREATE TABLE public.rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL CHECK (table_name IN ('agreements', 'shipping_rates', 'surcharges', 'last_mile_rates')),
  record_id uuid NOT NULL,
  version_number integer NOT NULL,
  change_type text NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted', 'activated', 'deactivated')),
  changed_by uuid REFERENCES auth.users(id),
  changed_by_email text,
  changed_at timestamp with time zone DEFAULT now(),
  old_values jsonb,
  new_values jsonb,
  change_reason text,
  created_at timestamp with time zone DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_rate_history_table_record ON public.rate_history(table_name, record_id);
CREATE INDEX idx_rate_history_changed_at ON public.rate_history(changed_at DESC);
CREATE INDEX idx_rate_history_changed_by ON public.rate_history(changed_by);

-- Enable RLS
ALTER TABLE public.rate_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can view all rate history"
ON public.rate_history
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners can view own rate history"
ON public.rate_history
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'shipping_partner') AND
  (
    -- For agreements, check if it's their partner's agreement
    (table_name = 'agreements' AND EXISTS (
      SELECT 1 FROM agreements a 
      INNER JOIN user_roles ur ON ur.shipping_partner_id = a.partner_id
      WHERE a.id = record_id AND ur.user_id = auth.uid()
    ))
    OR
    -- For other tables, allow if they have shipping_partner role
    table_name != 'agreements'
  )
);

-- Function to log rate changes
CREATE OR REPLACE FUNCTION public.log_rate_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_email text;
  v_change_type text;
  v_version_number integer;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  
  -- Determine change type
  IF TG_OP = 'INSERT' THEN
    v_change_type := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.active IS DISTINCT FROM NEW.active THEN
      v_change_type := CASE WHEN NEW.active THEN 'activated' ELSE 'deactivated' END;
    ELSE
      v_change_type := 'updated';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_change_type := 'deleted';
  END IF;
  
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 
  INTO v_version_number
  FROM public.rate_history
  WHERE table_name = TG_TABLE_NAME AND record_id = COALESCE(NEW.id, OLD.id);
  
  -- Insert rate history record
  INSERT INTO public.rate_history (
    table_name,
    record_id,
    version_number,
    change_type,
    changed_by,
    changed_by_email,
    old_values,
    new_values
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    v_version_number,
    v_change_type,
    auth.uid(),
    v_user_email,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add triggers for rate tracking
CREATE TRIGGER track_agreement_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.agreements
  FOR EACH ROW EXECUTE FUNCTION public.log_rate_change();

CREATE TRIGGER track_shipping_rate_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.shipping_rates
  FOR EACH ROW EXECUTE FUNCTION public.log_rate_change();

CREATE TRIGGER track_surcharge_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.surcharges
  FOR EACH ROW EXECUTE FUNCTION public.log_rate_change();

CREATE TRIGGER track_last_mile_rate_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.last_mile_rates
  FOR EACH ROW EXECUTE FUNCTION public.log_rate_change();