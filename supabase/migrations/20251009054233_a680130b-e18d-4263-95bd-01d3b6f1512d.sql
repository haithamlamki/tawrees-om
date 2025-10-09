-- Add created_user_id column to track automatically created users
ALTER TABLE wms_contracts
ADD COLUMN created_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;