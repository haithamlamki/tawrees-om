-- ============================================
-- Phase 1: Critical Security & Workflow Fixes
-- ============================================

-- Task 1: Fix user_roles foreign key to reference auth.users instead of profiles
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Task 3: Materialize customer_id in wms_order_items for efficient RLS
ALTER TABLE wms_order_items ADD COLUMN IF NOT EXISTS customer_id UUID;

-- Create trigger function to auto-populate customer_id from parent order
CREATE OR REPLACE FUNCTION materialize_order_item_customer_id()
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

-- Create trigger to materialize customer_id on INSERT
DROP TRIGGER IF EXISTS materialize_customer_id_trigger ON wms_order_items;
CREATE TRIGGER materialize_customer_id_trigger
BEFORE INSERT ON wms_order_items
FOR EACH ROW EXECUTE FUNCTION materialize_order_item_customer_id();

-- Backfill existing data
UPDATE wms_order_items oi 
SET customer_id = o.customer_id 
FROM wms_orders o 
WHERE oi.order_id = o.id AND oi.customer_id IS NULL;

-- Add NOT NULL constraint after backfill
ALTER TABLE wms_order_items ALTER COLUMN customer_id SET NOT NULL;

-- Update RLS policy to use direct customer_id check (more efficient)
DROP POLICY IF EXISTS "Store customers can view their own order items" ON wms_order_items;
CREATE POLICY "Store customers can view their own order items" ON wms_order_items
FOR SELECT USING (
  customer_id IN (
    SELECT customer_id FROM wms_customer_users WHERE user_id = auth.uid()
  )
);

-- Task 4.4: Enforce order status transitions with trigger
CREATE OR REPLACE FUNCTION enforce_order_status_transitions()
RETURNS TRIGGER AS $$
BEGIN
  -- Only enforce on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Validate transitions
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

DROP TRIGGER IF EXISTS check_order_status_transitions ON wms_orders;
CREATE TRIGGER check_order_status_transitions
BEFORE UPDATE ON wms_orders
FOR EACH ROW EXECUTE FUNCTION enforce_order_status_transitions();

-- Task 5: Deduct inventory on order approval with rollback on insufficient stock
CREATE OR REPLACE FUNCTION deduct_inventory_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  available_qty INTEGER;
BEGIN
  -- Only trigger when status changes TO 'approved' (not from approved to something else)
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    
    -- Loop through order items and deduct inventory
    FOR item IN 
      SELECT inventory_id, quantity 
      FROM wms_order_items 
      WHERE order_id = NEW.id
    LOOP
      -- Check available quantity
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
      
      -- Deduct quantity and update consumed
      UPDATE wms_inventory 
      SET 
        quantity = quantity - item.quantity,
        quantity_consumed = COALESCE(quantity_consumed, 0) + item.quantity,
        updated_at = NOW()
      WHERE id = item.inventory_id;
      
      -- Log to audit trail
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

DROP TRIGGER IF EXISTS deduct_inventory_trigger ON wms_orders;
CREATE TRIGGER deduct_inventory_trigger
AFTER UPDATE ON wms_orders
FOR EACH ROW EXECUTE FUNCTION deduct_inventory_on_approval();

-- Add index for performance on customer_id lookups
CREATE INDEX IF NOT EXISTS idx_wms_order_items_customer_id ON wms_order_items(customer_id);
CREATE INDEX IF NOT EXISTS idx_wms_orders_status ON wms_orders(status);
CREATE INDEX IF NOT EXISTS idx_wms_orders_customer_status ON wms_orders(customer_id, status);