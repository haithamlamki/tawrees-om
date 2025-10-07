-- Add quotes table for detailed breakdowns
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_request_id UUID REFERENCES public.shipment_requests(id) ON DELETE CASCADE,
  breakdown JSONB NOT NULL,
  total_sell_price DECIMAL(10,2) NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quotes for their requests"
  ON public.quotes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shipment_requests
      WHERE shipment_requests.id = quotes.shipment_request_id
      AND shipment_requests.customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all quotes"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage quotes"
  ON public.quotes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add items array to shipment_requests for multi-item support
ALTER TABLE public.shipment_requests 
  ADD COLUMN items JSONB DEFAULT '[]'::jsonb;