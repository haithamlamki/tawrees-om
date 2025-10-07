-- Phase 6: Document Management & File Uploads
-- Create storage buckets for shipment documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shipment-documents',
  'shipment-documents',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Create documents table to track uploaded files
CREATE TABLE public.shipment_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_request_id uuid NOT NULL REFERENCES public.shipment_requests(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  document_type text NOT NULL, -- commercial_invoice, packing_list, customs_declaration, etc.
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on shipment documents
ALTER TABLE public.shipment_documents ENABLE ROW LEVEL SECURITY;

-- Customers can view and upload documents for their own shipments
CREATE POLICY "Customers can view own shipment documents"
ON public.shipment_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shipment_requests
    WHERE shipment_requests.id = shipment_documents.shipment_request_id
    AND shipment_requests.customer_id = auth.uid()
  )
);

CREATE POLICY "Customers can upload documents for own shipments"
ON public.shipment_documents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shipment_requests
    WHERE shipment_requests.id = shipment_documents.shipment_request_id
    AND shipment_requests.customer_id = auth.uid()
  )
  AND uploaded_by = auth.uid()
);

-- Admins can manage all documents
CREATE POLICY "Admins can view all documents"
ON public.shipment_documents
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can upload documents"
ON public.shipment_documents
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete documents"
ON public.shipment_documents
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for shipment documents bucket
CREATE POLICY "Customers can view own shipment documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'shipment-documents' AND
  (
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  )
);

CREATE POLICY "Customers can upload documents to own folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'shipment-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can manage all documents"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'shipment-documents' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_shipment_documents_updated_at
BEFORE UPDATE ON public.shipment_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();