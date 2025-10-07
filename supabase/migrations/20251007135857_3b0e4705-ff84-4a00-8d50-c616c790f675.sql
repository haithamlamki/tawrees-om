-- Create payments table to track Stripe payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_request_id uuid REFERENCES public.shipment_requests(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid NOT NULL,
  stripe_payment_intent_id text UNIQUE,
  stripe_customer_id text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'ngn',
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Customers can view their own payments
CREATE POLICY "Customers can view own payments"
ON public.payments
FOR SELECT
USING (auth.uid() = customer_id);

-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
ON public.payments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only authenticated users can create payments
CREATE POLICY "Authenticated users can create payments"
ON public.payments
FOR INSERT
WITH CHECK (auth.uid() = customer_id);

-- Admins can update payment status
CREATE POLICY "Admins can update payments"
ON public.payments
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX idx_payments_request_id ON public.payments(shipment_request_id);
CREATE INDEX idx_payments_stripe_payment_intent ON public.payments(stripe_payment_intent_id);