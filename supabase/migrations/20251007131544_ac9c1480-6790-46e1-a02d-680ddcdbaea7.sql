-- Phase 4: Shipment Tracking & Status Updates
-- Create shipment status history table
CREATE TABLE public.shipment_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  status text NOT NULL,
  location text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on shipment status history
ALTER TABLE public.shipment_status_history ENABLE ROW LEVEL SECURITY;

-- Allow public to view shipment status history (for public tracking)
CREATE POLICY "Anyone can view shipment status history"
ON public.shipment_status_history
FOR SELECT
USING (true);

-- Admins can manage status history
CREATE POLICY "Admins can manage shipment status history"
ON public.shipment_status_history
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add actual delivery date to shipments
ALTER TABLE public.shipments
ADD COLUMN actual_delivery timestamp with time zone,
ADD COLUMN current_location text;

-- Create trigger to automatically add status history when shipment status changes
CREATE OR REPLACE FUNCTION public.track_shipment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only insert if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR TG_OP = 'INSERT' THEN
    INSERT INTO public.shipment_status_history (shipment_id, status, location, notes, created_by)
    VALUES (NEW.id, NEW.status, NEW.current_location, NEW.notes, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER shipment_status_change_trigger
AFTER INSERT OR UPDATE ON public.shipments
FOR EACH ROW
EXECUTE FUNCTION public.track_shipment_status_change();

-- Enable realtime for shipments table
ALTER TABLE public.shipments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;

-- Enable realtime for shipment status history
ALTER TABLE public.shipment_status_history REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipment_status_history;