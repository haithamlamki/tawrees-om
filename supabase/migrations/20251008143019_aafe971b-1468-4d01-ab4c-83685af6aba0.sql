-- Fix Critical Security Issues

-- 1. Secure customer_statistics view with RLS
-- Note: Views don't support RLS directly, so we'll create policies on the underlying tables
-- or recreate as a security barrier view

-- Create admin/accountant only access function for customer_statistics
CREATE OR REPLACE FUNCTION public.can_view_customer_statistics()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'accountant'::app_role);
$$;

-- Since customer_statistics is a view, we need to add RLS to base tables
-- Add additional policy to profiles for customer_statistics access
CREATE POLICY "Admins and accountants can view all profiles for statistics"
ON public.profiles
FOR SELECT
USING (can_view_customer_statistics());

-- 2. Make audit_logs immutable (prevent tampering)
-- Deny all INSERT operations (only triggers/functions should insert)
CREATE POLICY "Only system can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (false);

-- Deny all UPDATE operations
CREATE POLICY "Audit logs cannot be updated"
ON public.audit_logs
FOR UPDATE
USING (false);

-- Deny all DELETE operations  
CREATE POLICY "Audit logs cannot be deleted"
ON public.audit_logs
FOR DELETE
USING (false);

-- 3. Secure email_logs table (make immutable)
CREATE POLICY "Only system can insert email logs"
ON public.email_logs
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Email logs cannot be updated"
ON public.email_logs
FOR UPDATE
USING (false);

CREATE POLICY "Email logs cannot be deleted"
ON public.email_logs
FOR DELETE
USING (false);

-- 4. Add security to push_subscriptions (rate limiting via trigger)
-- Add trigger to prevent excessive subscription creation
CREATE OR REPLACE FUNCTION public.limit_push_subscriptions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_count INTEGER;
BEGIN
  -- Limit to 10 active subscriptions per user
  SELECT COUNT(*) INTO subscription_count
  FROM public.push_subscriptions
  WHERE user_id = NEW.user_id;
  
  IF subscription_count >= 10 THEN
    RAISE EXCEPTION 'Maximum number of push subscriptions (10) reached for this user';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_push_subscription_limit
BEFORE INSERT ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.limit_push_subscriptions();