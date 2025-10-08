-- Fix Function Search Path for sanitize_error_message
CREATE OR REPLACE FUNCTION public.sanitize_error_message(error_msg text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
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