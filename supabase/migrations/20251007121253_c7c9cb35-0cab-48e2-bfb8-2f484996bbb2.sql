-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create container_types table
CREATE TABLE public.container_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  size_feet INTEGER NOT NULL,
  cbm_capacity DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.container_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view container types"
  ON public.container_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage container types"
  ON public.container_types FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert standard container types
INSERT INTO public.container_types (name, size_feet, cbm_capacity, description) VALUES
('20ft Standard', 20, 33.00, '20-foot standard container'),
('40ft Standard', 40, 67.00, '40-foot standard container'),
('40ft High Cube', 40, 76.00, '40-foot high cube container'),
('45ft High Cube', 45, 86.00, '45-foot high cube container');

-- Create shipping_rates table
CREATE TABLE public.shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_type TEXT NOT NULL CHECK (rate_type IN ('sea_cbm', 'sea_container', 'air_kg')),
  container_type_id UUID REFERENCES public.container_types(id),
  base_rate DECIMAL(10,2) NOT NULL,
  margin_percentage DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rates"
  ON public.shipping_rates FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage rates"
  ON public.shipping_rates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default rates
INSERT INTO public.shipping_rates (rate_type, base_rate, margin_percentage) VALUES
('sea_cbm', 50.00, 15.00),
('air_kg', 5.00, 20.00);

INSERT INTO public.shipping_rates (rate_type, container_type_id, base_rate, margin_percentage)
SELECT 'sea_container', id, 2000.00, 15.00 FROM public.container_types WHERE size_feet = 20
UNION ALL
SELECT 'sea_container', id, 3500.00, 15.00 FROM public.container_types WHERE size_feet = 40 AND name LIKE '%Standard%'
UNION ALL
SELECT 'sea_container', id, 4000.00, 15.00 FROM public.container_types WHERE size_feet = 40 AND name LIKE '%High Cube%'
UNION ALL
SELECT 'sea_container', id, 4500.00, 15.00 FROM public.container_types WHERE size_feet = 45;

-- Create shipment_requests table
CREATE TABLE public.shipment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  shipping_type TEXT NOT NULL CHECK (shipping_type IN ('sea', 'air')),
  calculation_method TEXT CHECK (calculation_method IN ('cbm', 'container', 'weight')),
  container_type_id UUID REFERENCES public.container_types(id),
  cbm_volume DECIMAL(10,2),
  weight_kg DECIMAL(10,2),
  length_cm DECIMAL(10,2),
  width_cm DECIMAL(10,2),
  height_cm DECIMAL(10,2),
  calculated_cost DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  payment_timing TEXT CHECK (payment_timing IN ('before', 'after')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own requests"
  ON public.shipment_requests FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create requests"
  ON public.shipment_requests FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can view all requests"
  ON public.shipment_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update requests"
  ON public.shipment_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create shipments table (approved shipments with tracking)
CREATE TABLE public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.shipment_requests(id) ON DELETE CASCADE NOT NULL,
  tracking_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'in_transit', 'customs', 'ready_for_pickup', 'delivered')),
  estimated_delivery TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view shipments for their requests"
  ON public.shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shipment_requests
      WHERE shipment_requests.id = shipments.request_id
      AND shipment_requests.customer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all shipments"
  ON public.shipments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to generate tracking number
CREATE OR REPLACE FUNCTION public.generate_tracking_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  tracking_num TEXT;
BEGIN
  tracking_num := 'TRK' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN tracking_num;
END;
$$;

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  );
  
  -- Assign customer role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipping_rates_updated_at
  BEFORE UPDATE ON public.shipping_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipment_requests_updated_at
  BEFORE UPDATE ON public.shipment_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();