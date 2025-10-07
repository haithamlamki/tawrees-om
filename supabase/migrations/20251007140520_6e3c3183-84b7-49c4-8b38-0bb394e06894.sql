-- Step 1: Add new roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employee';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'shipping_partner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accountant';