-- Enable RLS on wms_customer_users
ALTER TABLE public.wms_customer_users ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage all WMS customer users
CREATE POLICY "Admins can manage all WMS customer users"
ON public.wms_customer_users
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Users can view their own WMS customer assignment
CREATE POLICY "Users can view own WMS customer assignment"
ON public.wms_customer_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Employees can view WMS customer users
CREATE POLICY "Employees can view WMS customer users"
ON public.wms_customer_users
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'employee'::app_role));