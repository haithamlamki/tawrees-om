-- ============================================
-- Security Linter Fixes & Auto-Approval Workflow
-- ============================================

-- Fix: Function search path mutable - Add search_path to existing functions
CREATE OR REPLACE FUNCTION public.materialize_order_item_customer_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT customer_id INTO NEW.customer_id 
  FROM wms_orders WHERE id = NEW.order_id;
  
  IF NEW.customer_id IS NULL THEN
    RAISE EXCEPTION 'Cannot find customer_id for order %', NEW.order_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_order_status_transitions()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  CASE OLD.status
    WHEN 'pending_approval' THEN
      IF NEW.status NOT IN ('approved', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: % -> %. Allowed: approved, cancelled', OLD.status, NEW.status;
      END IF;
    WHEN 'approved' THEN
      IF NEW.status NOT IN ('in_progress', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: % -> %. Allowed: in_progress, cancelled', OLD.status, NEW.status;
      END IF;
    WHEN 'in_progress' THEN
      IF NEW.status NOT IN ('delivered', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: % -> %. Allowed: delivered, cancelled', OLD.status, NEW.status;
      END IF;
    WHEN 'delivered' THEN
      IF NEW.status NOT IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition: % -> %. Allowed: completed, cancelled', OLD.status, NEW.status;
      END IF;
    WHEN 'completed' THEN
      RAISE EXCEPTION 'Cannot change status from completed';
    WHEN 'cancelled' THEN
      RAISE EXCEPTION 'Cannot change status from cancelled';
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.deduct_inventory_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  available_qty INTEGER;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    
    FOR item IN 
      SELECT inventory_id, quantity 
      FROM wms_order_items 
      WHERE order_id = NEW.id
    LOOP
      SELECT quantity INTO available_qty 
      FROM wms_inventory 
      WHERE id = item.inventory_id;
      
      IF available_qty IS NULL THEN
        RAISE EXCEPTION 'Inventory item % not found', item.inventory_id;
      END IF;
      
      IF available_qty < item.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for inventory %. Available: %, Requested: %', 
          item.inventory_id, available_qty, item.quantity;
      END IF;
      
      UPDATE wms_inventory 
      SET 
        quantity = quantity - item.quantity,
        quantity_consumed = COALESCE(quantity_consumed, 0) + item.quantity,
        updated_at = NOW()
      WHERE id = item.inventory_id;
      
      INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        old_data,
        new_data,
        user_id,
        module
      ) VALUES (
        'wms_inventory',
        item.inventory_id,
        'INVENTORY_DEDUCTED',
        jsonb_build_object('order_id', NEW.id, 'quantity', item.quantity),
        jsonb_build_object('new_quantity', available_qty - item.quantity),
        auth.uid(),
        'wms_orders'
      );
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Auto-approval logic: Check workflow settings and auto-approve if threshold met
CREATE OR REPLACE FUNCTION public.auto_approve_order_if_eligible()
RETURNS TRIGGER AS $$
DECLARE
  workflow_settings RECORD;
BEGIN
  -- Only check on new orders with pending_approval status
  IF TG_OP = 'INSERT' AND NEW.status = 'pending_approval' THEN
    
    -- Get workflow settings for this customer
    SELECT * INTO workflow_settings
    FROM wms_workflow_settings
    WHERE customer_id = NEW.customer_id;
    
    -- If no settings found, require approval by default
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;
    
    -- If approval not required, auto-approve
    IF workflow_settings.require_approval = false THEN
      NEW.status := 'approved';
      
      -- Create automatic approval record
      INSERT INTO wms_order_approvals (
        order_id,
        status,
        notes,
        approved_by,
        approved_at
      ) VALUES (
        NEW.id,
        'approved',
        'Auto-approved: approval not required per workflow settings',
        auth.uid(),
        NOW()
      );
      
      RETURN NEW;
    END IF;
    
    -- Check auto-approve threshold
    IF workflow_settings.auto_approve_threshold IS NOT NULL 
       AND NEW.total_amount <= workflow_settings.auto_approve_threshold THEN
      NEW.status := 'approved';
      
      -- Create automatic approval record
      INSERT INTO wms_order_approvals (
        order_id,
        status,
        notes,
        approved_by,
        approved_at
      ) VALUES (
        NEW.id,
        'approved',
        CONCAT('Auto-approved: order amount ', NEW.total_amount::TEXT, ' <= threshold ', workflow_settings.auto_approve_threshold::TEXT),
        auth.uid(),
        NOW()
      );
      
      RETURN NEW;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS auto_approve_order_trigger ON wms_orders;
CREATE TRIGGER auto_approve_order_trigger
BEFORE INSERT ON wms_orders
FOR EACH ROW EXECUTE FUNCTION auto_approve_order_if_eligible();

-- Invoice numbering: Create sequences table per customer
CREATE TABLE IF NOT EXISTS wms_invoice_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES wms_customers(id) ON DELETE CASCADE,
  current_number INTEGER NOT NULL DEFAULT 0,
  prefix TEXT NOT NULL DEFAULT 'INV',
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, year)
);

