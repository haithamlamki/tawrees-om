-- Update RLS policies for suppliers table to allow customers and partners access
DROP POLICY IF EXISTS "Authenticated users can view active suppliers" ON public.suppliers;

-- Customers can view all active suppliers
CREATE POLICY "Customers can view active suppliers"
ON public.suppliers
FOR SELECT
TO authenticated
USING (is_active = true);

-- Create supplier_requests table for customer-submitted supplier suggestions
CREATE TABLE IF NOT EXISTS public.supplier_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on supplier_requests
ALTER TABLE public.supplier_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for supplier_requests
CREATE POLICY "Users can view own supplier requests"
ON public.supplier_requests
FOR SELECT
TO authenticated
USING (auth.uid() = customer_id);

CREATE POLICY "Users can create supplier requests"
ON public.supplier_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can view all supplier requests"
ON public.supplier_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update supplier requests"
ON public.supplier_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_supplier_requests_updated_at
BEFORE UPDATE ON public.supplier_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_supplier_requests_customer_id ON public.supplier_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_supplier_requests_status ON public.supplier_requests(status);