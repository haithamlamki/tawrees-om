-- Fix search path for contract number generation functions
CREATE OR REPLACE FUNCTION generate_wms_contract_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num BIGINT;
  contract_num TEXT;
BEGIN
  next_num := nextval('wms_contract_number_seq');
  contract_num := 'CON-' || LPAD(next_num::TEXT, 11, '0');
  RETURN contract_num;
END;
$$;

CREATE OR REPLACE FUNCTION set_contract_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    NEW.contract_number := generate_wms_contract_number();
  END IF;
  RETURN NEW;
END;
$$;