-- Fix audit log constraint violation by setting module to 'system'
-- and avoid using a disallowed module name in audit entries.

-- Replace the deduct_inventory_on_approval function
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      
      -- Use allowed module value 'system' to satisfy audit_logs_module_check
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
        'system'
      );
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$function$;