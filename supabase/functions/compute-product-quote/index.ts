import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 20; // requests
const WINDOW_MS = 60000; // per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(ip)?.filter(t => now - t < WINDOW_MS) || [];
  
  if (requests.length >= RATE_LIMIT) {
    return false;
  }
  
  requests.push(now);
  rateLimitMap.set(ip, requests);
  return true;
}

// Input validation schema
const quoteRequestSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(10000, "Quantity cannot exceed 10000"),
  deliveryCity: z.string().trim().min(2, "City name too short").max(100, "City name too long").regex(/^[a-zA-Z\s-]+$/, "Invalid city name format"),
  deliveryCountry: z.string().trim().min(2, "Country name too short").max(100, "Country name too long")
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting check
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 429 
        }
      );
    }

    // Parse and validate input
    const body = await req.json();
    const validation = quoteRequestSchema.safeParse(body);
    
    if (!validation.success) {
      console.error("[COMPUTE-QUOTE] Validation error:", validation.error);
      return new Response(
        JSON.stringify({ error: "Invalid request parameters" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }

    const { productId, quantity, deliveryCity, deliveryCountry } = validation.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      throw new Error("Product not found");
    }

    // Validate quantity
    if (quantity < product.min_order_qty) {
      throw new Error(`Minimum order quantity is ${product.min_order_qty}`);
    }

    // Calculate unit price (check for tiered pricing)
    let unitPrice = product.base_unit_price;
    const tiers = Array.isArray(product.pricing_tiers) ? product.pricing_tiers : [];
    
    if (tiers.length > 0) {
      // Sort tiers by minQty descending and find applicable tier
      const sortedTiers = [...tiers].sort((a: any, b: any) => b.minQty - a.minQty);
      for (const tier of sortedTiers) {
        if (quantity >= tier.minQty) {
          unitPrice = tier.unitPrice;
          break;
        }
      }
    }

    const subtotal = unitPrice * quantity;

    // Calculate shipping (simplified logic - can be enhanced)
    let shippingFee = 0;
    const weight = product.weight_kg || 0;
    const volume = product.volume_cbm || 0;

    // Base shipping fee
    shippingFee = 50; // Base fee

    // Add weight-based fee
    if (weight > 0) {
      shippingFee += weight * 2; // 2 OMR per kg
    }

    // Add volume-based fee
    if (volume > 0) {
      shippingFee += volume * 100; // 100 OMR per CBM
    }

    // City multiplier (simplified)
    const cityMultipliers: Record<string, number> = {
      muscat: 1.0,
      salalah: 1.5,
      sohar: 1.2,
      nizwa: 1.3,
    };
    
    const cityKey = deliveryCity.toLowerCase();
    const multiplier = cityMultipliers[cityKey] || 1.4;
    shippingFee *= multiplier;

    // Apply discounts
    let discount = null;
    let discountAmount = 0;

    // Quantity discount
    if (quantity >= 100) {
      discount = "Bulk Order (100+ units)";
      discountAmount = subtotal * 0.05; // 5% discount
    } else if (quantity >= 50) {
      discount = "Bulk Order (50+ units)";
      discountAmount = subtotal * 0.03; // 3% discount
    }

    // Tag-based discount
    if (product.tags && Array.isArray(product.tags)) {
      if (product.tags.includes("new")) {
        discount = "New Product Launch";
        discountAmount = Math.max(discountAmount, subtotal * 0.02); // 2% or existing discount
      }
    }

    const total = subtotal + shippingFee - discountAmount;
    const eta = product.lead_time_days || 14;

    const breakdown = {
      basePrice: product.base_unit_price,
      tierApplied: unitPrice !== product.base_unit_price,
      shippingBreakdown: {
        baseFee: 50,
        weightFee: weight * 2,
        volumeFee: volume * 100,
        cityMultiplier: multiplier,
      },
    };

    return new Response(
      JSON.stringify({
        productId,
        unitPrice,
        subtotal,
        shippingFee: Math.round(shippingFee * 100) / 100,
        discount,
        discountAmount: Math.round(discountAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
        eta,
        currency: product.currency,
        breakdown,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[COMPUTE-QUOTE] Error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to compute quote. Please try again." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
