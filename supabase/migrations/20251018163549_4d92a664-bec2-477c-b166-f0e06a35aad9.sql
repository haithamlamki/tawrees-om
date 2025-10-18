-- Add new fields to shipping_partners table for enhanced profile
ALTER TABLE public.shipping_partners
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS bank_account_number text,
ADD COLUMN IF NOT EXISTS bank_account_name text,
ADD COLUMN IF NOT EXISTS bank_iban text,
ADD COLUMN IF NOT EXISTS bank_swift_code text,
ADD COLUMN IF NOT EXISTS bank_branch text,
ADD COLUMN IF NOT EXISTS tax_registration_number text;

-- Create storage bucket for partner logos if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-logos', 'partner-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for partner-logos bucket
CREATE POLICY "Partners can upload their own logo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'partner-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Partners can update their own logo"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'partner-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Partners can delete their own logo"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'partner-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view partner logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'partner-logos');