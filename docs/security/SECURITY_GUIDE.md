# WMS Security Architecture Guide

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Authorization](#authorization)
- [Data Isolation](#data-isolation)
- [Audit Logging](#audit-logging)
- [Security Best Practices](#security-best-practices)
- [Common Vulnerabilities](#common-vulnerabilities)
- [Incident Response](#incident-response)

## Overview

The WMS (Warehouse Management System) implements a defense-in-depth security architecture with multiple layers of protection:

```
┌──────────────────────────────────────────────────┐
│          Application Security Layer              │
│  - Input validation                              │
│  - XSS protection                                │
│  - CSRF protection                               │
└──────────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────┐
│       Authentication & Authorization Layer       │
│  - JWT-based authentication                      │
│  - Role-based access control (RBAC)              │
│  - Multi-tenancy isolation                       │
└──────────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────┐
│          Database Security Layer                 │
│  - Row-level security (RLS) policies             │
│  - Encrypted data at rest                        │
│  - Secure connections (SSL/TLS)                  │
└──────────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────┐
│            Audit & Monitoring Layer              │
│  - Comprehensive audit logging                   │
│  - Security event monitoring                     │
│  - Anomaly detection                             │
└──────────────────────────────────────────────────┘
```

## Authentication

### Architecture

Authentication is handled by Supabase Auth with JWT (JSON Web Tokens):

1. User provides credentials (email/password)
2. Supabase Auth validates credentials
3. JWT access token issued (short-lived, 1 hour)
4. Refresh token issued (long-lived, stored in httpOnly cookie)
5. Client includes access token in Authorization header
6. Backend validates token on each request

### Implementation

**Sign Up:**
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure_password',
  options: {
    data: {
      full_name: 'John Doe',
      phone: '+96812345678'
    }
  }
});

// Trigger: handle_new_user creates profile and assigns 'customer' role
```

**Sign In:**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure_password'
});

// Returns: { user, session }
// session.access_token used for subsequent requests
```

**Session Management:**
```typescript
// Check current session
const { data: { session } } = await supabase.auth.getSession();

// Refresh token (automatic in Supabase client)
const { data: { session }, error } = await supabase.auth.refreshSession();

// Sign out
await supabase.auth.signOut();
```

### Security Features

**Password Requirements:**
- Minimum 8 characters
- Enforced by Supabase Auth configuration

**Email Verification:**
- Auto-confirm enabled in development
- Email verification required in production
- Configured in `supabase/config.toml`

**Session Security:**
- Access tokens expire after 1 hour
- Refresh tokens stored in secure httpOnly cookies
- Automatic token refresh handled by client
- CORS configured to prevent cross-origin attacks

### Two-Factor Authentication (2FA)

**Setup:**
```typescript
// Generate TOTP secret
const { data, error } = await supabase.rpc('generate_totp_secret');

// User scans QR code and enters verification code
const { data, error } = await supabase.rpc('verify_totp', {
  token: '123456'
});

// Update profile
await supabase
  .from('profiles')
  .update({ 
    two_factor_enabled: true,
    two_factor_secret: data.secret 
  })
  .eq('id', userId);
```

**Verification:**
```typescript
// After email/password authentication
const { data, error } = await supabase.rpc('verify_totp', {
  token: userProvidedCode
});

if (data.valid) {
  // Complete sign-in
}
```

## Authorization

### Role Hierarchy

```
System Roles (app_role enum):
├── admin (highest privilege)
│   └── Full system access
├── accountant
│   └── Financial data access
├── employee
│   └── Assigned tasks/shipments
├── customer
│   └── Own data only
└── shipping_partner
    └── Assigned shipments

WMS Customer Roles:
├── owner (highest within customer)
│   └── Full customer data access
├── admin
│   └── Manage orders, inventory, users (except owners)
├── employee
│   └── View data, limited writes
└── accountant
    └── View invoices and reports
```

### Role Assignment

**System Roles:**
```sql
-- Automatically assigned on user creation
INSERT INTO user_roles (user_id, role)
VALUES (NEW.id, 'customer');

-- Admin assignment (manual)
INSERT INTO user_roles (user_id, role)
VALUES (user_id, 'admin');
```

**WMS Customer Roles:**
```sql
-- First user becomes owner
INSERT INTO wms_customer_users (customer_id, user_id, role)
VALUES (customer_id, user_id, 'owner');

-- Additional users added by owners/admins
INSERT INTO wms_customer_users (customer_id, user_id, role)
VALUES (customer_id, new_user_id, 'employee');
```

### Permission Checks

**Frontend (UI):**
```typescript
import { useWMSPermissions } from '@/hooks/useWMSPermissions';

function InventoryPage() {
  const { canManageInventory, canViewOrders } = useWMSPermissions();

  return (
    <>
      {canViewOrders && <OrderList />}
      {canManageInventory && <AddInventoryButton />}
    </>
  );
}
```

**Backend (RLS):**
```sql
-- Enforced at database level
CREATE POLICY "Owners and admins can manage inventory"
ON wms_inventory FOR ALL
USING (
  has_wms_customer_role(auth.uid(), customer_id, ARRAY['owner', 'admin'])
);
```

**Edge Functions:**
```typescript
// Verify role before processing
const { data: userRoles } = await supabaseAdmin
  .from('user_roles')
  .select('role')
  .eq('user_id', userId);

if (!userRoles.some(r => r.role === 'admin')) {
  return new Response('Unauthorized', { status: 403 });
}
```

## Data Isolation

### Multi-Tenancy Architecture

Each WMS customer has complete data isolation:

```sql
-- Customer A's data
wms_customers (id: customer-a-id)
├── wms_customer_users (customer_id: customer-a-id)
├── wms_inventory (customer_id: customer-a-id)
├── wms_orders (customer_id: customer-a-id)
└── wms_invoices (customer_id: customer-a-id)

-- Customer B's data (completely isolated)
wms_customers (id: customer-b-id)
├── wms_customer_users (customer_id: customer-b-id)
├── wms_inventory (customer_id: customer-b-id)
├── wms_orders (customer_id: customer-b-id)
└── wms_invoices (customer_id: customer-b-id)
```

### Implementation Patterns

**Pattern 1: Direct customer_id Check**
```sql
CREATE POLICY "Customer isolation"
ON table_name FOR SELECT
USING (customer_id = user_wms_customer_id(auth.uid()));
```

**Pattern 2: Join to Parent Table**
```sql
CREATE POLICY "Order items isolation"
ON wms_order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM wms_orders
    WHERE wms_orders.id = wms_order_items.order_id
    AND wms_orders.customer_id = user_wms_customer_id(auth.uid())
  )
);
```

**Pattern 3: Materialized customer_id**
```sql
-- Trigger copies customer_id from parent
CREATE TRIGGER materialize_customer_id
BEFORE INSERT ON wms_order_items
FOR EACH ROW EXECUTE FUNCTION materialize_order_item_customer_id();
```

### Preventing Data Leaks

**❌ NEVER do this:**
```typescript
// Bypasses RLS by not filtering on customer_id
const { data } = await supabase
  .from('wms_inventory')
  .select('*');
// Could return data from multiple customers!
```

**✅ ALWAYS do this:**
```typescript
// Explicit customer filter
const { data } = await supabase
  .from('wms_inventory')
  .select('*')
  .eq('customer_id', userCustomerId);
// RLS ensures only own data returned
```

## Audit Logging

### What is Logged

All critical operations are logged to `audit_logs` table:

| Event Type | Tables Monitored | Information Captured |
|------------|------------------|---------------------|
| INSERT | wms_orders, wms_inventory, wms_invoices | New data, user, timestamp |
| UPDATE | wms_orders, wms_invoices, user_roles | Old data, new data, changed fields |
| DELETE | wms_inventory, wms_customer_users | Deleted data, user, reason |
| Status Changes | wms_orders, shipments | Old status, new status, user |

### Audit Log Structure

```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL, -- INSERT, UPDATE, DELETE
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  user_id uuid,
  user_email text,
  user_agent text,
  ip_address text,
  module text DEFAULT 'system',
  created_at timestamptz DEFAULT now()
);
```

### Automatic Logging

**Database Trigger:**
```sql
CREATE TRIGGER log_changes
AFTER INSERT OR UPDATE OR DELETE ON wms_orders
FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
```

**Function Implementation:**
```sql
CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_changed_fields TEXT[];
BEGIN
  -- Get user email
  SELECT email INTO v_user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Detect changed fields on UPDATE
  IF TG_OP = 'UPDATE' THEN
    SELECT ARRAY_AGG(key) INTO v_changed_fields
    FROM jsonb_each(to_jsonb(NEW))
    WHERE to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key;
  END IF;
  
  -- Insert audit log
  INSERT INTO audit_logs (
    table_name, record_id, action,
    old_data, new_data, changed_fields,
    user_id, user_email
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END,
    v_changed_fields,
    auth.uid(),
    v_user_email
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Querying Audit Logs

**View recent changes:**
```sql
SELECT 
  table_name,
  action,
  user_email,
  changed_fields,
  created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 50;
```

**Track specific record:**
```sql
SELECT 
  action,
  old_data,
  new_data,
  user_email,
  created_at
FROM audit_logs
WHERE table_name = 'wms_orders'
  AND record_id = 'order-uuid'
ORDER BY created_at ASC;
```

**Security events:**
```sql
SELECT 
  table_name,
  action,
  user_email,
  new_data->>'role' as new_role,
  created_at
FROM audit_logs
WHERE table_name = 'wms_customer_users'
  AND action = 'UPDATE'
  AND 'role' = ANY(changed_fields)
ORDER BY created_at DESC;
```

## Security Best Practices

### Input Validation

**Client-Side (React Hook Form + Zod):**
```typescript
import { z } from 'zod';

const inventorySchema = z.object({
  product_name: z.string().min(1).max(255),
  sku: z.string().regex(/^[A-Z0-9-]+$/),
  quantity: z.number().int().min(0),
  price_per_unit: z.number().min(0).max(999999.999)
});

// Validates before submission
const form = useForm({
  resolver: zodResolver(inventorySchema)
});
```

**Server-Side (Edge Functions):**
```typescript
const body = await req.json();

// Validate input
if (!body.product_name || typeof body.quantity !== 'number') {
  return new Response('Invalid input', { status: 400 });
}

// Sanitize
const cleanName = body.product_name.trim().substring(0, 255);
```

### SQL Injection Prevention

**✅ Use Supabase Client (parameterized):**
```typescript
// SAFE: Parameters properly escaped
const { data } = await supabase
  .from('wms_inventory')
  .select('*')
  .eq('sku', userInput);
```

**❌ NEVER construct raw SQL:**
```typescript
// DANGEROUS: SQL injection vulnerability
const query = `SELECT * FROM wms_inventory WHERE sku = '${userInput}'`;
```

### XSS Prevention

**React automatically escapes:**
```tsx
// SAFE: React escapes by default
<div>{userInput}</div>
```

**Dangerous HTML:**
```tsx
// DANGEROUS: XSS vulnerability
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// SAFE: Sanitize first
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(userInput) 
}} />
```

### CSRF Protection

**Supabase handles automatically:**
- CORS configured in `supabase/config.toml`
- JWT tokens in Authorization header (not cookies)
- SameSite cookie attribute on refresh tokens

### Secrets Management

**✅ Use environment variables:**
```typescript
const apiKey = import.meta.env.VITE_API_KEY;
```

**❌ NEVER hardcode:**
```typescript
// DANGEROUS: Exposed in client bundle
const apiKey = 'sk_live_abc123';
```

**Edge Function secrets:**
```typescript
// Accessed via Deno.env
const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
```

### Rate Limiting

**Implemented at Edge Function level:**
```typescript
const rateLimit = new Map<string, number[]>();

export default async function handler(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  
  // Get recent requests from this IP
  const requests = rateLimit.get(ip) || [];
  const recentRequests = requests.filter(t => now - t < 60000);
  
  if (recentRequests.length >= 10) {
    return new Response('Rate limit exceeded', { status: 429 });
  }
  
  recentRequests.push(now);
  rateLimit.set(ip, recentRequests);
  
  // Process request...
}
```

## Common Vulnerabilities

### 1. Privilege Escalation

**Vulnerability:**
```typescript
// User manipulates role in request body
await supabase
  .from('wms_customer_users')
  .update({ role: 'owner' })
  .eq('user_id', auth.uid());
```

**Prevention:**
```sql
-- RLS prevents role escalation
CREATE POLICY "Cannot self-promote"
ON wms_customer_users FOR UPDATE
USING (
  -- Can only update if admin/owner
  has_wms_customer_role(auth.uid(), customer_id, ARRAY['owner', 'admin'])
  -- Cannot change own role to owner
  AND (role != 'owner' OR user_id != auth.uid())
);
```

### 2. Insecure Direct Object Reference (IDOR)

**Vulnerability:**
```typescript
// User changes UUID in URL to access other customer's data
await supabase
  .from('wms_invoices')
  .select('*')
  .eq('id', manipulatedInvoiceId);
```

**Prevention:**
```sql
-- RLS ensures customer isolation
CREATE POLICY "Customer isolation"
ON wms_invoices FOR SELECT
USING (customer_id = user_wms_customer_id(auth.uid()));
-- Even if user guesses invoice ID, they can't access it
```

### 3. Mass Assignment

**Vulnerability:**
```typescript
// User adds unintended fields to request
const userData = req.body; // Contains { role: 'admin' }
await supabase.from('profiles').update(userData);
```

**Prevention:**
```typescript
// Whitelist allowed fields
const { full_name, phone } = req.body;
await supabase.from('profiles').update({ full_name, phone });
```

### 4. Broken Access Control

**Vulnerability:**
```typescript
// Frontend hides button, but API still accessible
if (userRole === 'employee') {
  return <p>No access</p>;
}
```

**Prevention:**
```sql
-- RLS enforces at database level
CREATE POLICY "Employees read-only"
ON wms_inventory FOR INSERT
WITH CHECK (
  has_wms_customer_role(auth.uid(), customer_id, ARRAY['owner', 'admin'])
);
-- Employee can't insert even if they bypass frontend
```

### 5. Information Disclosure

**Vulnerability:**
```typescript
// Error exposes database structure
catch (error) {
  console.error(error); // Logs to client console
  throw error; // Shows full error to user
}
```

**Prevention:**
```typescript
// Sanitize errors
catch (error) {
  console.error('DB Error:', error); // Server-side only
  return { error: 'Operation failed' }; // Generic message
}
```

## Incident Response

### Detection

**Monitoring:**
- Unusual spike in failed authentication attempts
- Access to unusual tables or data volumes
- Privilege changes in audit logs
- Failed RLS policy violations

**Alerts:**
```sql
-- Detect suspicious activity
SELECT 
  user_email,
  COUNT(*) as failed_attempts
FROM audit_logs
WHERE action = 'FAILED_AUTH'
  AND created_at > now() - interval '1 hour'
GROUP BY user_email
HAVING COUNT(*) > 5;
```

### Response Plan

1. **Identify:** Determine scope and impact
2. **Contain:** Revoke compromised sessions/tokens
3. **Eradicate:** Patch vulnerability
4. **Recover:** Restore from backup if needed
5. **Lessons Learned:** Update security procedures

**Revoke user access:**
```sql
-- Disable user account
UPDATE auth.users 
SET banned_until = now() + interval '24 hours'
WHERE id = suspicious_user_id;

-- Remove roles
DELETE FROM wms_customer_users
WHERE user_id = suspicious_user_id;
```

**Audit investigation:**
```sql
-- Find all actions by user
SELECT * FROM audit_logs
WHERE user_id = suspicious_user_id
ORDER BY created_at DESC;

-- Find data accessed
SELECT DISTINCT table_name, record_id
FROM audit_logs
WHERE user_id = suspicious_user_id
  AND action = 'SELECT';
```

## Compliance

### GDPR Considerations

**Data Export:**
```typescript
// User requests data export
const { data } = await supabase
  .from('profiles')
  .select('*, orders(*), invoices(*)')
  .eq('id', userId)
  .single();
```

**Data Deletion:**
```typescript
// User requests account deletion
await supabase.auth.admin.deleteUser(userId);
// Triggers cascade delete via foreign keys
```

### Data Retention

**Audit logs:** Retained for 7 years
**User data:** Deleted on request (GDPR right to erasure)
**Financial records:** Retained per local regulations

## Security Checklist

- [ ] All tables have RLS enabled
- [ ] All policies tested with different roles
- [ ] No hardcoded credentials in code
- [ ] Secrets stored in environment variables
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (proper escaping)
- [ ] CSRF protection enabled
- [ ] Rate limiting on sensitive endpoints
- [ ] Audit logging on critical operations
- [ ] Regular security reviews
- [ ] Incident response plan documented
- [ ] Backup and recovery tested

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [RLS Policies Documentation](./RLS_POLICIES.md)
