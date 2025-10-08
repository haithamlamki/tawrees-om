-- ============================================
-- Test Seed Data for Development & Testing
-- Task 2: Create Test Seed Data
-- ============================================

BEGIN;

-- Clean up existing test data (use with caution in production!)
DELETE FROM wms_order_items WHERE order_id IN (SELECT id FROM wms_orders WHERE customer_id IN (
  SELECT id FROM wms_customers WHERE customer_code IN ('CUST-TEST-A', 'CUST-TEST-B')
));
DELETE FROM wms_orders WHERE customer_id IN (
  SELECT id FROM wms_customers WHERE customer_code IN ('CUST-TEST-A', 'CUST-TEST-B')
);
DELETE FROM wms_inventory WHERE customer_id IN (
  SELECT id FROM wms_customers WHERE customer_code IN ('CUST-TEST-A', 'CUST-TEST-B')
);
DELETE FROM wms_customer_users WHERE customer_id IN (
  SELECT id FROM wms_customers WHERE customer_code IN ('CUST-TEST-A', 'CUST-TEST-B')
);
DELETE FROM wms_customer_branches WHERE customer_id IN (
  SELECT id FROM wms_customers WHERE customer_code IN ('CUST-TEST-A', 'CUST-TEST-B')
);
DELETE FROM wms_customers WHERE customer_code IN ('CUST-TEST-A', 'CUST-TEST-B');

