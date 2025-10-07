import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log("[VERIFY-PAYMENT] Function started");

    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log("[VERIFY-PAYMENT] Session retrieved:", session.id, "Status:", session.payment_status);

    if (session.payment_status === "paid") {
      const requestId = session.metadata?.shipment_request_id;
      const userId = session.metadata?.user_id;

      if (!requestId || !userId) {
        throw new Error("Missing metadata in session");
      }

      // Update payment record
      const { error: paymentUpdateError } = await supabaseClient
        .from("payments")
        .update({
          stripe_payment_intent_id: session.payment_intent as string,
          status: "completed",
          paid_at: new Date().toISOString(),
          payment_method: session.payment_method_types?.[0] || null,
        })
        .eq("shipment_request_id", requestId)
        .eq("customer_id", userId);

      if (paymentUpdateError) {
        console.error("[VERIFY-PAYMENT] Error updating payment:", paymentUpdateError);
      }

      // Update shipment request status
      const { error: requestUpdateError } = await supabaseClient
        .from("shipment_requests")
        .update({ status: "paid" })
        .eq("id", requestId);

      if (requestUpdateError) {
        console.error("[VERIFY-PAYMENT] Error updating request:", requestUpdateError);
      }

      console.log("[VERIFY-PAYMENT] Payment verified and records updated");

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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[VERIFY-PAYMENT] ERROR:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
