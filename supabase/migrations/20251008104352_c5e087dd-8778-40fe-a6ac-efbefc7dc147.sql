-- Phase 0.2: WMS Database Schema & Security (Part 2)
-- Creates all WMS tables, RLS policies, storage buckets, and audit integration

-- ============================================================================
-- STEP 1: Integration Fields for Existing Tables
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wms_customer_id UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS module TEXT DEFAULT 'system' CHECK (module IN ('shipping', 'wms', 'system'));

-- ============================================================================
-- STEP 2: Create WMS Core Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS wms_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  customer_code TEXT UNIQUE NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wms_customer_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES wms_customers(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, customer_id)
);

CREATE TABLE IF NOT EXISTS wms_customer_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES wms_customers(id) ON DELETE CASCADE NOT NULL,
  branch_name TEXT NOT NULL,
  branch_code TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT,
  is_main_branch BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(customer_id, branch_code)
);

ALTER TABLE wms_customer_users ADD CONSTRAINT fk_branch FOREIGN KEY (branch_id) REFERENCES wms_customer_branches(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS wms_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES wms_customers(id) ON DELETE CASCADE NOT NULL,
  contract_number TEXT UNIQUE NOT NULL,
  contract_type TEXT NOT NULL,
  duration_months INTEGER NOT NULL,
  monthly_fee NUMERIC(10,2) NOT NULL,
  storage_space_sqm NUMERIC(10,2),
  storage_conditions TEXT,
  free_transfer_count INTEGER DEFAULT 0 NOT NULL,
  transfer_price_after_limit NUMERIC(10,2) DEFAULT 0 NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wms_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES wms_customers(id) ON DELETE CASCADE NOT NULL,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER DEFAULT 0 NOT NULL,
  consumed_quantity INTEGER DEFAULT 0 NOT NULL,
  unit TEXT DEFAULT 'pcs' NOT NULL,
  price_per_unit NUMERIC(10,2),
  minimum_quantity INTEGER DEFAULT 0 NOT NULL,
  description TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'low', 'out_of_stock')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(customer_id, sku)
);

