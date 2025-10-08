-- Create quality_checks table
CREATE TABLE IF NOT EXISTS public.quality_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  performed_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed', 'requires_review')),
  quantity_expected INTEGER,
  quantity_actual INTEGER,
  weight_expected NUMERIC,
  weight_actual NUMERIC,
  notes TEXT,
  qc_fee NUMERIC DEFAULT 0,
  performed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create qc_photos table for photo uploads
CREATE TABLE IF NOT EXISTS public.qc_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qc_id UUID NOT NULL REFERENCES public.quality_checks(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create qc_checklist table for pass/fail checks
CREATE TABLE IF NOT EXISTS public.qc_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qc_id UUID NOT NULL REFERENCES public.quality_checks(id) ON DELETE CASCADE,
  check_item TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'na')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_checklist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quality_checks
CREATE POLICY "Admins can manage all QC records"
  ON public.quality_checks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees can manage QC records"
  ON public.quality_checks FOR ALL
  USING (has_role(auth.uid(), 'employee'::app_role))
  WITH CHECK (has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Customers can view QC for own shipments"
  ON public.quality_checks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.shipments s
    JOIN public.shipment_requests sr ON sr.id = s.request_id
    WHERE s.id = quality_checks.shipment_id AND sr.customer_id = auth.uid()
  ));

-- RLS Policies for qc_photos
CREATE POLICY "Admins can manage all QC photos"
  ON public.qc_photos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees can manage QC photos"
  ON public.qc_photos FOR ALL
  USING (has_role(auth.uid(), 'employee'::app_role))
  WITH CHECK (has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Customers can view QC photos for own shipments"
  ON public.qc_photos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.quality_checks qc
    JOIN public.shipments s ON s.id = qc.shipment_id
    JOIN public.shipment_requests sr ON sr.id = s.request_id
    WHERE qc.id = qc_photos.qc_id AND sr.customer_id = auth.uid()
  ));

-- RLS Policies for qc_checklist
CREATE POLICY "Admins can manage all QC checklist items"
  ON public.qc_checklist FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees can manage QC checklist items"
  ON public.qc_checklist FOR ALL
  USING (has_role(auth.uid(), 'employee'::app_role))
  WITH CHECK (has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Customers can view QC checklist for own shipments"
  ON public.qc_checklist FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.quality_checks qc
    JOIN public.shipments s ON s.id = qc.shipment_id
    JOIN public.shipment_requests sr ON sr.id = s.request_id
    WHERE qc.id = qc_checklist.qc_id AND sr.customer_id = auth.uid()
  ));

-- Create trigger for updated_at
CREATE TRIGGER update_quality_checks_updated_at
  BEFORE UPDATE ON public.quality_checks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();