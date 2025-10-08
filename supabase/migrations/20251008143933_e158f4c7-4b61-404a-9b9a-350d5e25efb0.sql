-- Fix Critical Security Issues: Part 2 (Fixed)

-- 1. Add missing RLS policies for surcharges table
-- Only create policies if they don't exist
DO $$ 
BEGIN
  -- Admin policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'surcharges' 
    AND policyname = 'Admins can manage all surcharges'
  ) THEN
    CREATE POLICY "Admins can manage all surcharges"
    ON public.surcharges
    FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;

  -- Public view policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'surcharges' 
    AND policyname = 'Public can view active surcharges'
  ) THEN
    CREATE POLICY "Public can view active surcharges"
    ON public.surcharges
    FOR SELECT
    USING (active = true);
  END IF;
END $$;

-- 2. Enhance profiles table protection against enumeration
-- Drop existing policy and replace with more specific one
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile only"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 3. Add function to sanitize error messages for audit logging
CREATE OR REPLACE FUNCTION public.sanitize_error_message(error_msg text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Remove email addresses
  error_msg := regexp_replace(error_msg, '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}', '[EMAIL_REDACTED]', 'g');
  
  -- Remove phone numbers (various formats)
  error_msg := regexp_replace(error_msg, '\+?[0-9]{1,4}?[-.\s]?\(?[0-9]{1,3}?\)?[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}', '[PHONE_REDACTED]', 'g');
  
  -- Remove UUIDs
  error_msg := regexp_replace(error_msg, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '[UUID_REDACTED]', 'gi');
  
  RETURN error_msg;
END;
$$;