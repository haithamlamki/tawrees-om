-- Add new columns to shipments table for partner acceptance workflow
ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS partner_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS partner_accepted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS partner_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
ADD COLUMN IF NOT EXISTS customer_feedback TEXT,
ADD COLUMN IF NOT EXISTS delivery_confirmed_by_customer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS customer_confirmation_at TIMESTAMP WITH TIME ZONE;

-- Update shipment status to include new states
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS shipments_status_check;
ALTER TABLE public.shipments ADD CONSTRAINT shipments_status_check 
CHECK (status IN ('pending_partner_acceptance', 'processing', 'in_transit', 'customs', 'out_for_delivery', 'delivered', 'completed', 'rejected'));

-- Create shipment_messages table for communication
CREATE TABLE IF NOT EXISTS public.shipment_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'admin', 'partner')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on shipment_messages
ALTER TABLE public.shipment_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for shipment_messages
CREATE POLICY "Users can view messages for their shipments"
ON public.shipment_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shipments s
    JOIN public.shipment_requests sr ON sr.id = s.request_id
    WHERE s.id = shipment_messages.shipment_id
    AND (
      sr.customer_id = auth.uid() OR
      s.assigned_to = auth.uid() OR
      s.assigned_partner_id IN (
        SELECT shipping_partner_id FROM public.user_roles WHERE user_id = auth.uid()
      ) OR
      has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Users can send messages for their shipments"
ON public.shipment_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.shipments s
    JOIN public.shipment_requests sr ON sr.id = s.request_id
    WHERE s.id = shipment_messages.shipment_id
    AND (
      sr.customer_id = auth.uid() OR
      s.assigned_to = auth.uid() OR
      s.assigned_partner_id IN (
        SELECT shipping_partner_id FROM public.user_roles WHERE user_id = auth.uid()
      ) OR
      has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_shipment_messages_shipment_id ON public.shipment_messages(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_messages_created_at ON public.shipment_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_shipments_partner_accepted_at ON public.shipments(partner_accepted_at);

-- Enable realtime for shipment_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipment_messages;