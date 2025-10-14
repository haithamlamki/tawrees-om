# Row-Level Security (RLS) Policies Documentation

## Overview

This document provides comprehensive documentation for all Row-Level Security (RLS) policies implemented in the WMS (Warehouse Management System) application. RLS ensures data isolation between customers and proper access control across all user roles.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Security Definer Functions](#security-definer-functions)
- [Role Definitions](#role-definitions)
- [Policy Documentation by Table](#policy-documentation-by-table)
- [Common Patterns](#common-patterns)
- [Testing RLS Policies](#testing-rls-policies)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

The RLS architecture follows these principles:

1. **Customer Isolation**: Each customer's data is completely isolated from other customers
2. **Role-Based Access Control (RBAC)**: Different roles have different permissions
3. **Security Definer Functions**: Prevent recursive RLS checks
4. **Audit Trail**: All sensitive operations are logged
5. **Defense in Depth**: Multiple layers of security

### Security Layers

```
┌─────────────────────────────────────────┐
│     Application Layer (React)           │
│  - Client-side validation               │
│  - UI-based access control              │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│     API Layer (Edge Functions)          │
│  - Server-side validation               │
│  - Business logic enforcement           │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│     Database Layer (RLS Policies)       │
│  - Row-level data isolation             │
│  - Final security enforcement           │
└─────────────────────────────────────────┘
```

## Security Definer Functions

Security definer functions execute with elevated privileges to prevent recursive RLS policy checks.

### `has_role(_user_id uuid, _role app_role)`

Checks if a user has a specific system-wide role.

**Definition:**
```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

**Usage Example:**
```sql
CREATE POLICY "Admins can view all records"
ON public.shipment_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
```

### `has_wms_customer_role(_user_id uuid, _customer_id uuid, _required_roles text[])`

Checks if a user has a specific role within a WMS customer context.

**Definition:**
```sql
CREATE OR REPLACE FUNCTION public.has_wms_customer_role(
  _user_id uuid, 
  _customer_id uuid, 
  _required_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wms_customer_users
    WHERE user_id = _user_id
      AND customer_id = _customer_id
      AND role = ANY(_required_roles)
  )
$$;
```

**Usage Example:**
```sql
-- Allow owners and admins to manage inventory
CREATE POLICY "Owners and admins can manage inventory"
ON public.wms_inventory
FOR ALL
USING (
  has_wms_customer_role(
    auth.uid(), 
    customer_id, 
    ARRAY['owner', 'admin']
  )
);
```

### `user_wms_customer_id(_user_id uuid)`

Returns the customer_id for a WMS user.

**Definition:**
```sql
CREATE OR REPLACE FUNCTION public.user_wms_customer_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT customer_id
  FROM public.wms_customer_users
  WHERE user_id = _user_id
  LIMIT 1;
$$;
```

## Role Definitions

### System Roles (app_role enum)

| Role | Description | Typical Permissions |
|------|-------------|---------------------|
| `admin` | System administrator | Full access to all data and configuration |
| `employee` | Tawreed employee | Can manage assigned shipments and tasks |
| `customer` | Regular customer | Can view/manage own shipment requests |
| `accountant` | Finance team member | Can view financial data and reports |
| `shipping_partner` | External shipping partner | Can manage assigned shipments |

### WMS Customer Roles

| Role | Description | Typical Permissions |
|------|-------------|---------------------|
| `owner` | Customer account owner | Full access to customer data, can manage users |
| `admin` | Customer administrator | Can manage orders, inventory, users (except owners) |
| `employee` | Customer employee | Can view data, limited write access |
| `accountant` | Customer accountant | Can view invoices and financial data |

## Policy Documentation by Table

### wms_customers

**Security Requirements:**
- Customers can only view their own customer record
- System admins can view all customers
- Only admins can create/modify customers

**Policies:**

```sql
-- SELECT: Customers can view own record
CREATE POLICY "Customers can view own record"
ON wms_customers FOR SELECT
USING (
  id IN (
    SELECT customer_id 
    FROM wms_customer_users 
    WHERE user_id = auth.uid()
  )
);

-- SELECT: Admins can view all
CREATE POLICY "Admins can view all customers"
ON wms_customers FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- INSERT/UPDATE/DELETE: Admin only
CREATE POLICY "Admins can manage customers"
ON wms_customers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

**Example Scenarios:**

```typescript
// ✅ Customer viewing their own record
const { data } = await supabase
  .from('wms_customers')
  .select('*')
  .eq('id', userCustomerId);
// Returns: Customer's own record

// ❌ Customer viewing another customer
const { data } = await supabase
  .from('wms_customers')
  .select('*')
  .eq('id', otherCustomerId);
// Returns: Empty array (RLS blocks access)

// ✅ Admin viewing all customers
const { data } = await supabase
  .from('wms_customers')
  .select('*');
// Returns: All customer records
```

### wms_customer_users

**Security Requirements:**
- Users can view other users in their customer
- Only owners and admins can manage users
- Owners cannot be demoted or deleted by other owners
- Users can view their own record

**Policies:**

```sql
-- SELECT: View users in same customer
CREATE POLICY "Users can view same customer users"
ON wms_customer_users FOR SELECT
USING (
  customer_id = user_wms_customer_id(auth.uid())
);

-- INSERT: Owners and admins can add users
CREATE POLICY "Owners and admins can add users"
ON wms_customer_users FOR INSERT
WITH CHECK (
  has_wms_customer_role(
    auth.uid(), 
    customer_id, 
    ARRAY['owner', 'admin']
  )
);

-- UPDATE: Owners and admins can update, but cannot demote owners
CREATE POLICY "Cannot demote or delete owners"
ON wms_customer_users FOR UPDATE
USING (
  has_wms_customer_role(auth.uid(), customer_id, ARRAY['owner', 'admin'])
  AND (role != 'owner' OR auth.uid() = user_id)
);

-- DELETE: Cannot delete owners
CREATE POLICY "Cannot delete owners"
ON wms_customer_users FOR DELETE
USING (
  role != 'owner' 
  AND has_wms_customer_role(auth.uid(), customer_id, ARRAY['owner', 'admin'])
);
```

**Example Scenarios:**

```typescript
// ✅ Admin adding new employee
const { data } = await supabase
  .from('wms_customer_users')
  .insert({
    customer_id: myCustomerId,
    user_id: newUserId,
    role: 'employee'
  });

// ❌ Employee trying to add user
const { error } = await supabase
  .from('wms_customer_users')
  .insert({ ... });
// Error: RLS policy violation

// ❌ Admin trying to demote owner
const { error } = await supabase
  .from('wms_customer_users')
  .update({ role: 'employee' })
  .eq('user_id', ownerId);
// Error: RLS policy violation
```

### wms_inventory

**Security Requirements:**
- Complete customer isolation
- All users can view inventory in their customer
- Only owners and admins can modify inventory
- System admins have full access

**Policies:**

```sql
-- SELECT: Users can view own customer inventory
CREATE POLICY "Users can view own inventory"
ON wms_inventory FOR SELECT
USING (customer_id = user_wms_customer_id(auth.uid()));

-- INSERT/UPDATE/DELETE: Owners and admins only
CREATE POLICY "Owners and admins can manage inventory"
ON wms_inventory FOR ALL
USING (
  has_wms_customer_role(auth.uid(), customer_id, ARRAY['owner', 'admin'])
)
WITH CHECK (
  has_wms_customer_role(auth.uid(), customer_id, ARRAY['owner', 'admin'])
);

-- System admin bypass
CREATE POLICY "System admins can manage all inventory"
ON wms_inventory FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

**Critical Security Notes:**
- `customer_id` is **REQUIRED** on all INSERT operations
- Inventory deduction is handled by database triggers (not RLS)
- Negative quantities are prevented by application logic

**Example Scenarios:**

```typescript
// ✅ Employee viewing inventory
const { data } = await supabase
  .from('wms_inventory')
  .select('*')
  .eq('customer_id', myCustomerId);

// ✅ Admin adding inventory
const { data } = await supabase
  .from('wms_inventory')
  .insert({
    customer_id: myCustomerId,
    product_name: 'Widget',
    sku: 'WID-001',
    quantity: 100,
    price_per_unit: 5.000
  });

// ❌ Employee updating inventory
const { error } = await supabase
  .from('wms_inventory')
  .update({ quantity: 50 })
  .eq('id', inventoryId);
// Error: RLS policy violation
```

### wms_orders

**Security Requirements:**
- Customer isolation on all operations
- Auto-approval based on workflow settings
- Status transitions enforced by triggers
- Inventory deduction on approval

**Policies:**

```sql
-- SELECT: Users can view own customer orders
CREATE POLICY "Users can view own orders"
ON wms_orders FOR SELECT
USING (customer_id = user_wms_customer_id(auth.uid()));

-- INSERT: Any authenticated customer user
CREATE POLICY "Users can create orders"
ON wms_orders FOR INSERT
WITH CHECK (customer_id = user_wms_customer_id(auth.uid()));

-- UPDATE: Owners and admins can update
CREATE POLICY "Owners and admins can update orders"
ON wms_orders FOR UPDATE
USING (
  has_wms_customer_role(auth.uid(), customer_id, ARRAY['owner', 'admin'])
);

-- DELETE: Owners only
CREATE POLICY "Owners can delete orders"
ON wms_orders FOR DELETE
USING (
  has_wms_customer_role(auth.uid(), customer_id, ARRAY['owner'])
);
```

**Database Triggers:**
1. `auto_approve_order_if_eligible` - Auto-approves based on workflow threshold
2. `enforce_order_status_transitions` - Validates status changes
3. `deduct_inventory_on_approval` - Deducts inventory when approved

**Example Scenarios:**

```typescript
// ✅ Creating order (auto-approval check runs)
const { data } = await supabase
  .from('wms_orders')
  .insert({
    customer_id: myCustomerId,
    status: 'pending_approval',
    total_amount: 150.000,
    delivery_date: '2025-02-01'
  });
// If total <= auto_approve_threshold, status automatically set to 'approved'

// ✅ Approving order (inventory deduction runs)
const { data } = await supabase
  .from('wms_orders')
  .update({ status: 'approved' })
  .eq('id', orderId);
// Trigger deducts inventory quantities

// ❌ Invalid status transition
const { error } = await supabase
  .from('wms_orders')
  .update({ status: 'completed' })
  .eq('id', orderId)
  .eq('status', 'pending_approval');
// Error: Invalid transition
```

### wms_order_items

**Security Requirements:**
- Customer ID materialized from parent order
- Same access rules as parent orders
- Inventory validation on creation

**Policies:**

```sql
-- SELECT: Users can view items for own orders
CREATE POLICY "Users can view own order items"
ON wms_order_items FOR SELECT
USING (customer_id = user_wms_customer_id(auth.uid()));

-- INSERT: Customer ID automatically set by trigger
CREATE POLICY "Users can create order items"
ON wms_order_items FOR INSERT
WITH CHECK (customer_id = user_wms_customer_id(auth.uid()));
```

**Database Trigger:**
- `materialize_order_item_customer_id` - Copies customer_id from parent order

**Example Scenarios:**

```typescript
// ✅ Adding items to order
const { data } = await supabase
  .from('wms_order_items')
  .insert([
    {
      order_id: newOrderId,
      inventory_id: inventoryItem1Id,
      quantity: 10,
      unit_price: 5.000
      // customer_id auto-populated by trigger
    },
    {
      order_id: newOrderId,
      inventory_id: inventoryItem2Id,
      quantity: 5,
      unit_price: 12.000
    }
  ]);
```

### wms_invoices

**Security Requirements:**
- Customer isolation
- Invoice number auto-generated
- VAT calculations enforced
- Payment tracking

**Policies:**

```sql
-- SELECT: Users can view own invoices
CREATE POLICY "Users can view own invoices"
ON wms_invoices FOR SELECT
USING (customer_id = user_wms_customer_id(auth.uid()));

-- INSERT: Owners and admins can create
CREATE POLICY "Owners and admins can create invoices"
ON wms_invoices FOR INSERT
WITH CHECK (
  has_wms_customer_role(auth.uid(), customer_id, ARRAY['owner', 'admin'])
);

-- UPDATE: Cannot modify after payment
CREATE POLICY "Cannot modify paid invoices"
ON wms_invoices FOR UPDATE
USING (
  status != 'paid'
  AND has_wms_customer_role(auth.uid(), customer_id, ARRAY['owner', 'admin'])
);
```

**Database Triggers:**
- `set_invoice_number` - Generates unique invoice number

**Functions:**
- `calculate_invoice_totals(invoice_id)` - Calculates subtotal, tax, total

**Example Scenarios:**

```typescript
// ✅ Creating invoice (number auto-generated)
const { data } = await supabase
  .from('wms_invoices')
  .insert({
    customer_id: myCustomerId,
    order_id: orderId,
    subtotal: 500.000,
    vat_rate: 5.000,
    status: 'draft'
    // invoice_number auto-generated: CUSTCODE-INV-2025-0001
  });

// ✅ Marking invoice as paid
const { data } = await supabase
  .from('wms_invoices')
  .update({ 
    status: 'paid',
    paid_at: new Date().toISOString()
  })
  .eq('id', invoiceId);

// ❌ Modifying paid invoice
const { error } = await supabase
  .from('wms_invoices')
  .update({ subtotal: 600.000 })
  .eq('id', paidInvoiceId);
// Error: RLS policy violation
```

### audit_logs

**Security Requirements:**
- Immutable audit trail
- Only system can insert
- Admins can view all
- Users can view their own actions

**Policies:**

```sql
-- SELECT: Admins see all
CREATE POLICY "Admins can view all audit logs"
ON audit_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- SELECT: Users see own actions
CREATE POLICY "Users can view own audit logs"
ON audit_logs FOR SELECT
USING (user_id = auth.uid());

-- INSERT: System only (via triggers)
CREATE POLICY "Only system can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (false);

-- UPDATE/DELETE: Never allowed
CREATE POLICY "Audit logs cannot be updated"
ON audit_logs FOR UPDATE
USING (false);

CREATE POLICY "Audit logs cannot be deleted"
ON audit_logs FOR DELETE
USING (false);
```

**Database Trigger:**
- `log_audit_trail` - Automatically logs changes to critical tables

## Common Patterns

### Pattern 1: Customer Isolation

```sql
-- Standard customer isolation pattern
CREATE POLICY "policy_name"
ON table_name FOR operation
USING (customer_id = user_wms_customer_id(auth.uid()));
```

### Pattern 2: Role-Based Access

```sql
-- Check for specific WMS role
CREATE POLICY "policy_name"
ON table_name FOR operation
USING (
  has_wms_customer_role(
    auth.uid(), 
    customer_id, 
    ARRAY['owner', 'admin']
  )
);
```

### Pattern 3: Admin Bypass

```sql
-- Allow system admins to bypass customer isolation
CREATE POLICY "Admins bypass restrictions"
ON table_name FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

### Pattern 4: Read-Only for Some Roles

```sql
-- Employees can read but not write
CREATE POLICY "Employees read only"
ON table_name FOR SELECT
USING (
  has_wms_customer_role(
    auth.uid(), 
    customer_id, 
    ARRAY['owner', 'admin', 'employee']
  )
);

CREATE POLICY "Only admins can write"
ON table_name FOR INSERT
WITH CHECK (
  has_wms_customer_role(
    auth.uid(), 
    customer_id, 
    ARRAY['owner', 'admin']
  )
);
```

## Testing RLS Policies

### Unit Testing

See `src/tests/security/` for comprehensive RLS tests:

- `rls-policies.test.ts` - General RLS policy tests
- `rls-wms-inventory.test.ts` - Inventory isolation tests
- `rls-wms-orders.test.ts` - Order access control tests
- `rls-wms-invoices.test.ts` - Invoice security tests
- `rls-wms-customer-users.test.ts` - User management security

### Manual Testing Checklist

**Customer Isolation:**
- [ ] Customer A cannot view Customer B's data
- [ ] Customer A cannot modify Customer B's data
- [ ] Queries without customer_id filter return only own data

**Role-Based Access:**
- [ ] Employees can view but not modify restricted tables
- [ ] Admins can manage all data within customer
- [ ] Owners cannot be demoted by other admins

**Edge Cases:**
- [ ] NULL customer_id is rejected
- [ ] Invalid role assignments are rejected
- [ ] Status transitions are enforced
- [ ] Paid invoices cannot be modified

### SQL Testing Queries

```sql
-- Test customer isolation
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "customer-a-user-id"}';

SELECT * FROM wms_inventory WHERE customer_id = 'customer-b-id';
-- Should return empty

-- Test role-based access
SELECT has_wms_customer_role(
  'user-id'::uuid, 
  'customer-id'::uuid, 
  ARRAY['admin']
);
-- Should return true/false

-- Test security definer function
SELECT user_wms_customer_id('user-id'::uuid);
-- Should return customer UUID
```

## Troubleshooting

### "new row violates row-level security policy"

**Cause:** Trying to insert/update data that doesn't match the policy's WITH CHECK condition.

**Solutions:**
1. Ensure `customer_id` matches the user's customer
2. Check if user has required role
3. Verify foreign key references are valid

```typescript
// ❌ Wrong: Missing customer_id
await supabase.from('wms_inventory').insert({
  product_name: 'Widget'
});

// ✅ Correct: Include customer_id
await supabase.from('wms_inventory').insert({
  customer_id: myCustomerId,
  product_name: 'Widget',
  sku: 'WID-001',
  quantity: 100
});
```

### "infinite recursion detected in policy"

**Cause:** RLS policy references the same table it's attached to.

**Solution:** Use SECURITY DEFINER functions to break recursion.

```sql
-- ❌ Wrong: Causes recursion
CREATE POLICY "policy"
ON profiles FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- ✅ Correct: Use security definer function
CREATE POLICY "policy"
ON profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));
```

### "permission denied for table"

**Cause:** RLS is enabled but no policies allow the operation.

**Solution:** Create appropriate policy or grant permissions.

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- View existing policies
SELECT * FROM pg_policies 
WHERE tablename = 'your_table';
```

### Testing in Development

```typescript
// Bypass RLS for testing (USE ONLY IN DEVELOPMENT!)
// This requires service_role key
const { data } = await supabaseAdmin
  .from('wms_inventory')
  .select('*');
```

## Best Practices

1. **Always Use Security Definer Functions** for role checks
2. **Test Policies Thoroughly** with different user roles
3. **Document Policy Intent** in comments
4. **Use Explicit customer_id Checks** don't rely on JOINs
5. **Prevent Privilege Escalation** (e.g., owner protection)
6. **Log Security Events** to audit_logs
7. **Review Policies Regularly** as requirements change
8. **Use Least Privilege Principle** grant minimum necessary access

## Permission Matrix

| Table | Customer View | Customer Create | Customer Update | Customer Delete | Admin Override |
|-------|--------------|-----------------|-----------------|-----------------|----------------|
| wms_customers | Own only | ❌ | ❌ | ❌ | ✅ |
| wms_customer_users | Same customer | Owner/Admin | Owner/Admin | Owner/Admin (not owners) | ✅ |
| wms_inventory | Same customer | Owner/Admin | Owner/Admin | Owner/Admin | ✅ |
| wms_orders | Same customer | ✅ | Owner/Admin | Owner only | ✅ |
| wms_order_items | Same customer | ✅ | Owner/Admin | Owner/Admin | ✅ |
| wms_invoices | Same customer | Owner/Admin | Owner/Admin (if not paid) | Owner only | ✅ |
| wms_contracts | Same customer | ✅ | Owner/Admin | Owner only | ✅ |
| audit_logs | Own actions | ❌ (system only) | ❌ | ❌ | View all |

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Security Testing Guide](./SECURITY_GUIDE.md)
