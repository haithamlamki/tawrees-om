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
    const { url } = await req.json();

    // Validate URL
    if (!url || !url.includes("alibaba.com")) {
      throw new Error("Invalid Alibaba URL");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate source hash for duplicate detection
    const sourceHash = await generateHash(url);

    // Check for duplicate
    const { data: existingProduct } = await supabase
      .from("products")
      .select("id")
      .eq("source_hash", sourceHash)
      .maybeSingle();

    if (existingProduct) {
      return new Response(
        JSON.stringify({
          success: false,
          isDuplicate: true,
          existingProductId: existingProduct.id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log("Fetching Alibaba product:", url);

    // Fetch the page (simplified - in production, use headless browser or API)
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const html = await response.text();

    // Store HTML snapshot in storage
    const snapshotId = `${sourceHash}-${Date.now()}`;
    const { error: uploadError } = await supabase.storage
      .from("alibaba-snapshots")
      .upload(`${snapshotId}.html`, html, {
        contentType: "text/html",
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Failed to store snapshot:", uploadError);
    }

    // Parse product data (simplified extraction - enhance with proper parsing)
    const product = parseAlibabaHTML(html, url);

    return new Response(
      JSON.stringify({
        success: true,
        product,
        sourceHash,
        snapshotId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Scrape error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to scrape product" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

async function generateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseAlibabaHTML(html: string, url: string): any {
  // Simplified parsing - extract basic data
  // In production, use proper DOM parsing (cheerio equivalent for Deno)
  
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().split("|")[0].split("-")[0].trim() : "Imported Product";

  // Extract price (simplified regex - improve in production)
  const priceMatch = html.match(/US\s*\$\s*([\d,]+\.?\d*)/i);
  const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, "")) : 10;

  // Extract MOQ
  const moqMatch = html.match(/(\d+)\s*(piece|pieces|unit|units)/i);
  const moq = moqMatch ? parseInt(moqMatch[1]) : 10;

  // Generate SKU from URL
  const urlParts = url.split("/");
  const sku = `ALI-${urlParts[urlParts.length - 1].replace(/[^0-9]/g, "").slice(0, 8) || Date.now().toString().slice(-8)}`;

  // Simplified product structure
  const metaDesc = `${title} - Imported from Alibaba`;
  
  return {
    name: title,
    short_name: title.substring(0, 30),
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 50),
    sku: sku,
    category: "Imported",
    tags: ["alibaba", "imported"],
    youtube_id: "", // Needs to be added manually
    hero_thumbnail: `https://via.placeholder.com/640x360?text=${encodeURIComponent(title.substring(0, 20))}`,
    gallery_images: [],
    currency: "USD",
    base_unit_price: price,
    min_order_qty: moq,
    pricing_tiers: [],
    weight_kg: null,
    dims_cm: null,
    origin_city: null,
    origin_province: null,
    origin_country: "CN",
    lead_time_days: 15,
    delivery_options: ["pickup", "door"],
    quote_validity_days: 7,
    summary: `Imported from Alibaba: ${title}`.substring(0, 160),
    highlight_bullets: ["Quality product", "Competitive pricing", "Fast shipping"],
    description: `Product imported from Alibaba. Please review and update details before publishing.`,
    specs: {},
    meta_title: title.substring(0, 60),
    meta_description: metaDesc.substring(0, 160),
    supplier_data: {
      name: "Alibaba Supplier",
      rating: null,
      years: null,
      responseRate: null,
      badges: [],
      tradeAssurance: false,
      certifications: [],
    },
  };
}
