-- Enable RLS on WMS tables if not already enabled
ALTER TABLE wms_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wms_inventory ENABLE ROW LEVEL SECURITY;

-- WMS Customers Policies
CREATE POLICY "Admins can view all WMS customers"
ON wms_customers FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert WMS customers"
ON wms_customers FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update WMS customers"
ON wms_customers FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete WMS customers"
ON wms_customers FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Customer users can view their own customer details
CREATE POLICY "Customer users can view their WMS customer"
ON wms_customers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM wms_customer_users
    WHERE wms_customer_users.user_id = auth.uid()
    AND wms_customer_users.customer_id = wms_customers.id
  )
);

-- WMS Contracts Policies
CREATE POLICY "Admins can view all WMS contracts"
ON wms_contracts FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert WMS contracts"
ON wms_contracts FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update WMS contracts"
ON wms_contracts FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete WMS contracts"
ON wms_contracts FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Customer users can view their own contracts
CREATE POLICY "Customer users can view their WMS contracts"
ON wms_contracts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM wms_customer_users
    WHERE wms_customer_users.user_id = auth.uid()
    AND wms_customer_users.customer_id = wms_contracts.customer_id
  )
);

-- WMS Inventory Policies
CREATE POLICY "Admins can view all WMS inventory"
ON wms_inventory FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert WMS inventory"
ON wms_inventory FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update WMS inventory"
ON wms_inventory FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete WMS inventory"
ON wms_inventory FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Customer users can view their own inventory
CREATE POLICY "Customer users can view their WMS inventory"
ON wms_inventory FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM wms_customer_users
    WHERE wms_customer_users.user_id = auth.uid()
    AND wms_customer_users.customer_id = wms_inventory.customer_id
  )
);