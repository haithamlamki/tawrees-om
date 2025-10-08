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

// Input validation helpers
function validateUUID(id: unknown): string {
  if (typeof id !== "string") {
    throw new Error("Invalid input");
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new Error("Invalid input");
  }
  return id;
}

function validateAmount(amount: unknown): number {
  if (typeof amount !== "number" || isNaN(amount) || amount <= 0 || amount > 1000000000) {
    throw new Error("Invalid input");
  }
  return amount;
}

function validateCurrency(currency: unknown): string {
  const allowedCurrencies = ["ngn", "usd", "omr", "eur", "gbp"];
  if (typeof currency !== "string" || !allowedCurrencies.includes(currency.toLowerCase())) {
    return "ngn"; // Default
  }
  return currency.toLowerCase();
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Unauthorized");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) {
      throw new Error("Unauthorized");
    }

    console.log("[CREATE-PAYMENT] User authenticated");

    // Validate input
    const body = await req.json() as PaymentRequest;
    const requestId = validateUUID(body.requestId);
    const amount = validateAmount(body.amount);
    const currency = validateCurrency(body.currency);

    // Verify the request belongs to the user with RLS protection
    const { data: request, error: requestError } = await supabaseClient
      .from("shipment_requests")
      .select("*")
      .eq("id", requestId)
      .eq("customer_id", user.id)
      .single();

    if (requestError || !request) {
      console.error("[CREATE-PAYMENT] Request verification failed");
      throw new Error("Shipment request not found");
    }

    console.log("[CREATE-PAYMENT] Request verified");

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-PAYMENT] Existing customer found");
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: `Shipment - ${request.shipping_type.toUpperCase()}`,
              description: `Payment for shipment request`,
            },
            unit_amount: Math.round(amount * 100),
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

    console.log("[CREATE-PAYMENT] Checkout session created");

    // Create payment record with RLS protection
    const { error: paymentError } = await supabaseClient
      .from("payments")
      .insert({
        shipment_request_id: requestId,
        customer_id: user.id,
        stripe_customer_id: customerId || null,
        amount,
        currency: currency,
        status: "pending",
      });

    if (paymentError) {
      console.error("[CREATE-PAYMENT] Payment record creation failed:", paymentError.message);
    }

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    // Log full error server-side only
    console.error("[CREATE-PAYMENT] Error:", error instanceof Error ? error.message : "Unknown");
    
    // Return sanitized error to client
    return new Response(
      JSON.stringify({ error: "Unable to create payment session" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
