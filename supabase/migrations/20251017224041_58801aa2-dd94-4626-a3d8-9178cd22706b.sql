-- Allow customers to view shipping partners assigned to their shipments
CREATE POLICY "Customers can view shipping partners for their shipments"
ON public.shipping_partners
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.shipments s
    JOIN public.shipment_requests sr ON sr.id = s.request_id
    WHERE s.assigned_partner_id = shipping_partners.id
      AND sr.customer_id = auth.uid()
  )
);