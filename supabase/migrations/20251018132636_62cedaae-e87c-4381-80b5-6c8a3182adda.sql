-- Create a secure function to access customer statistics with proper access control

CREATE OR REPLACE FUNCTION public.get_customer_statistics(
  p_customer_id uuid DEFAULT NULL
)
RETURNS TABLE (
  customer_id uuid,
  full_name text,
  email text,
  company_name text,
  total_requests bigint,
  approved_requests bigint,
  total_shipments bigint,
  total_spent numeric,
  last_request_date timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins and accountants can view all statistics
  IF has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN
    RETURN QUERY
    SELECT *
    FROM customer_statistics cs
    WHERE p_customer_id IS NULL OR cs.customer_id = p_customer_id;
  
  -- Customers can only view their own statistics
  ELSIF auth.uid() IS NOT NULL THEN
    RETURN QUERY
    SELECT *
    FROM customer_statistics cs
    WHERE cs.customer_id = auth.uid();
  
  -- Unauthenticated users get nothing
  ELSE
    RETURN;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_customer_statistics(uuid) TO authenticated;