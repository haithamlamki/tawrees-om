-- Align invoice item insertion with existing schema
CREATE OR REPLACE FUNCTION public.auto_generate_invoice_on_customer_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_subtotal NUMERIC(15,3);
  v_vat_rate NUMERIC(5,3) := 5.000;
  v_tax_amount NUMERIC(15,3);
  v_total_amount NUMERIC(15,3);
  v_due_date TIMESTAMP WITH TIME ZONE;
  order_item RECORD;
  line_description TEXT;
BEGIN
  IF NEW.status = 'delivered' 
     AND NEW.delivery_confirmed_by_customer = true 
     AND (OLD.delivery_confirmed_by_customer = false OR OLD.delivery_confirmed_by_customer IS NULL) THEN

    v_subtotal := NEW.total_amount;
    v_tax_amount := ROUND((v_subtotal * v_vat_rate / 100)::NUMERIC, 3);
    v_total_amount := v_subtotal + v_tax_amount;
    v_due_date := NOW() + INTERVAL '30 days';
    v_invoice_number := generate_invoice_number(NEW.customer_id);

    INSERT INTO public.wms_invoices (
      invoice_number,
      order_id,
      customer_id,
      subtotal,
      tax_amount,
      total_amount,
      vat_rate,
      currency,
      status,
      due_date,
      invoice_date,
      created_at
    ) VALUES (
      v_invoice_number,
      NEW.id,
      NEW.customer_id,
      v_subtotal,
      v_tax_amount,
      v_total_amount,
      v_vat_rate,
      'OMR',
      'pending',
      v_due_date,
      NOW(),
      NOW()
    ) RETURNING id INTO v_invoice_id;

    FOR order_item IN 
      SELECT 
        oi.inventory_id,
        inv.product_name,
        inv.sku,
        oi.quantity,
        oi.unit_price,
        (oi.quantity * oi.unit_price) as total_price
      FROM wms_order_items oi
      JOIN wms_inventory inv ON inv.id = oi.inventory_id
      WHERE oi.order_id = NEW.id
    LOOP
      line_description := TRIM(
        COALESCE(inv.product_name, '') ||
        CASE WHEN inv.sku IS NOT NULL AND inv.sku <> '' THEN ' (' || inv.sku || ')' ELSE '' END
      );

      INSERT INTO public.wms_invoice_items (
        invoice_id,
        inventory_id,
        description,
        quantity,
        unit_price,
        total_price
      ) VALUES (
        v_invoice_id,
        order_item.inventory_id,
        NULLIF(line_description, '') ,
        order_item.quantity::numeric,
        order_item.unit_price,
        order_item.total_price
      );
    END LOOP;

    PERFORM create_notification(
      NEW.customer_id,
      'Invoice Generated',
      'Invoice ' || v_invoice_number || ' has been generated for your order.',
      'invoice',
      v_invoice_id
    );

    NEW.status := 'completed';

    INSERT INTO public.audit_logs (
      table_name,
      record_id,
      action,
      old_data,
      new_data,
      user_id,
      module
    ) VALUES (
      'wms_orders',
      NEW.id,
      'INVOICE_GENERATED',
      jsonb_build_object('status', 'delivered'),
      jsonb_build_object('status', 'completed', 'invoice_id', v_invoice_id),
      auth.uid(),
      'system'
    );

  END IF;

  RETURN NEW;
END;
$function$;