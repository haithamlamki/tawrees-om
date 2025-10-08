-- Create wms_drivers table
CREATE TABLE IF NOT EXISTS public.wms_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  license_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  vehicle_plate TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add delivery tracking fields to wms_orders
ALTER TABLE public.wms_orders 
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.wms_drivers(id),
ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
ADD COLUMN IF NOT EXISTS delivery_proof_photo TEXT,
ADD COLUMN IF NOT EXISTS delivery_signature TEXT,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE public.wms_drivers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wms_drivers
CREATE POLICY "Admins can manage drivers"
  ON public.wms_drivers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Employees can view drivers"
  ON public.wms_drivers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('employee', 'admin')
    )
  );

-- Create storage bucket for delivery proofs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('wms-delivery-proofs', 'wms-delivery-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for delivery proofs
CREATE POLICY "Admins and employees can upload delivery proofs"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'wms-delivery-proofs' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'employee')
    )
  );

CREATE POLICY "Admins and employees can view delivery proofs"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'wms-delivery-proofs' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'employee')
    )
  );