-- Create 2 test customers
INSERT INTO wms_customers (id, company_name, customer_code, email, phone, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Test Customer A Trading LLC', 'CUST-TEST-A', 'customerA@test.com', '+968-91234567', true),
  ('22222222-2222-2222-2222-222222222222', 'Test Customer B Industries', 'CUST-TEST-B', 'customerB@test.com', '+968-91234568', true);

-- Create branches for Customer A
INSERT INTO wms_customer_branches (id, customer_id, branch_name, city, country, contact_person, phone, is_active) VALUES
  ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Muscat Main Branch', 'Muscat', 'Oman', 'Ahmed Al-Said', '+968-24123456', true),
  ('aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Salalah Branch', 'Salalah', 'Oman', 'Fatima Al-Balushi', '+968-23456789', true);

-- Create test users (NOTE: These users must exist in auth.users first)
-- In a real test environment, create these users via Supabase Auth API
-- For now, assuming they exist with these UUIDs:
-- admin1: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- customerA1: ccccaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- customerB1: ccccbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
-- managerA1: mmmmaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa

-- Link users to customers
INSERT INTO wms_customer_users (customer_id, user_id, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'ccccaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'customer'),
  ('11111111-1111-1111-1111-111111111111', 'mmmmaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'branch_manager'),
  ('22222222-2222-2222-2222-222222222222', 'ccccbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'customer');

-- Assign roles in user_roles table
-- Note: Only insert if users don't already have these roles
INSERT INTO user_roles (user_id, role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin'),
  ('ccccaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'store_customer'),
  ('ccccbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'store_customer'),
  ('mmmmaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'branch_manager')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create inventory for Customer A (10 items)
INSERT INTO wms_inventory (id, customer_id, product_name, sku, quantity, quantity_consumed, unit, price_per_unit, location) VALUES
  ('iiiiaaaa-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'Laptop Dell XPS 15', 'DELL-XPS15-2024', 50, 10, 'pcs', 450.500, 'Warehouse-A-Shelf-01'),
  ('iiiiaaaa-0002-0002-0002-000000000002', '11111111-1111-1111-1111-111111111111', 'HP Printer LaserJet Pro', 'HP-LJ-PRO-M404', 30, 5, 'pcs', 220.750, 'Warehouse-A-Shelf-02'),
  ('iiiiaaaa-0003-0003-0003-000000000003', '11111111-1111-1111-1111-111111111111', 'Logitech Wireless Mouse', 'LG-MOUSE-MX3', 200, 50, 'pcs', 35.250, 'Warehouse-A-Shelf-03'),
  ('iiiiaaaa-0004-0004-0004-000000000004', '11111111-1111-1111-1111-111111111111', 'Samsung 27" Monitor', 'SAMS-MON-27-UHD', 80, 15, 'pcs', 180.000, 'Warehouse-A-Shelf-04'),
  ('iiiiaaaa-0005-0005-0005-000000000005', '11111111-1111-1111-1111-111111111111', 'Office Chair Ergonomic', 'CHAIR-ERG-2024', 40, 8, 'pcs', 95.500, 'Warehouse-A-Shelf-05'),
  ('iiiiaaaa-0006-0006-0006-000000000006', '11111111-1111-1111-1111-111111111111', 'USB-C Hub 7-in-1', 'USB-HUB-7IN1', 150, 30, 'pcs', 28.750, 'Warehouse-A-Shelf-06'),
  ('iiiiaaaa-0007-0007-0007-000000000007', '11111111-1111-1111-1111-111111111111', 'Wireless Keyboard', 'KB-WIRELESS-PRO', 120, 25, 'pcs', 42.500, 'Warehouse-A-Shelf-07'),
  ('iiiiaaaa-0008-0008-0008-000000000008', '11111111-1111-1111-1111-111111111111', 'Webcam HD 1080p', 'WEBCAM-HD-1080', 60, 12, 'pcs', 55.250, 'Warehouse-A-Shelf-08'),
  ('iiiiaaaa-0009-0009-0009-000000000009', '11111111-1111-1111-1111-111111111111', 'External SSD 1TB', 'SSD-EXT-1TB-2024', 90, 18, 'pcs', 120.000, 'Warehouse-A-Shelf-09'),
  ('iiiiaaaa-0010-0010-0010-000000000010', '11111111-1111-1111-1111-111111111111', 'Surge Protector 6-Outlet', 'SURGE-PROT-6OUT', 5, 2, 'pcs', 18.500, 'Warehouse-A-Shelf-10'); -- Low stock

-- Create inventory for Customer B (10 items)
INSERT INTO wms_inventory (id, customer_id, product_name, sku, quantity, quantity_consumed, unit, price_per_unit, location) VALUES
  ('iiiibbbb-0001-0001-0001-000000000001', '22222222-2222-2222-2222-222222222222', 'Industrial Drill Bosch', 'BOSCH-DRILL-PRO', 45, 8, 'pcs', 185.500, 'Warehouse-B-Zone-01'),
  ('iiiibbbb-0002-0002-0002-000000000002', '22222222-2222-2222-2222-222222222222', 'Safety Helmet Standard', 'HELMET-SAFE-STD', 200, 40, 'pcs', 12.750, 'Warehouse-B-Zone-02'),
  ('iiiibbbb-0003-0003-0003-000000000003', '22222222-2222-2222-2222-222222222222', 'Welding Mask Auto-Darkening', 'WELD-MASK-AUTO', 35, 7, 'pcs', 95.250, 'Warehouse-B-Zone-03'),
  ('iiiibbbb-0004-0004-0004-000000000004', '22222222-2222-2222-2222-222222222222', 'Angle Grinder 7-inch', 'GRINDER-ANG-7IN', 55, 11, 'pcs', 68.500, 'Warehouse-B-Zone-04'),
  ('iiiibbbb-0005-0005-0005-000000000005', '22222222-2222-2222-2222-222222222222', 'Steel Reinforcement Bars 12mm', 'STEEL-REBAR-12', 500, 150, 'pcs', 4.250, 'Warehouse-B-Yard-01'),
  ('iiiibbbb-0006-0006-0006-000000000006', '22222222-2222-2222-2222-222222222222', 'Concrete Mixer 500L', 'CONCRETE-MIX-500', 8, 2, 'pcs', 1250.000, 'Warehouse-B-Yard-02'),
  ('iiiibbbb-0007-0007-0007-000000000007', '22222222-2222-2222-2222-222222222222', 'Measuring Tape 30m', 'TAPE-MEAS-30M', 100, 20, 'pcs', 15.500, 'Warehouse-B-Zone-05'),
  ('iiiibbbb-0008-0008-0008-000000000008', '22222222-2222-2222-2222-222222222222', 'Work Gloves Heavy-Duty', 'GLOVES-HD-L', 300, 80, 'pairs', 5.750, 'Warehouse-B-Zone-06'),
  ('iiiibbbb-0009-0009-0009-000000000009', '22222222-2222-2222-2222-222222222222', 'Power Generator 5kW', 'GENERATOR-5KW', 12, 3, 'pcs', 890.000, 'Warehouse-B-Zone-07'),
  ('iiiibbbb-0010-0010-0010-000000000010', '22222222-2222-2222-2222-222222222222', 'LED Work Light Portable', 'LED-WORK-LIGHT', 0, 15, 'pcs', 38.500, 'Warehouse-B-Zone-08'); -- Out of stock

-- Create orders for Customer A
INSERT INTO wms_orders (id, customer_id, order_number, status, total_amount, notes, requested_delivery_date, created_at) VALUES
  ('ooooaaaa-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'ORD-2024-A-0001', 'pending_approval', 1500.750, 'Urgent: Office setup for new branch', CURRENT_DATE + INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
  ('ooooaaaa-0002-0002-0002-000000000002', '11111111-1111-1111-1111-111111111111', 'ORD-2024-A-0002', 'approved', 850.500, 'Monthly supplies order', CURRENT_DATE + INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '1 day'),
  ('ooooaaaa-0003-0003-0003-000000000003', '11111111-1111-1111-1111-111111111111', 'ORD-2024-A-0003', 'in_progress', 2200.000, 'IT equipment for expansion', CURRENT_DATE + INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '3 days'),
  ('ooooaaaa-0004-0004-0004-000000000004', '11111111-1111-1111-1111-111111111111', 'ORD-2024-A-0004', 'completed', 450.250, 'Accessories replacement', CURRENT_DATE - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '10 days');

-- Create order items for Customer A orders
INSERT INTO wms_order_items (order_id, inventory_id, quantity, unit_price, total_price) VALUES
  -- Order 1 (pending_approval)
  ('ooooaaaa-0001-0001-0001-000000000001', 'iiiiaaaa-0001-0001-0001-000000000001', 2, 450.500, 901.000),
  ('ooooaaaa-0001-0001-0001-000000000001', 'iiiiaaaa-0004-0004-0004-000000000004', 3, 180.000, 540.000),
  ('ooooaaaa-0001-0001-0001-000000000001', 'iiiiaaaa-0003-0003-0003-000000000003', 2, 35.250, 70.500),
  -- Order 2 (approved)
  ('ooooaaaa-0002-0002-0002-000000000002', 'iiiiaaaa-0002-0002-0002-000000000002', 2, 220.750, 441.500),
  ('ooooaaaa-0002-0002-0002-000000000002', 'iiiiaaaa-0005-0005-0005-000000000005', 4, 95.500, 382.000),
  -- Order 3 (in_progress)
  ('ooooaaaa-0003-0003-0003-000000000003', 'iiiiaaaa-0001-0001-0001-000000000001', 3, 450.500, 1351.500),
  ('ooooaaaa-0003-0003-0003-000000000003', 'iiiiaaaa-0009-0009-0009-000000000009', 5, 120.000, 600.000),
  ('ooooaaaa-0003-0003-0003-000000000003', 'iiiiaaaa-0007-0007-0007-000000000007', 6, 42.500, 255.000),
  -- Order 4 (completed)
  ('ooooaaaa-0004-0004-0004-000000000004', 'iiiiaaaa-0006-0006-0006-000000000006', 10, 28.750, 287.500),
  ('ooooaaaa-0004-0004-0004-000000000004', 'iiiiaaaa-0008-0008-0008-000000000008', 3, 55.250, 165.750);

-- Create orders for Customer B
INSERT INTO wms_orders (id, customer_id, order_number, status, total_amount, notes, requested_delivery_date, created_at) VALUES
  ('oooobbb-0001-0001-0001-000000000001', '22222222-2222-2222-2222-222222222222', 'ORD-2024-B-0001', 'pending_approval', 3500.000, 'Construction site equipment', CURRENT_DATE + INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
  ('oooobbb-0002-0002-0002-000000000002', '22222222-2222-2222-2222-222222222222', 'ORD-2024-B-0002', 'cancelled', 890.000, 'Cancelled due to project delay', CURRENT_DATE + INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '5 days');

-- Create order items for Customer B orders
INSERT INTO wms_order_items (order_id, inventory_id, quantity, unit_price, total_price) VALUES
  -- Order 1 (pending_approval)
  ('oooobbb-0001-0001-0001-000000000001', 'iiiibbbb-0006-0006-0006-000000000006', 2, 1250.000, 2500.000),
  ('oooobbb-0001-0001-0001-000000000001', 'iiiibbbb-0001-0001-0001-000000000001', 5, 185.500, 927.500),
  ('oooobbb-0001-0001-0001-000000000001', 'iiiibbbb-0003-0003-0003-000000000003', 1, 95.250, 95.250),
  -- Order 2 (cancelled)
  ('oooobbb-0002-0002-0002-000000000002', 'iiiibbbb-0009-0009-0009-000000000009', 1, 890.000, 890.000);

-- Create invoices (sample data)
INSERT INTO wms_invoices (id, customer_id, invoice_number, status, subtotal, tax_amount, total_amount, due_date, notes, created_at) VALUES
  ('iiiiaaa-inv-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'INV-2024-A-0001', 'paid', 450.250, 22.513, 472.763, CURRENT_DATE - INTERVAL '10 days', 'Payment received via bank transfer', CURRENT_TIMESTAMP - INTERVAL '15 days'),
  ('iiiiaaa-inv-0002-0002-000000000002', '11111111-1111-1111-1111-111111111111', 'INV-2024-A-0002', 'pending', 850.500, 42.525, 893.025, CURRENT_DATE + INTERVAL '7 days', 'NET 7 payment terms', CURRENT_TIMESTAMP - INTERVAL '1 day'),
  ('iiiibbb-inv-0001-0001-000000000001', '22222222-2222-2222-2222-222222222222', 'INV-2024-B-0001', 'overdue', 2150.000, 107.500, 2257.500, CURRENT_DATE - INTERVAL '3 days', 'Overdue - payment follow-up required', CURRENT_TIMESTAMP - INTERVAL '10 days');

COMMIT;

-- Summary
SELECT 
  'Test data seeded successfully' AS message,
  (SELECT COUNT(*) FROM wms_customers WHERE customer_code LIKE 'CUST-TEST-%') AS customers_created,
  (SELECT COUNT(*) FROM wms_inventory WHERE customer_id IN (SELECT id FROM wms_customers WHERE customer_code LIKE 'CUST-TEST-%')) AS inventory_items_created,
  (SELECT COUNT(*) FROM wms_orders WHERE customer_id IN (SELECT id FROM wms_customers WHERE customer_code LIKE 'CUST-TEST-%')) AS orders_created,
  (SELECT COUNT(*) FROM wms_invoices WHERE customer_id IN (SELECT id FROM wms_customers WHERE customer_code LIKE 'CUST-TEST-%')) AS invoices_created;
