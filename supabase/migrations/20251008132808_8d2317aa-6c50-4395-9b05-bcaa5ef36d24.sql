-- Performance Optimization: Add indexes for frequently queried columns (Fixed)

-- WMS Orders indexes
CREATE INDEX IF NOT EXISTS idx_wms_orders_customer_id ON wms_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_wms_orders_status ON wms_orders(status);
CREATE INDEX IF NOT EXISTS idx_wms_orders_created_at ON wms_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wms_orders_customer_status ON wms_orders(customer_id, status);

-- WMS Order Items indexes
CREATE INDEX IF NOT EXISTS idx_wms_order_items_order_id ON wms_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_wms_order_items_inventory_id ON wms_order_items(inventory_id);
CREATE INDEX IF NOT EXISTS idx_wms_order_items_customer_id ON wms_order_items(customer_id);

-- WMS Invoices indexes
CREATE INDEX IF NOT EXISTS idx_wms_invoices_customer_id ON wms_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_wms_invoices_order_id ON wms_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_wms_invoices_status ON wms_invoices(status);
CREATE INDEX IF NOT EXISTS idx_wms_invoices_created_at ON wms_invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wms_invoices_invoice_number ON wms_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_wms_invoices_customer_status ON wms_invoices(customer_id, status);

-- WMS Inventory indexes
CREATE INDEX IF NOT EXISTS idx_wms_inventory_customer_id ON wms_inventory(customer_id);
CREATE INDEX IF NOT EXISTS idx_wms_inventory_product_name ON wms_inventory(product_name);
CREATE INDEX IF NOT EXISTS idx_wms_inventory_quantity ON wms_inventory(quantity);
CREATE INDEX IF NOT EXISTS idx_wms_inventory_low_stock ON wms_inventory(customer_id, quantity) 
  WHERE quantity <= minimum_quantity;

-- WMS Customers indexes
CREATE INDEX IF NOT EXISTS idx_wms_customers_customer_code ON wms_customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_wms_customers_company_name ON wms_customers(company_name);
CREATE INDEX IF NOT EXISTS idx_wms_customers_is_active ON wms_customers(is_active);

-- Audit Logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) 
  WHERE is_read = false;

-- Shipment Requests indexes
CREATE INDEX IF NOT EXISTS idx_shipment_requests_customer_id ON shipment_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_shipment_requests_status ON shipment_requests(status);
CREATE INDEX IF NOT EXISTS idx_shipment_requests_created_at ON shipment_requests(created_at DESC);

-- Shipments indexes
CREATE INDEX IF NOT EXISTS idx_shipments_request_id ON shipments(request_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_assigned_to ON shipments(assigned_to);

-- Email Logs indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_email ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_template_type ON email_logs(template_type);

-- Product Quotes indexes
CREATE INDEX IF NOT EXISTS idx_product_quotes_customer_email ON product_quotes(customer_email);
CREATE INDEX IF NOT EXISTS idx_product_quotes_product_id ON product_quotes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_quotes_status ON product_quotes(status);
CREATE INDEX IF NOT EXISTS idx_product_quotes_created_at ON product_quotes(created_at DESC);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_wms_orders_customer_date ON wms_orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wms_invoices_customer_date ON wms_invoices(customer_id, created_at DESC);

-- Analyze tables to update statistics for query planner
ANALYZE wms_orders;
ANALYZE wms_order_items;
ANALYZE wms_invoices;
ANALYZE wms_inventory;
ANALYZE wms_customers;
ANALYZE audit_logs;
ANALYZE notifications;
ANALYZE shipment_requests;
ANALYZE shipments;