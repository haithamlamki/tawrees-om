-- Allow shipping partners to view shipment_requests for shipments assigned to their company
CREATE POLICY "Partners can view assigned shipment requests"
ON public.shipment_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.shipments s
    JOIN public.user_roles ur
      ON ur.user_id = auth.uid()
     AND ur.role = 'shipping_partner'::app_role
     AND ur.shipping_partner_id = s.assigned_partner_id
    WHERE s.request_id = shipment_requests.id
  )
);

-- Allow shipping partners to view minimal customer profile info for assigned shipments
CREATE POLICY "Partners can view customer profiles for assigned shipments"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.shipment_requests sr
    JOIN public.shipments s ON s.request_id = sr.id
    JOIN public.user_roles ur
      ON ur.user_id = auth.uid()
     AND ur.role = 'shipping_partner'::app_role
     AND ur.shipping_partner_id = s.assigned_partner_id
    WHERE sr.customer_id = profiles.id
  )
);
