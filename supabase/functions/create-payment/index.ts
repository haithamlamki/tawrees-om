import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  requestId: string;
  amount: number;
  currency?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    console.log("[CREATE-PAYMENT] Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    console.log("[CREATE-PAYMENT] User authenticated:", user.email);

    const { requestId, amount, currency = "ngn" } = await req.json() as PaymentRequest;

    // Verify the request belongs to the user
    const { data: request, error: requestError } = await supabaseClient
      .from("shipment_requests")
      .select("*")
      .eq("id", requestId)
      .eq("customer_id", user.id)
      .single();

    if (requestError || !request) {
      throw new Error("Shipment request not found or unauthorized");
    }

    console.log("[CREATE-PAYMENT] Request verified:", requestId);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-PAYMENT] Existing customer found:", customerId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Shipment - ${request.shipping_type.toUpperCase()}`,
              description: `Payment for shipment request #${requestId.slice(0, 8)}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/dashboard?payment=canceled`,
      metadata: {
        shipment_request_id: requestId,
        user_id: user.id,
      },
    });

    console.log("[CREATE-PAYMENT] Checkout session created:", session.id);

    // Create payment record
    const { error: paymentError } = await supabaseClient
      .from("payments")
      .insert({
        shipment_request_id: requestId,
        customer_id: user.id,
        stripe_customer_id: customerId || null,
        amount,
        currency: currency.toLowerCase(),
        status: "pending",
      });

    if (paymentError) {
      console.error("[CREATE-PAYMENT] Error creating payment record:", paymentError);
    }

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[CREATE-PAYMENT] ERROR:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
