-- Create surcharge types enum
CREATE TYPE public.surcharge_type AS ENUM (
  'fuel',
  'handling',
  'customs',
  'insurance',
  'qc',
  'storage',
  'demurrage',
  'documentation',
  'other'
);

-- Create surcharges table for configurable surcharges
CREATE TABLE public.surcharges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.surcharge_type NOT NULL,
  amount NUMERIC NOT NULL,
  is_percentage BOOLEAN NOT NULL DEFAULT false,
  origin_id UUID REFERENCES public.origins(id),
  destination_id UUID REFERENCES public.destinations(id),
  rate_type public.rate_type,
  active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_to TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shipment surcharges junction table for per-shipment overrides
CREATE TABLE public.shipment_surcharges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_request_id UUID NOT NULL REFERENCES public.shipment_requests(id) ON DELETE CASCADE,
  surcharge_id UUID REFERENCES public.surcharges(id),
  name TEXT NOT NULL,
  type public.surcharge_type NOT NULL,
  amount NUMERIC NOT NULL,
  is_percentage BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add margin override fields to quotes
ALTER TABLE public.quotes
ADD COLUMN margin_override_percentage NUMERIC,
ADD COLUMN margin_override_by UUID REFERENCES auth.users(id),
ADD COLUMN margin_override_reason TEXT,
ADD COLUMN margin_override_at TIMESTAMP WITH TIME ZONE;

-- Add invoice status tracking fields to quotes
ALTER TABLE public.quotes
ADD COLUMN status TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN viewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN payment_due_date TIMESTAMP WITH TIME ZONE;

-- Create audit logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_surcharges_lane ON public.surcharges(origin_id, destination_id, rate_type) WHERE active = true;
CREATE INDEX idx_shipment_surcharges_request ON public.shipment_surcharges(shipment_request_id);
CREATE INDEX idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.surcharges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_surcharges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for surcharges
CREATE POLICY "Admins can manage surcharges"
ON public.surcharges FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can view surcharges"
ON public.surcharges FOR SELECT
USING (has_role(auth.uid(), 'shipping_partner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone authenticated can view active surcharges"
ON public.surcharges FOR SELECT
USING (active = true AND auth.uid() IS NOT NULL);

-- RLS Policies for shipment_surcharges
CREATE POLICY "Admins can manage shipment surcharges"
ON public.shipment_surcharges FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers can view own shipment surcharges"
ON public.shipment_surcharges FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shipment_requests
    WHERE shipment_requests.id = shipment_surcharges.shipment_request_id
    AND shipment_requests.customer_id = auth.uid()
  )
);

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view logs related to their actions"
ON public.audit_logs FOR SELECT
USING (user_id = auth.uid());

-- Trigger for surcharges updated_at
CREATE TRIGGER update_surcharges_updated_at
BEFORE UPDATE ON public.surcharges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to log audit trail
CREATE OR REPLACE FUNCTION public.log_audit_trail()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
  v_changed_fields TEXT[];
BEGIN
  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  
  -- Determine changed fields for UPDATE
  IF TG_OP = 'UPDATE' THEN
    SELECT ARRAY_AGG(key)
    INTO v_changed_fields
    FROM jsonb_each(to_jsonb(NEW))
    WHERE to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key;
  END IF;
  
  -- Insert audit log
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_fields,
    user_id,
    user_email
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    v_changed_fields,
    auth.uid(),
    v_user_email
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add audit triggers to critical tables
CREATE TRIGGER audit_agreements
AFTER INSERT OR UPDATE OR DELETE ON public.agreements
FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_quotes
AFTER INSERT OR UPDATE OR DELETE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_shipments
AFTER INSERT OR UPDATE OR DELETE ON public.shipments
FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_payments
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

CREATE TRIGGER audit_surcharges
AFTER INSERT OR UPDATE OR DELETE ON public.surcharges
FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();