ALTER TABLE wms_invoice_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invoice sequences" ON wms_invoice_sequences
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view invoice sequences" ON wms_invoice_sequences
FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'employee') OR
  has_role(auth.uid(), 'accountant')
);

-- Function to generate consecutive invoice numbers per customer per year
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_customer_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year INTEGER;
  v_next_number INTEGER;
  v_invoice_number TEXT;
  v_customer_code TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Get customer code for invoice prefix
  SELECT customer_code INTO v_customer_code
  FROM wms_customers
  WHERE id = p_customer_id;
  
  -- Insert or update sequence (with locking to prevent race conditions)
  INSERT INTO wms_invoice_sequences (customer_id, current_number, year, prefix)
  VALUES (p_customer_id, 1, v_year, v_customer_code)
  ON CONFLICT (customer_id, year) 
  DO UPDATE SET 
    current_number = wms_invoice_sequences.current_number + 1,
    updated_at = NOW()
  RETURNING current_number INTO v_next_number;
  
  -- Format: CUSTCODE-INV-YYYY-0001
  v_invoice_number := CONCAT(
    v_customer_code, '-INV-', 
    v_year, '-', 
    LPAD(v_next_number::TEXT, 4, '0')
  );
  
  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add VAT fields to invoices if not exists
ALTER TABLE wms_invoices ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,3) DEFAULT 5.000;
ALTER TABLE wms_invoices ADD COLUMN IF NOT EXISTS vat_exempt BOOLEAN DEFAULT false;
ALTER TABLE wms_invoices ADD COLUMN IF NOT EXISTS vendor_vatin TEXT;
ALTER TABLE wms_invoices ADD COLUMN IF NOT EXISTS customer_vatin TEXT;

-- Function to calculate VAT-compliant totals (Oman: 5%, 3 decimal rounding for baisa)
CREATE OR REPLACE FUNCTION public.calculate_invoice_totals(p_invoice_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_subtotal NUMERIC(15,3);
  v_tax_amount NUMERIC(15,3);
  v_total_amount NUMERIC(15,3);
  v_vat_rate NUMERIC(5,3);
  v_vat_exempt BOOLEAN;
BEGIN
  -- Get invoice VAT settings
  SELECT vat_rate, vat_exempt INTO v_vat_rate, v_vat_exempt
  FROM wms_invoices
  WHERE id = p_invoice_id;
  
  -- Calculate subtotal from invoice items (if exists, otherwise use invoice subtotal)
  SELECT COALESCE(SUM(total_price), 0) INTO v_subtotal
  FROM wms_invoice_items
  WHERE invoice_id = p_invoice_id;
  
  -- If no items, use invoice subtotal
  IF v_subtotal = 0 THEN
    SELECT subtotal INTO v_subtotal
    FROM wms_invoices
    WHERE id = p_invoice_id;
  END IF;
  
  -- Calculate tax (round to 3 decimals for baisa)
  IF v_vat_exempt THEN
    v_tax_amount := 0;
  ELSE
    v_tax_amount := ROUND((v_subtotal * v_vat_rate / 100)::NUMERIC, 3);
  END IF;
  
  v_total_amount := v_subtotal + v_tax_amount;
  
  RETURN jsonb_build_object(
    'subtotal', v_subtotal,
    'tax_amount', v_tax_amount,
    'total_amount', v_total_amount,
    'vat_rate', v_vat_rate,
    'currency', 'OMR'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Trigger to auto-generate invoice number on insert
CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := generate_invoice_number(NEW.customer_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS set_invoice_number_trigger ON wms_invoices;
CREATE TRIGGER set_invoice_number_trigger
BEFORE INSERT ON wms_invoices
FOR EACH ROW EXECUTE FUNCTION set_invoice_number();

-- Create invoice items table if not exists
CREATE TABLE IF NOT EXISTS wms_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES wms_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(15,3) NOT NULL,
  unit_price NUMERIC(15,3) NOT NULL,
  total_price NUMERIC(15,3) NOT NULL,
  vat_exempt BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE wms_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invoice items" ON wms_invoice_items
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view invoice items" ON wms_invoice_items
FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'employee') OR
  has_role(auth.uid(), 'accountant')
);

CREATE POLICY "Customers can view their invoice items" ON wms_invoice_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM wms_invoices inv
    JOIN wms_customer_users cu ON cu.customer_id = inv.customer_id
    WHERE inv.id = wms_invoice_items.invoice_id
    AND cu.user_id = auth.uid()
  )
);