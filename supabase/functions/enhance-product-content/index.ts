import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.log("LOVABLE_API_KEY not configured, using fallback enhancement");
      // Fallback to simple enhancements without AI
      return new Response(
        JSON.stringify({
          success: true,
          enhanced: {
            short_name: product.name?.substring(0, 30) || product.short_name,
            summary: product.summary || `${product.name} - Quality product with competitive pricing`,
            meta_title: product.name?.substring(0, 60) || product.meta_title,
            meta_description: product.summary?.substring(0, 160) || `${product.name} - Shop now`,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Use Lovable AI with tool calling for structured output
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You enhance product information for e-commerce listings. Generate concise, benefit-focused content.",
          },
          {
            role: "user",
            content: `Enhance this product:\nName: ${product.name}\nCurrent summary: ${product.summary || "none"}\nSpecs: ${JSON.stringify(product.specs || {})}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "enhance_product",
              description: "Enhance product content with SEO-optimized text",
              parameters: {
                type: "object",
                properties: {
                  short_name: {
                    type: "string",
                    description: "Shortened product name (max 30 chars)",
                  },
                  summary: {
                    type: "string",
                    description: "Concise summary (max 160 chars)",
                  },
                  highlight_bullets: {
                    type: "array",
                    items: { type: "string" },
                    description: "3 benefit-led bullets (max 60 chars each)",
                  },
                  meta_title: {
                    type: "string",
                    description: "SEO meta title (max 60 chars)",
                  },
                  meta_description: {
                    type: "string",
                    description: "SEO meta description (max 160 chars)",
                  },
                },
                required: ["short_name", "summary", "highlight_bullets", "meta_title", "meta_description"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "enhance_product" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI enhancement error:", response.status, errorText);
      
      // Return fallback enhancement
      return new Response(
        JSON.stringify({
          success: true,
          enhanced: {
            short_name: product.name?.substring(0, 30) || product.short_name,
            summary: product.summary || `${product.name} - Quality product`,
            meta_title: product.name?.substring(0, 60) || product.meta_title,
            meta_description: product.summary?.substring(0, 160) || `${product.name}`,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const enhanced = JSON.parse(toolCall.function.arguments);
      
      return new Response(
        JSON.stringify({
          success: true,
          enhanced,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Fallback if no tool call
    return new Response(
      JSON.stringify({
        success: true,
        enhanced: {
          short_name: product.name?.substring(0, 30) || product.short_name,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Enhancement error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to enhance product" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
