export interface Product {
  id: string;
  name: string;
  short_name: string;
  slug: string;
  sku: string;
  category: string | null;
  tags: string[];
  
  // Media
  youtube_id: string;
  youtube_title: string | null;
  youtube_duration: number | null;
  hero_thumbnail: string;
  gallery_images: string[];
  
  // Pricing
  currency: string;
  base_unit_price: number;
  min_order_qty: number;
  pricing_tiers: PricingTier[];
  msrp: number | null;
  
  // Logistics
  weight_kg: number | null;
  dims_cm: Dimensions | null;
  volume_cbm: number | null;
  origin_city: string | null;
  origin_province: string | null;
  origin_country: string;
  hs_code: string | null;
  lead_time_days: number | null;
  
  // Quote Settings
  delivery_options: string[];
  shipping_template_id: string | null;
  quote_validity_days: number;
  default_quote_note: string | null;
  whatsapp_number: string | null;
  
  // Content
  summary: string | null;
  highlight_bullets: string[];
  description: string | null;
  specs: Record<string, string>;
  
  // SEO
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
  
  // Alibaba Import
  source_type: 'manual' | 'alibaba' | 'other' | null;
  source_url: string | null;
  source_hash: string | null;
  html_snapshot_id: string | null;
  supplier_data: SupplierData | null;
  extraction_metadata: Record<string, any> | null;
  
  // Status & Audit
  status: 'draft' | 'published' | 'archived';
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  version_note: string | null;
}

export interface PricingTier {
  minQty: number;
  unitPrice: number;
  currency?: string;
}

export interface Dimensions {
  l: number;
  w: number;
  h: number;
}

export interface SupplierData {
  name: string | null;
  rating: number | null;
  years: number | null;
  responseRate: number | null;
  badges: string[];
  tradeAssurance: boolean;
  certifications: string[];
}

export interface ProductQuote {
  id: string;
  quote_id: string;
  product_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  preferred_channel: 'email' | 'whatsapp';
  quantity: number;
  delivery_city: string;
  delivery_country: string;
  notes: string | null;
  unit_price: number;
  subtotal: number;
  shipping_fee: number;
  discount_name: string | null;
  discount_amount: number;
  total_amount: number;
  eta_days: number | null;
  breakdown: QuoteBreakdown | null;
  valid_until: string;
  status: 'sent' | 'opened' | 'won' | 'lost' | 'expired';
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  opened_at: string | null;
  won_at: string | null;
}

export interface QuoteBreakdown {
  basePrice: number;
  tierDiscount?: number;
  quantityDiscount?: number;
  shippingBreakdown?: {
    baseFee: number;
    weightFee: number;
    volumeFee: number;
    cityFee: number;
  };
  taxes?: {
    vat: number;
    customs: number;
  };
}

export interface AlibabaImportResult {
  success: boolean;
  product?: Partial<Product>;
  snapshotId?: string;
  error?: string;
  warnings?: string[];
}

export interface AlibabaEnhancementResult {
  success: boolean;
  enhanced?: Partial<Product>;
  error?: string;
}
