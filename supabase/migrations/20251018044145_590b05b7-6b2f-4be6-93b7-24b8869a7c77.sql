-- Create enum for partner quote status
CREATE TYPE partner_quote_status AS ENUM ('draft', 'submitted', 'customer_approved', 'customer_rejected');

-- Create enum for document request status
CREATE TYPE document_request_status AS ENUM ('pending', 'uploaded', 'approved');

-- Create partner_shipping_quotes table
CREATE TABLE public.partner_shipping_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  original_amount NUMERIC(15,3) NOT NULL,
  partner_quoted_amount NUMERIC(15,3) NOT NULL,
  adjustment_reason TEXT,
  storage_location TEXT,
  estimated_delivery_days INTEGER,
  shipping_details JSONB DEFAULT '{}'::jsonb,
  status partner_quote_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMP WITH TIME ZONE,
  partner_user_id UUID REFERENCES auth.users(id),
  customer_notes TEXT,
  customer_responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create partner_document_requests table
CREATE TABLE public.partner_document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.partner_shipping_quotes(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  status document_request_status NOT NULL DEFAULT 'pending',
  uploaded_file_path TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add columns to shipments table
ALTER TABLE public.shipments 
ADD COLUMN partner_quote_id UUID REFERENCES public.partner_shipping_quotes(id),
ADD COLUMN final_agreed_amount NUMERIC(15,3),
ADD COLUMN customer_approved_quote_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on new tables
ALTER TABLE public.partner_shipping_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_document_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partner_shipping_quotes
CREATE POLICY "Admins can manage all quotes"
ON public.partner_shipping_quotes
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can manage quotes for assigned shipments"
ON public.partner_shipping_quotes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shipments s
    JOIN public.user_roles ur ON ur.user_id = auth.uid() 
      AND ur.role = 'shipping_partner'::app_role
      AND ur.shipping_partner_id = s.assigned_partner_id
    WHERE s.id = partner_shipping_quotes.shipment_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shipments s
    JOIN public.user_roles ur ON ur.user_id = auth.uid() 
      AND ur.role = 'shipping_partner'::app_role
      AND ur.shipping_partner_id = s.assigned_partner_id
    WHERE s.id = partner_shipping_quotes.shipment_id
  )
);

CREATE POLICY "Customers can view quotes for own shipments"
ON public.partner_shipping_quotes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shipments s
    JOIN public.shipment_requests sr ON sr.id = s.request_id
    WHERE s.id = partner_shipping_quotes.shipment_id 
      AND sr.customer_id = auth.uid()
  )
);

CREATE POLICY "Customers can update quote status"
ON public.partner_shipping_quotes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shipments s
    JOIN public.shipment_requests sr ON sr.id = s.request_id
    WHERE s.id = partner_shipping_quotes.shipment_id 
      AND sr.customer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shipments s
    JOIN public.shipment_requests sr ON sr.id = s.request_id
    WHERE s.id = partner_shipping_quotes.shipment_id 
      AND sr.customer_id = auth.uid()
  )
);

-- RLS Policies for partner_document_requests
CREATE POLICY "Admins can manage all document requests"
ON public.partner_document_requests
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can manage document requests for their quotes"
ON public.partner_document_requests
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.partner_shipping_quotes psq
    JOIN public.shipments s ON s.id = psq.shipment_id
    JOIN public.user_roles ur ON ur.user_id = auth.uid() 
      AND ur.role = 'shipping_partner'::app_role
      AND ur.shipping_partner_id = s.assigned_partner_id
    WHERE psq.id = partner_document_requests.quote_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.partner_shipping_quotes psq
    JOIN public.shipments s ON s.id = psq.shipment_id
    JOIN public.user_roles ur ON ur.user_id = auth.uid() 
      AND ur.role = 'shipping_partner'::app_role
      AND ur.shipping_partner_id = s.assigned_partner_id
    WHERE psq.id = partner_document_requests.quote_id
  )
);

CREATE POLICY "Customers can view and upload documents for their quotes"
ON public.partner_document_requests
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.partner_shipping_quotes psq
    JOIN public.shipments s ON s.id = psq.shipment_id
    JOIN public.shipment_requests sr ON sr.id = s.request_id
    WHERE psq.id = partner_document_requests.quote_id 
      AND sr.customer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.partner_shipping_quotes psq
    JOIN public.shipments s ON s.id = psq.shipment_id
    JOIN public.shipment_requests sr ON sr.id = s.request_id
    WHERE psq.id = partner_document_requests.quote_id 
      AND sr.customer_id = auth.uid()
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_partner_quotes_updated_at
BEFORE UPDATE ON public.partner_shipping_quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partner_document_requests_updated_at
BEFORE UPDATE ON public.partner_document_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_partner_quotes_shipment ON public.partner_shipping_quotes(shipment_id);
CREATE INDEX idx_partner_quotes_status ON public.partner_shipping_quotes(status);
CREATE INDEX idx_document_requests_quote ON public.partner_document_requests(quote_id);
CREATE INDEX idx_shipments_partner_quote ON public.shipments(partner_quote_id);