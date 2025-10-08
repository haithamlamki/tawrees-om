-- ============================================
-- RLS Denial Tests
-- Task 6: Verify cross-tenant data isolation
-- ============================================
-- 
-- Run with: supabase test db
-- Requires pgTAP extension
-- 
-- Tests verify that:
-- 1. CustomerA can only see their own data
-- 2. CustomerA cannot see CustomerB data
-- 3. CustomerA cannot create data for CustomerB
-- 4. RLS policies prevent data leakage

BEGIN;

-- Load pgTAP extension
CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(10);

-- ============================================
-- Setup: Create test customers
-- ============================================

INSERT INTO wms_customers (id, company_name, customer_code, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'RLS Test Customer A', 'RLS-TEST-A', 'rlsA@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'RLS Test Customer B', 'RLS-TEST-B', 'rlsB@test.com')
ON CONFLICT (id) DO UPDATE SET company_name = EXCLUDED.company_name;

-- Link test users to customers (assuming users exist in auth.users)
INSERT INTO wms_customer_users (customer_id, user_id, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'ccccaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'customer'),
  ('22222222-2222-2222-2222-222222222222', 'ccccbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'customer')
ON CONFLICT DO NOTHING;

-- Create sample inventory
INSERT INTO wms_inventory (id, customer_id, product_name, sku, quantity, unit, price_per_unit) VALUES
  ('inv-a-001', '11111111-1111-1111-1111-111111111111', 'Product A1', 'SKU-A1', 100, 'pcs', 50.00),
  ('inv-b-001', '22222222-2222-2222-2222-222222222222', 'Product B1', 'SKU-B1', 200, 'pcs', 75.00)
ON CONFLICT (id) DO UPDATE SET product_name = EXCLUDED.product_name;

-- Create sample orders
INSERT INTO wms_orders (id, customer_id, order_number, status, total_amount) VALUES
  ('order-a-001', '11111111-1111-1111-1111-111111111111', 'ORD-RLS-A-001', 'pending_approval', 500.00),
  ('order-b-001', '22222222-2222-2222-2222-222222222222', 'ORD-RLS-B-001', 'pending_approval', 750.00)
ON CONFLICT (id) DO UPDATE SET order_number = EXCLUDED.order_number;

-- ============================================
-- Test 1-3: wms_orders RLS
-- ============================================

-- Simulate CustomerA login
SET LOCAL "request.jwt.claims" = '{"sub": "ccccaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
SET LOCAL role TO authenticated;

-- Test 1: CustomerA can see their own orders
SELECT is(
  (SELECT COUNT(*)::INT FROM wms_orders WHERE customer_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'CustomerA can view their own orders'
);

-- Test 2: CustomerA cannot see CustomerB orders
SELECT is(
  (SELECT COUNT(*)::INT FROM wms_orders WHERE customer_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'CustomerA cannot view CustomerB orders (RLS blocks)'
);

-- Test 3: CustomerA cannot insert order for CustomerB
SELECT throws_ok(
  $$ INSERT INTO wms_orders (customer_id, order_number, status, total_amount) 
     VALUES ('22222222-2222-2222-2222-222222222222', 'HACK-ATTEMPT', 'pending_approval', 999.99) $$,
  '42501', -- insufficient_privilege error code
  NULL,
  'CustomerA cannot create order for CustomerB'
);

-- ============================================
-- Test 4-6: wms_inventory RLS
-- ============================================

-- Test 4: CustomerA can see their inventory
SELECT is(
  (SELECT COUNT(*)::INT FROM wms_inventory WHERE customer_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'CustomerA can view their own inventory'
);

-- Test 5: CustomerA cannot see CustomerB inventory
SELECT is(
  (SELECT COUNT(*)::INT FROM wms_inventory WHERE customer_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'CustomerA cannot view CustomerB inventory (RLS blocks)'
);

-- Test 6: CustomerA cannot insert inventory for CustomerB
SELECT throws_ok(
  $$ INSERT INTO wms_inventory (customer_id, product_name, sku, quantity, unit, price_per_unit) 
     VALUES ('22222222-2222-2222-2222-222222222222', 'Hack Product', 'HACK-SKU', 1, 'pcs', 1.00) $$,
  '42501',
  NULL,
  'CustomerA cannot create inventory for CustomerB'
);

-- ============================================
-- Test 7-8: wms_order_items RLS (materialized customer_id)
-- ============================================

-- Create order items for testing
INSERT INTO wms_order_items (order_id, inventory_id, quantity, unit_price, total_price) VALUES
  ('order-a-001', 'inv-a-001', 10, 50.00, 500.00),
  ('order-b-001', 'inv-b-001', 10, 75.00, 750.00)
ON CONFLICT DO NOTHING;

-- Test 7: CustomerA can see their order items (via materialized customer_id)
SELECT is(
  (SELECT COUNT(*)::INT FROM wms_order_items WHERE order_id = 'order-a-001'),
  1,
  'CustomerA can view their own order items'
);

-- Test 8: CustomerA cannot see CustomerB order items
SELECT is(
  (SELECT COUNT(*)::INT FROM wms_order_items WHERE order_id = 'order-b-001'),
  0,
  'CustomerA cannot view CustomerB order items (materialized RLS works)'
);

-- ============================================
-- Test 9-10: Admin bypass (for comparison)
-- ============================================

-- Simulate admin login
SET LOCAL "request.jwt.claims" = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';

-- Ensure admin role is set
INSERT INTO user_roles (user_id, role) VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin')
ON CONFLICT DO NOTHING;

-- Test 9: Admin can see all orders (CustomerA + CustomerB)
SELECT ok(
  (SELECT COUNT(*)::INT FROM wms_orders WHERE customer_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
  )) >= 2,
  'Admin can view all orders from both customers'
);

-- Test 10: Admin can see all inventory
SELECT ok(
  (SELECT COUNT(*)::INT FROM wms_inventory WHERE customer_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
  )) >= 2,
  'Admin can view all inventory from both customers'
);

-- ============================================
-- Cleanup
-- ============================================

-- Reset role
RESET role;
RESET "request.jwt.claims";

SELECT * FROM finish();
ROLLBACK;

-- ============================================
-- Usage Instructions
-- ============================================
-- 
-- 1. Ensure pgTAP is installed in your Supabase project
-- 2. Create test users in auth.users with UUIDs:
--    - ccccaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa (CustomerA)
--    - ccccbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb (CustomerB)
--    - aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa (Admin)
-- 3. Run: supabase test db
-- 
-- Expected result: All 10 tests pass
-- If any test fails, RLS policies need review
