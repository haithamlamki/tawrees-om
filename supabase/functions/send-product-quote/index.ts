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
    const payload = await req.json();
    const {
      product,
      unitPrice,
      subtotal,
      shippingFee,
      discount,
      discountAmount,
      total,
      eta,
      currency,
      breakdown,
      customerInfo,
    } = payload;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate quote ID
    const date = new Date();
    const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
    
    // Get count of quotes today to generate sequence
    const { count } = await supabase
      .from("product_quotes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", date.toISOString().split("T")[0]);

    const sequence = String((count || 0) + 1).padStart(4, "0");
    const quoteId = `PQ-${dateStr}-${sequence}`;

    // Calculate valid until (7 days)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (product.quote_validity_days || 7));

    // Insert quote into database
    const { error: insertError } = await supabase
      .from("product_quotes")
      .insert([{
        quote_id: quoteId,
        product_id: product.id,
        customer_name: customerInfo.customerName,
        customer_email: customerInfo.customerEmail,
        customer_phone: customerInfo.customerPhone,
        preferred_channel: customerInfo.preferredChannel,
        quantity: customerInfo.quantity,
        delivery_city: customerInfo.deliveryCity,
        delivery_country: customerInfo.deliveryCountry,
        notes: customerInfo.notes,
        unit_price: unitPrice,
        subtotal: subtotal,
        shipping_fee: shippingFee,
        discount_name: discount,
        discount_amount: discountAmount || 0,
        total_amount: total,
        eta_days: eta,
        breakdown: breakdown,
        valid_until: validUntil.toISOString(),
        status: "sent",
        sent_at: new Date().toISOString(),
      }]);

    if (insertError) {
      throw insertError;
    }

    // Send email if preferred channel is email
    if (customerInfo.preferredChannel === "email") {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

      const emailHtml = `
        <h1>Your Quote for ${product.name}</h1>
        <p>Hi ${customerInfo.customerName},</p>
        <p>Thanks for your request for <strong>${product.name}</strong>. Here's your instant offer:</p>
        
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Quantity:</td>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>${customerInfo.quantity} units</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Unit price:</td>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>${unitPrice} ${currency}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Subtotal:</td>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>${subtotal} ${currency}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Shipping to ${customerInfo.deliveryCity}:</td>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>${shippingFee} ${currency}</strong></td>
          </tr>
          ${discount ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">Discount (${discount}):</td>
            <td style="padding: 8px; border: 1px solid #ddd; color: green;"><strong>-${discountAmount} ${currency}</strong></td>
          </tr>
          ` : ''}
          <tr style="background-color: #f9f9f9;">
            <td style="padding: 12px; border: 1px solid #ddd;"><strong>Estimated Total:</strong></td>
            <td style="padding: 12px; border: 1px solid #ddd;"><strong style="font-size: 18px;">${total} ${currency}</strong></td>
          </tr>
        </table>

        <p><strong>Estimated Delivery:</strong> ${eta} days after order confirmation</p>

        <h3>What's next:</h3>
        <ol>
          <li>Reply to confirm your delivery address and company details</li>
          <li>We'll issue a formal Proforma Invoice (PI)</li>
          <li>We'll share tracking information once shipped</li>
        </ol>

        <p><strong>Quote Reference:</strong> ${quoteId}<br>
        <strong>Valid until:</strong> ${validUntil.toLocaleDateString()}</p>

        <p>Need help? Contact us at support@tawreed.com</p>

        <p>Thank you,<br>
        <strong>Tawreed Sales Team</strong></p>
      `;

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Tawreed <onboarding@resend.dev>",
          to: [customerInfo.customerEmail],
          subject: `Your Quote for ${product.name} – Ref ${quoteId}`,
          html: emailHtml,
        }),
      });

      if (!resendResponse.ok) {
        console.error("Resend API error:", await resendResponse.text());
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        quoteId,
        message: `Quote sent successfully via ${customerInfo.preferredChannel}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error sending quote:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send quote" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
