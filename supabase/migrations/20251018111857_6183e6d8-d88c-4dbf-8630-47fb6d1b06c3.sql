-- Create shipment_storage table to track stored shipments in WMS
CREATE TABLE IF NOT EXISTS public.shipment_storage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.wms_customers(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.wms_contracts(id) ON DELETE SET NULL,
  storage_request_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  storage_start_date TIMESTAMP WITH TIME ZONE,
  storage_end_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  storage_location TEXT,
  storage_notes TEXT,
  monthly_storage_fee NUMERIC(10, 3) DEFAULT 0,
  shipment_details JSONB, -- Store snapshot of shipment data
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(shipment_id)
);

-- Create index for faster queries
CREATE INDEX idx_shipment_storage_customer ON public.shipment_storage(customer_id);
CREATE INDEX idx_shipment_storage_contract ON public.shipment_storage(contract_id);
CREATE INDEX idx_shipment_storage_status ON public.shipment_storage(status);

-- Enable RLS
ALTER TABLE public.shipment_storage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all shipment storage"
  ON public.shipment_storage
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers can view their shipment storage"
  ON public.shipment_storage
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      JOIN public.shipment_requests sr ON sr.id = s.request_id
      WHERE s.id = shipment_storage.shipment_id
      AND sr.customer_id = auth.uid()
    )
  );

CREATE POLICY "Customers can request storage for their shipments"
  ON public.shipment_storage
  FOR INSERT
  WITH CHECK (
    requested_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.shipments s
      JOIN public.shipment_requests sr ON sr.id = s.request_id
      WHERE s.id = shipment_storage.shipment_id
      AND sr.customer_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_shipment_storage_updated_at
  BEFORE UPDATE ON public.shipment_storage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add audit logging
CREATE TRIGGER log_shipment_storage_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.shipment_storage
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_trail();