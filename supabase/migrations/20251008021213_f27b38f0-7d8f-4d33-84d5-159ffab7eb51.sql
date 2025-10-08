-- Create enum for rate types
CREATE TYPE public.rate_type AS ENUM (
  'AIR_KG',
  'SEA_CBM',
  'SEA_CONTAINER_20',
  'SEA_CONTAINER_40',
  'SEA_CONTAINER_40HC',
  'SEA_CONTAINER_45HC'
);

-- Create origins table (China only)
CREATE TABLE public.origins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_port BOOLEAN NOT NULL DEFAULT false,
  country TEXT NOT NULL DEFAULT 'CN',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(name, country)
);

-- Create destinations table
CREATE TABLE public.destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(name, country)
);

-- Create agreements table
CREATE TABLE public.agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.shipping_partners(id),
  origin_id UUID NOT NULL REFERENCES public.origins(id),
  destination_id UUID NOT NULL REFERENCES public.destinations(id),
  rate_type public.rate_type NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  buy_price NUMERIC(10,2) NOT NULL,
  sell_price NUMERIC(10,2) NOT NULL,
  margin_percent NUMERIC(5,2) NOT NULL,
  min_charge NUMERIC(10,2),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to TIMESTAMPTZ,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.origins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for origins
CREATE POLICY "Anyone can view active origins"
ON public.origins FOR SELECT
USING (active = true);

CREATE POLICY "Admins can manage origins"
ON public.origins FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can manage origins"
ON public.origins FOR ALL
USING (has_role(auth.uid(), 'shipping_partner'::app_role))
WITH CHECK (has_role(auth.uid(), 'shipping_partner'::app_role));

-- RLS Policies for destinations
CREATE POLICY "Anyone can view active destinations"
ON public.destinations FOR SELECT
USING (active = true);

CREATE POLICY "Admins can manage destinations"
ON public.destinations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can manage destinations"
ON public.destinations FOR ALL
USING (has_role(auth.uid(), 'shipping_partner'::app_role))
WITH CHECK (has_role(auth.uid(), 'shipping_partner'::app_role));

-- RLS Policies for agreements
CREATE POLICY "Admins can view all agreements"
ON public.agreements FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can view own agreements"
ON public.agreements FOR SELECT
USING (
  has_role(auth.uid(), 'shipping_partner'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'shipping_partner'::app_role 
    AND shipping_partner_id = agreements.partner_id
  )
);

CREATE POLICY "Admins can manage all agreements"
ON public.agreements FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can manage own agreements"
ON public.agreements FOR ALL
USING (
  has_role(auth.uid(), 'shipping_partner'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'shipping_partner'::app_role 
    AND shipping_partner_id = agreements.partner_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'shipping_partner'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'shipping_partner'::app_role 
    AND shipping_partner_id = agreements.partner_id
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_origins_updated_at
BEFORE UPDATE ON public.origins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_destinations_updated_at
BEFORE UPDATE ON public.destinations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agreements_updated_at
BEFORE UPDATE ON public.agreements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data: Origins (China)
INSERT INTO public.origins (name, is_port, country) VALUES
  ('Shenzhen', true, 'CN'),
  ('Shanghai', true, 'CN'),
  ('Guangzhou', true, 'CN'),
  ('Ningbo', true, 'CN'),
  ('Yiwu', false, 'CN');

-- Seed data: Destinations
INSERT INTO public.destinations (name, country) VALUES
  ('Muscat', 'OM'),
  ('Dubai', 'AE'),
  ('Riyadh', 'SA'),
  ('Kuwait City', 'KW'),
  ('Doha', 'QA');