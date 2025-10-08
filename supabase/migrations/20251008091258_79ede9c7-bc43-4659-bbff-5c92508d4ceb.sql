-- Create products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text NOT NULL CHECK (char_length(short_name) <= 30),
  slug text UNIQUE NOT NULL,
  sku text UNIQUE NOT NULL,
  category text,
  tags text[] DEFAULT '{}',
  
  -- Media
  youtube_id text NOT NULL,
  youtube_title text,
  youtube_duration integer,
  hero_thumbnail text NOT NULL,
  gallery_images jsonb DEFAULT '[]',
  
  -- Pricing
  currency text DEFAULT 'OMR',
  base_unit_price numeric NOT NULL CHECK (base_unit_price > 0),
  min_order_qty integer NOT NULL CHECK (min_order_qty > 0),
  pricing_tiers jsonb DEFAULT '[]',
  msrp numeric,
  
  -- Logistics
  weight_kg numeric CHECK (weight_kg >= 0),
  dims_cm jsonb,
  volume_cbm numeric GENERATED ALWAYS AS (
    CASE 
      WHEN dims_cm IS NOT NULL 
      THEN ((dims_cm->>'l')::numeric * (dims_cm->>'w')::numeric * (dims_cm->>'h')::numeric) / 1000000
      ELSE NULL 
    END
  ) STORED,
  origin_city text,
  origin_province text,
  origin_country text DEFAULT 'CN',
  hs_code text,
  lead_time_days integer CHECK (lead_time_days >= 0),
  
  -- Quote Settings
  delivery_options text[] DEFAULT '{pickup,door}',
  shipping_template_id text,
  quote_validity_days integer DEFAULT 7,
  default_quote_note text,
  whatsapp_number text,
  
  -- Content
  summary text CHECK (char_length(summary) <= 160),
  highlight_bullets jsonb DEFAULT '[]',
  description text,
  specs jsonb DEFAULT '{}',
  
  -- SEO
  meta_title text CHECK (char_length(meta_title) <= 60),
  meta_description text CHECK (char_length(meta_description) <= 160),
  og_image text,
  canonical_url text,
  
  -- Alibaba Import
  source_type text CHECK (source_type IN ('manual', 'alibaba', 'other')),
  source_url text,
  source_hash text,
  html_snapshot_id text,
  supplier_data jsonb,
  extraction_metadata jsonb,
  
  -- Status & Audit
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz,
  version_note text
);

-- Create product quotes table
CREATE TABLE public.product_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id text UNIQUE NOT NULL,
  
  -- Product & Customer
  product_id uuid REFERENCES products(id) ON DELETE RESTRICT,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  preferred_channel text CHECK (preferred_channel IN ('email', 'whatsapp')),
  
  -- Request Details
  quantity integer NOT NULL CHECK (quantity > 0),
  delivery_city text NOT NULL,
  delivery_country text NOT NULL,
  notes text,
  
  -- Computed Offer
  unit_price numeric NOT NULL,
  subtotal numeric NOT NULL,
  shipping_fee numeric NOT NULL,
  discount_name text,
  discount_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  eta_days integer,
  
  -- Metadata
  breakdown jsonb,
  valid_until timestamptz NOT NULL,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'won', 'lost', 'expired')),
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  opened_at timestamptz,
  won_at timestamptz
);

-- Add trigger for products updated_at
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for products
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_youtube_id ON products(youtube_id);
CREATE INDEX idx_products_source_hash ON products(source_hash);
CREATE UNIQUE INDEX idx_products_source_hash_unique ON products(source_hash) WHERE source_hash IS NOT NULL;

-- Create indexes for product_quotes
CREATE INDEX idx_product_quotes_product ON product_quotes(product_id);
CREATE INDEX idx_product_quotes_email ON product_quotes(customer_email);
CREATE INDEX idx_product_quotes_status ON product_quotes(status);
CREATE INDEX idx_product_quotes_quote_id ON product_quotes(quote_id);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_quotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products
CREATE POLICY "Public can view published products"
  ON products FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for product_quotes
CREATE POLICY "Anyone can create product quotes"
  ON product_quotes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all product quotes"
  ON product_quotes FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product quotes"
  ON product_quotes FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Create storage bucket for Alibaba snapshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('alibaba-snapshots', 'alibaba-snapshots', false);

-- Storage policies for alibaba-snapshots
CREATE POLICY "Admins can upload alibaba snapshots"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'alibaba-snapshots' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view alibaba snapshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'alibaba-snapshots' AND has_role(auth.uid(), 'admin'));

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true);

-- Storage policies for product-images
CREATE POLICY "Anyone can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'));