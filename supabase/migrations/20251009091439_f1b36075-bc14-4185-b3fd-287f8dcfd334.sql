-- Make contract_number nullable and add default value generation
ALTER TABLE wms_contracts 
ALTER COLUMN contract_number DROP NOT NULL;

-- Create sequence for contract numbers
CREATE SEQUENCE IF NOT EXISTS wms_contract_number_seq START WITH 10000100001;

-- Create function to generate contract number
CREATE OR REPLACE FUNCTION generate_wms_contract_number()
RETURNS TEXT
LANGUAGE plpgsql
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

-- Create trigger to set contract_number before insert
CREATE OR REPLACE FUNCTION set_contract_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    NEW.contract_number := generate_wms_contract_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_contract_number ON wms_contracts;
CREATE TRIGGER trigger_set_contract_number
  BEFORE INSERT ON wms_contracts
  FOR EACH ROW
  EXECUTE FUNCTION set_contract_number();