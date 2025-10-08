import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, quantity, deliveryCity, deliveryCountry } = await req.json();

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
    console.error("Error computing quote:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to compute quote" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