CREATE TABLE IF NOT EXISTS wms_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES wms_customers(id) ON DELETE CASCADE NOT NULL,
  order_number TEXT UNIQUE NOT NULL,
  delivery_branch_id UUID REFERENCES wms_customer_branches(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'pending_approval', 'approved', 'in_progress', 'delivered', 'completed', 'cancelled')) NOT NULL,
  total_amount NUMERIC(10,2) DEFAULT 0 NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wms_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES wms_orders(id) ON DELETE CASCADE NOT NULL,
  inventory_id UUID REFERENCES wms_inventory(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wms_order_branch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES wms_orders(id) ON DELETE CASCADE NOT NULL,
  order_item_id UUID REFERENCES wms_order_items(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES wms_customer_branches(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wms_order_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES wms_orders(id) ON DELETE CASCADE NOT NULL,
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wms_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES wms_customers(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES wms_orders(id) ON DELETE SET NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 5.00 NOT NULL,
  tax_amount NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')) NOT NULL,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wms_product_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES wms_customers(id) ON DELETE CASCADE NOT NULL,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  product_name TEXT NOT NULL,
  description TEXT,
  specifications TEXT,
  requested_quantity INTEGER NOT NULL,
  image_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wms_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  license_number TEXT,
  vehicle_type TEXT,
  vehicle_number TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'busy', 'inactive')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wms_workflow_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES wms_customers(id) ON DELETE CASCADE,
  require_order_approval BOOLEAN DEFAULT false NOT NULL,
  auto_approve_threshold NUMERIC(10,2),
  default_approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notification_preferences JSONB DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- STEP 3: Triggers for Updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_wms_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wms_customers_updated_at BEFORE UPDATE ON wms_customers FOR EACH ROW EXECUTE FUNCTION update_wms_updated_at_column();
CREATE TRIGGER update_wms_customer_branches_updated_at BEFORE UPDATE ON wms_customer_branches FOR EACH ROW EXECUTE FUNCTION update_wms_updated_at_column();
CREATE TRIGGER update_wms_contracts_updated_at BEFORE UPDATE ON wms_contracts FOR EACH ROW EXECUTE FUNCTION update_wms_updated_at_column();
CREATE TRIGGER update_wms_inventory_updated_at BEFORE UPDATE ON wms_inventory FOR EACH ROW EXECUTE FUNCTION update_wms_updated_at_column();
CREATE TRIGGER update_wms_orders_updated_at BEFORE UPDATE ON wms_orders FOR EACH ROW EXECUTE FUNCTION update_wms_updated_at_column();
CREATE TRIGGER update_wms_order_approvals_updated_at BEFORE UPDATE ON wms_order_approvals FOR EACH ROW EXECUTE FUNCTION update_wms_updated_at_column();
CREATE TRIGGER update_wms_invoices_updated_at BEFORE UPDATE ON wms_invoices FOR EACH ROW EXECUTE FUNCTION update_wms_updated_at_column();
CREATE TRIGGER update_wms_product_requests_updated_at BEFORE UPDATE ON wms_product_requests FOR EACH ROW EXECUTE FUNCTION update_wms_updated_at_column();
CREATE TRIGGER update_wms_drivers_updated_at BEFORE UPDATE ON wms_drivers FOR EACH ROW EXECUTE FUNCTION update_wms_updated_at_column();
CREATE TRIGGER update_wms_workflow_settings_updated_at BEFORE UPDATE ON wms_workflow_settings FOR EACH ROW EXECUTE FUNCTION update_wms_updated_at_column();

-- ============================================================================
-- STEP 4: Audit Triggers
-- ============================================================================

CREATE TRIGGER audit_wms_customers AFTER INSERT OR UPDATE OR DELETE ON wms_customers FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER audit_wms_customer_users AFTER INSERT OR UPDATE OR DELETE ON wms_customer_users FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER audit_wms_customer_branches AFTER INSERT OR UPDATE OR DELETE ON wms_customer_branches FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER audit_wms_contracts AFTER INSERT OR UPDATE OR DELETE ON wms_contracts FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER audit_wms_inventory AFTER INSERT OR UPDATE OR DELETE ON wms_inventory FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER audit_wms_orders AFTER INSERT OR UPDATE OR DELETE ON wms_orders FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER audit_wms_invoices AFTER INSERT OR UPDATE OR DELETE ON wms_invoices FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
CREATE TRIGGER audit_wms_product_requests AFTER INSERT OR UPDATE OR DELETE ON wms_product_requests FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- ============================================================================
-- STEP 5: Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE wms_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_customer_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_customer_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_order_branch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_order_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_product_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_workflow_settings ENABLE ROW LEVEL SECURITY;

-- WMS Customers
CREATE POLICY "Admins can manage all WMS customers" ON wms_customers FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Store customers can view their own customer" ON wms_customers FOR SELECT USING (id IN (SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid()));

-- WMS Customer Users
CREATE POLICY "Admins can manage customer users" ON wms_customer_users FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Store customers can view their own user links" ON wms_customer_users FOR SELECT USING (user_id = auth.uid());

-- WMS Customer Branches
CREATE POLICY "Admins can manage all branches" ON wms_customer_branches FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Store customers can manage their own branches" ON wms_customer_branches FOR ALL USING (customer_id IN (SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid()));

-- WMS Contracts
CREATE POLICY "Admins can manage all contracts" ON wms_contracts FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Store customers can view their own contracts" ON wms_contracts FOR SELECT USING (customer_id IN (SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid()));

-- WMS Inventory
CREATE POLICY "Admins can manage all inventory" ON wms_inventory FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Store customers can view their own inventory" ON wms_inventory FOR SELECT USING (customer_id IN (SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid()));

-- WMS Orders
CREATE POLICY "Admins can manage all orders" ON wms_orders FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Store customers can view their own orders" ON wms_orders FOR SELECT USING (customer_id IN (SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid()));
CREATE POLICY "Store customers can create orders" ON wms_orders FOR INSERT WITH CHECK (customer_id IN (SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid()));

-- WMS Order Items
CREATE POLICY "Admins can manage all order items" ON wms_order_items FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Store customers can view their own order items" ON wms_order_items FOR SELECT USING (order_id IN (SELECT id FROM wms_orders WHERE customer_id IN (SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid())));
CREATE POLICY "Store customers can create order items" ON wms_order_items FOR INSERT WITH CHECK (order_id IN (SELECT id FROM wms_orders WHERE customer_id IN (SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid())));

-- WMS Order Branch Items
CREATE POLICY "Admins can manage all order branch items" ON wms_order_branch_items FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Store customers can view their order branch items" ON wms_order_branch_items FOR SELECT USING (order_id IN (SELECT id FROM wms_orders WHERE customer_id IN (SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid())));
CREATE POLICY "Branch managers can view their branch orders" ON wms_order_branch_items FOR SELECT USING (has_role(auth.uid(), 'branch_manager') AND branch_id IN (SELECT branch_id FROM wms_customer_users WHERE user_id = auth.uid()));

-- WMS Order Approvals
CREATE POLICY "Admins can manage all approvals" ON wms_order_approvals FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Store customers can view their order approvals" ON wms_order_approvals FOR SELECT USING (order_id IN (SELECT id FROM wms_orders WHERE customer_id IN (SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid())));
CREATE POLICY "Branch managers can approve orders" ON wms_order_approvals FOR UPDATE USING (has_role(auth.uid(), 'branch_manager') AND order_id IN (SELECT id FROM wms_orders WHERE customer_id IN (SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid())));

-- WMS Invoices
CREATE POLICY "Admins can manage all invoices" ON wms_invoices FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Store customers can view their own invoices" ON wms_invoices FOR SELECT USING (customer_id IN (SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid()));

-- WMS Product Requests
CREATE POLICY "Admins can manage all product requests" ON wms_product_requests FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Store customers can view their own product requests" ON wms_product_requests FOR SELECT USING (customer_id IN (SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid()));
CREATE POLICY "Store customers can create product requests" ON wms_product_requests FOR INSERT WITH CHECK (customer_id IN (SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid()));

-- WMS Drivers
CREATE POLICY "Admins can manage all drivers" ON wms_drivers FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can view their own profile" ON wms_drivers FOR SELECT USING (user_id = auth.uid());

-- WMS Workflow Settings
CREATE POLICY "Admins can manage all workflow settings" ON wms_workflow_settings FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Store customers can view their workflow settings" ON wms_workflow_settings FOR SELECT USING (customer_id IN (SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid()));

-- ============================================================================
-- STEP 6: Storage Buckets
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('wms-product-images', 'wms-product-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('wms-contract-documents', 'wms-contract-documents', false) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 7: Storage RLS Policies
-- ============================================================================

CREATE POLICY "WMS store customers upload images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'wms-product-images' AND (storage.foldername(name))[1] IN (SELECT id::text FROM wms_customers WHERE id IN (SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid())));
CREATE POLICY "WMS store customers view images" ON storage.objects FOR SELECT USING (bucket_id = 'wms-product-images' AND (storage.foldername(name))[1] IN (SELECT id::text FROM wms_customers WHERE id IN (SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid())));
CREATE POLICY "WMS store customers update images" ON storage.objects FOR UPDATE USING (bucket_id = 'wms-product-images' AND (storage.foldername(name))[1] IN (SELECT id::text FROM wms_customers WHERE id IN (SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid())));
CREATE POLICY "WMS store customers delete images" ON storage.objects FOR DELETE USING (bucket_id = 'wms-product-images' AND (storage.foldername(name))[1] IN (SELECT id::text FROM wms_customers WHERE id IN (SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid())));
CREATE POLICY "WMS admins manage product images" ON storage.objects FOR ALL USING (bucket_id = 'wms-product-images' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "WMS store customers view contracts" ON storage.objects FOR SELECT USING (bucket_id = 'wms-contract-documents' AND (storage.foldername(name))[1] IN (SELECT id::text FROM wms_customers WHERE id IN (SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid())));
CREATE POLICY "WMS admins manage contract docs" ON storage.objects FOR ALL USING (bucket_id = 'wms-contract-documents' AND has_role(auth.uid(), 'admin'));

-- ============================================================================
-- STEP 8: Performance Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_wms_customer_users_user_id ON wms_customer_users(user_id);
CREATE INDEX IF NOT EXISTS idx_wms_customer_users_customer_id ON wms_customer_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_wms_inventory_customer_id ON wms_inventory(customer_id);
CREATE INDEX IF NOT EXISTS idx_wms_inventory_sku ON wms_inventory(sku);
CREATE INDEX IF NOT EXISTS idx_wms_inventory_status ON wms_inventory(status);
CREATE INDEX IF NOT EXISTS idx_wms_orders_customer_id ON wms_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_wms_orders_status ON wms_orders(status);
CREATE INDEX IF NOT EXISTS idx_wms_order_items_order_id ON wms_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_wms_order_items_inventory_id ON wms_order_items(inventory_id);
CREATE INDEX IF NOT EXISTS idx_wms_invoices_customer_id ON wms_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_wms_invoices_status ON wms_invoices(status);
CREATE INDEX IF NOT EXISTS idx_wms_product_requests_customer_id ON wms_product_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_wms_product_requests_status ON wms_product_requests(status);