-- Create suppliers table
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  supplier_code TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add trigger for updated_at
CREATE TRIGGER update_suppliers_updated_at 
  BEFORE UPDATE ON suppliers 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Admins can manage suppliers
CREATE POLICY "Admins can manage suppliers" ON suppliers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view active suppliers
CREATE POLICY "Authenticated users can view suppliers" ON suppliers
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- Add supplier_id to shipment_requests
ALTER TABLE shipment_requests 
ADD COLUMN supplier_id UUID REFERENCES suppliers(id),
ADD COLUMN supplier_notes TEXT;

-- Add index for faster lookups
CREATE INDEX idx_shipment_requests_supplier_id ON shipment_requests(supplier_id);