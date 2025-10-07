-- Phase 2: Add buy/sell pricing columns to shipping_rates
ALTER TABLE public.shipping_rates
ADD COLUMN buy_price numeric,
ADD COLUMN sell_price numeric;

-- Update existing rates to set sell_price from base_rate for backward compatibility
UPDATE public.shipping_rates
SET sell_price = base_rate
WHERE sell_price IS NULL;

-- Add profit tracking to quotes table
ALTER TABLE public.quotes
ADD COLUMN buy_cost numeric,
ADD COLUMN profit_amount numeric,
ADD COLUMN profit_margin_percentage numeric;