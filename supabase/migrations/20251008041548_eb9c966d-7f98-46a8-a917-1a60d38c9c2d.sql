-- Add delivery options to shipment_requests
ALTER TABLE public.shipment_requests
ADD COLUMN delivery_type text CHECK (delivery_type IN ('pickup', 'door_delivery')) DEFAULT 'pickup',
ADD COLUMN delivery_address text,
ADD COLUMN delivery_city text,
ADD COLUMN delivery_postal_code text,
ADD COLUMN delivery_country text,
ADD COLUMN delivery_contact_name text,
ADD COLUMN delivery_contact_phone text,
ADD COLUMN last_mile_fee numeric DEFAULT 0,
ADD COLUMN requested_delivery_date timestamp with time zone,
ADD COLUMN actual_delivery_date timestamp with time zone,
ADD COLUMN delivery_notes text;

-- Add delivery confirmation to shipments
ALTER TABLE public.shipments
ADD COLUMN delivery_confirmed boolean DEFAULT false,
ADD COLUMN delivery_confirmed_by uuid REFERENCES auth.users(id),
ADD COLUMN delivery_confirmed_at timestamp with time zone,
ADD COLUMN delivery_signature_url text,
ADD COLUMN delivery_photo_url text;

-- Add last-mile rates table
CREATE TABLE public.last_mile_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id uuid REFERENCES public.destinations(id) ON DELETE CASCADE,
  city text,
  base_fee numeric NOT NULL,
  per_cbm_fee numeric DEFAULT 0,
  per_kg_fee numeric DEFAULT 0,
  active boolean DEFAULT true,
  valid_from timestamp with time zone DEFAULT now(),
  valid_to timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on last_mile_rates
ALTER TABLE public.last_mile_rates ENABLE ROW LEVEL SECURITY;

-- RLS policies for last_mile_rates
CREATE POLICY "Admins can manage last mile rates"
ON public.last_mile_rates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone authenticated can view active last mile rates"
ON public.last_mile_rates
FOR SELECT
TO authenticated
USING (active = true);

-- Add audit trigger for last_mile_rates
CREATE TRIGGER audit_last_mile_rates
  AFTER INSERT OR UPDATE OR DELETE ON public.last_mile_rates
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

-- Add audit trigger for delivery updates on shipment_requests
CREATE TRIGGER audit_shipment_requests
  AFTER INSERT OR UPDATE OR DELETE ON public.shipment_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();

-- Add audit trigger for delivery confirmations on shipments
CREATE TRIGGER audit_shipments_delivery
  AFTER INSERT OR UPDATE OR DELETE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();