import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation helper
function validateSessionId(sessionId: unknown): string {
  if (typeof sessionId !== "string") {
    throw new Error("Invalid input");
  }
  if (!sessionId || sessionId.length < 10 || sessionId.length > 500) {
    throw new Error("Invalid input");
  }
  if (!sessionId.startsWith("cs_")) {
    throw new Error("Invalid input");
  }
  return sessionId;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use ANON_KEY with proper authentication instead of SERVICE_ROLE_KEY
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    console.log("[VERIFY-PAYMENT] Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Unauthorized");
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      console.error("[VERIFY-PAYMENT] Auth failed");
      throw new Error("Unauthorized");
    }

    console.log("[VERIFY-PAYMENT] User authenticated:", user.id);

    // Validate input
    const body = await req.json();
    const sessionId = validateSessionId(body.sessionId);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log("[VERIFY-PAYMENT] Session status:", session.payment_status);

    // Verify user owns this payment
    const userId = session.metadata?.user_id;
    if (!userId || userId !== user.id) {
      console.error("[VERIFY-PAYMENT] Ownership verification failed");
      throw new Error("Unauthorized");
    }

    if (session.payment_status === "paid") {
      const requestId = session.metadata?.shipment_request_id;

      if (!requestId) {
        console.error("[VERIFY-PAYMENT] Missing metadata");
        throw new Error("Invalid session");
      }

      // Update payment record using RLS-protected query
      const { error: paymentUpdateError } = await supabaseClient
        .from("payments")
        .update({
          stripe_payment_intent_id: session.payment_intent as string,
          status: "completed",
          paid_at: new Date().toISOString(),
          payment_method: session.payment_method_types?.[0] || null,
        })
        .eq("shipment_request_id", requestId)
        .eq("customer_id", user.id);

      if (paymentUpdateError) {
        console.error("[VERIFY-PAYMENT] Payment update failed:", paymentUpdateError.message);
        throw new Error("Update failed");
      }

      // Update shipment request status using RLS-protected query
      const { error: requestUpdateError } = await supabaseClient
        .from("shipment_requests")
        .update({ status: "paid" })
        .eq("id", requestId)
        .eq("customer_id", user.id);

      if (requestUpdateError) {
        console.error("[VERIFY-PAYMENT] Request update failed:", requestUpdateError.message);
        throw new Error("Update failed");
      }

      console.log("[VERIFY-PAYMENT] Payment verified successfully");

      return new Response(
        JSON.stringify({
          success: true,
          paid: true,
          amount: session.amount_total ? session.amount_total / 100 : 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, paid: false }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    // Log full error server-side only
    console.error("[VERIFY-PAYMENT] Error:", error instanceof Error ? error.message : "Unknown");
    
    // Return sanitized error to client
    return new Response(
      JSON.stringify({ 
        error: "Payment verification failed",
        success: false 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
