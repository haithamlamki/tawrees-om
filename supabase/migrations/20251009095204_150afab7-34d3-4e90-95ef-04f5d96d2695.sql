-- Phase 1: Database Schema Updates

-- 1.1 Update wms_workflow_settings to be customer-specific
ALTER TABLE wms_workflow_settings 
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES wms_customers(id),
  ADD COLUMN IF NOT EXISTS approval_chain JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS employee_can_view_all_orders BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS employee_restricted_to_branch BOOLEAN DEFAULT true;

-- 1.2 Add new WMS roles to app_role enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typcategory = 'E') THEN
    CREATE TYPE app_role AS ENUM ('admin', 'employee', 'accountant', 'customer', 'shipping_partner');
  END IF;
  
  -- Add new values if they don't exist
  BEGIN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'wms_employee';
  EXCEPTION WHEN duplicate_object THEN null;
  END;
  
  BEGIN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'wms_accountant';
  EXCEPTION WHEN duplicate_object THEN null;
  END;
END $$;

-- 1.3 Update wms_customer_users with role information
ALTER TABLE wms_customer_users 
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'viewer',
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Add check constraint for valid roles
ALTER TABLE wms_customer_users DROP CONSTRAINT IF EXISTS valid_customer_user_role;
ALTER TABLE wms_customer_users 
  ADD CONSTRAINT valid_customer_user_role 
  CHECK (role IN ('owner', 'admin', 'employee', 'accountant', 'viewer'));

-- 1.4 Create employee activity tracking table
CREATE TABLE IF NOT EXISTS wms_employee_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES wms_customers(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  order_id UUID REFERENCES wms_orders(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_activities_customer ON wms_employee_activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_employee_activities_employee ON wms_employee_activities(employee_user_id);

-- Enable RLS on new table
ALTER TABLE wms_employee_activities ENABLE ROW LEVEL SECURITY;

-- Phase 2: RLS Policies

-- 2.1 WMS Orders RLS for employees
DROP POLICY IF EXISTS "WMS employees can create orders" ON wms_orders;
CREATE POLICY "WMS employees can create orders"
ON wms_orders FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM wms_customer_users wcu
    WHERE wcu.user_id = auth.uid()
    AND wcu.customer_id = wms_orders.customer_id
    AND (wcu.role IN ('employee', 'owner', 'admin'))
  )
);

DROP POLICY IF EXISTS "WMS employees can view orders" ON wms_orders;
CREATE POLICY "WMS employees can view orders"
ON wms_orders FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM wms_customer_users wcu
    WHERE wcu.user_id = auth.uid()
    AND wcu.customer_id = wms_orders.customer_id
    AND wcu.role IN ('owner', 'admin', 'employee', 'accountant')
  )
);

DROP POLICY IF EXISTS "Customer admins can approve orders" ON wms_orders;
CREATE POLICY "Customer admins can approve orders"
ON wms_orders FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM wms_customer_users wcu
    WHERE wcu.user_id = auth.uid()
    AND wcu.customer_id = wms_orders.customer_id
    AND wcu.role IN ('owner', 'admin')
  )
);

-- 2.2 WMS Invoices RLS for accountants
DROP POLICY IF EXISTS "WMS accountants can view invoices" ON wms_invoices;
CREATE POLICY "WMS accountants can view invoices"
ON wms_invoices FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM wms_customer_users wcu
    WHERE wcu.user_id = auth.uid()
    AND wcu.customer_id = wms_invoices.customer_id
    AND wcu.role IN ('owner', 'admin', 'accountant')
  )
);

DROP POLICY IF EXISTS "WMS accountants can update invoices" ON wms_invoices;
CREATE POLICY "WMS accountants can update invoices"
ON wms_invoices FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM wms_customer_users wcu
    WHERE wcu.user_id = auth.uid()
    AND wcu.customer_id = wms_invoices.customer_id
    AND wcu.role IN ('owner', 'admin', 'accountant')
  )
);

-- 2.3 Workflow Settings RLS
DROP POLICY IF EXISTS "Customer owners can manage workflow settings" ON wms_workflow_settings;
CREATE POLICY "Customer owners can manage workflow settings"
ON wms_workflow_settings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM wms_customer_users wcu
    WHERE wcu.user_id = auth.uid()
    AND wcu.customer_id = wms_workflow_settings.customer_id
    AND wcu.role IN ('owner', 'admin')
  )
);

-- 2.4 Employee Activities RLS
DROP POLICY IF EXISTS "Employees can view own activities" ON wms_employee_activities;
CREATE POLICY "Employees can view own activities"
ON wms_employee_activities FOR SELECT
TO authenticated
USING (employee_user_id = auth.uid());

DROP POLICY IF EXISTS "Customer admins can view all activities" ON wms_employee_activities;
CREATE POLICY "Customer admins can view all activities"
ON wms_employee_activities FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM wms_customer_users wcu
    WHERE wcu.user_id = auth.uid()
    AND wcu.customer_id = wms_employee_activities.customer_id
    AND wcu.role IN ('owner', 'admin')
  )
);

-- System can insert activities
DROP POLICY IF EXISTS "System can insert activities" ON wms_employee_activities;
CREATE POLICY "System can insert activities"
ON wms_employee_activities FOR INSERT
TO authenticated
WITH CHECK (employee_user_id = auth.uid());

-- 2.5 Customer Users RLS (so users can see their colleagues)
DROP POLICY IF EXISTS "Users can view customer users in same organization" ON wms_customer_users;
CREATE POLICY "Users can view customer users in same organization"
ON wms_customer_users FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM wms_customer_users wcu
    WHERE wcu.user_id = auth.uid()
    AND wcu.customer_id = wms_customer_users.customer_id
  )
);

DROP POLICY IF EXISTS "Customer owners can manage users" ON wms_customer_users;
CREATE POLICY "Customer owners can manage users"
ON wms_customer_users FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM wms_customer_users wcu
    WHERE wcu.user_id = auth.uid()
    AND wcu.customer_id = wms_customer_users.customer_id
    AND wcu.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM wms_customer_users wcu
    WHERE wcu.user_id = auth.uid()
    AND wcu.customer_id = wms_customer_users.customer_id
    AND wcu.role IN ('owner', 'admin')
  )
);