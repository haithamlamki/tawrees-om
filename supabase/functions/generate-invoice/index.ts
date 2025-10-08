import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation helper
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Validate input
    const body = await req.json();
    const requestId = validateUUID(body.requestId);

    // Fetch shipment request with all related data
    const { data: request, error: requestError } = await supabaseClient
      .from("shipment_requests")
      .select(`
        *,
        profiles!customer_id (
          full_name,
          email,
          phone,
          address,
          city,
          country,
          company_name
        ),
        quotes (
          *
        ),
        shipments (
          tracking_number,
          created_at
        )
      `)
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      console.error("[GENERATE-INVOICE] Request query failed");
      throw new Error("Shipment request not found");
    }

    // Check authorization - user must be the customer or an admin
    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some((r) => r.role === "admin");
    const isOwner = request.customer_id === user.id;

    if (!isAdmin && !isOwner) {
      console.error("[GENERATE-INVOICE] Authorization failed");
      throw new Error("Unauthorized");
    }

    // Generate invoice HTML
    const invoiceHTML = generateInvoiceHTML(request);

    return new Response(
      JSON.stringify({
        success: true,
        html: invoiceHTML,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    // Log full error server-side only
    console.error("[GENERATE-INVOICE] Error:", error instanceof Error ? error.message : "Unknown");
    
    // Return sanitized error to client
    return new Response(
      JSON.stringify({ error: "Unable to generate invoice" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

function generateInvoiceHTML(request: any): string {
  const quote = request.quotes?.[0];
  const shipment = request.shipments?.[0];
  const profile = request.profiles;
  const invoiceNumber = `INV-${request.id.slice(0, 8).toUpperCase()}`;
  const invoiceDate = new Date(request.created_at).toLocaleDateString("en-GB");

  const breakdown = quote?.breakdown || {};
  const shipping = breakdown.shipping || 0;
  const customs = breakdown.customs || 0;
  const insurance = breakdown.insurance || 0;
  const handling = breakdown.handling || 0;
  const subtotal = shipping + customs + insurance + handling;
  const total = quote?.total_sell_price || request.calculated_cost;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoiceNumber}</title>
  <style>
    @page {
      margin: 2cm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      border-bottom: 3px solid #667eea;
      padding-bottom: 20px;
    }
    .company-info h1 {
      margin: 0;
      color: #667eea;
      font-size: 28px;
    }
    .invoice-info {
      text-align: right;
    }
    .invoice-info h2 {
      margin: 0 0 10px 0;
      font-size: 24px;
      color: #333;
    }
    .invoice-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }
    .detail-section h3 {
      margin: 0 0 10px 0;
      color: #667eea;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .detail-section p {
      margin: 5px 0;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 40px;
    }
    th {
      background: #f8f9fa;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #667eea;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    .text-right {
      text-align: right;
    }
    .totals {
      margin-left: auto;
      width: 300px;
    }
    .totals tr td {
      padding: 8px 12px;
    }
    .totals .total-row {
      background: #667eea;
      color: white;
      font-weight: bold;
      font-size: 18px;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-approved {
      background: #d4edda;
      color: #155724;
    }
    .status-pending {
      background: #fff3cd;
      color: #856404;
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <h1>📦 Shipping Management</h1>
      <p>Professional Freight Solutions</p>
      <p>Email: support@shipping.com</p>
      <p>Phone: +234 XXX XXX XXXX</p>
    </div>
    <div class="invoice-info">
      <h2>INVOICE</h2>
      <p><strong>#${invoiceNumber}</strong></p>
      <p>Date: ${invoiceDate}</p>
      <p>Status: <span class="status-badge status-${request.status}">${request.status.toUpperCase()}</span></p>
    </div>
  </div>

  <div class="invoice-details">
    <div class="detail-section">
      <h3>Bill To</h3>
      <p><strong>${profile?.full_name || "Customer"}</strong></p>
      ${profile?.company_name ? `<p>${profile.company_name}</p>` : ""}
      ${profile?.email ? `<p>${profile.email}</p>` : ""}
      ${profile?.phone ? `<p>${profile.phone}</p>` : ""}
      ${profile?.address ? `<p>${profile.address}</p>` : ""}
      ${profile?.city && profile?.country ? `<p>${profile.city}, ${profile.country}</p>` : ""}
    </div>
    <div class="detail-section">
      <h3>Shipment Details</h3>
      <p><strong>Type:</strong> ${request.shipping_type.toUpperCase()}</p>
      <p><strong>Method:</strong> ${request.calculation_method || "N/A"}</p>
      ${shipment?.tracking_number ? `<p><strong>Tracking:</strong> ${shipment.tracking_number}</p>` : ""}
      ${request.payment_timing ? `<p><strong>Payment:</strong> ${request.payment_timing === "before" ? "Before Shipping" : "After Delivery"}</p>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Details</th>
        <th class="text-right">Amount (₦)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Shipping Cost</strong></td>
        <td>${request.shipping_type.toUpperCase()} freight service</td>
        <td class="text-right">${shipping.toFixed(2)}</td>
      </tr>
      ${customs > 0 ? `
      <tr>
        <td><strong>Customs & Duties</strong></td>
        <td>Import duties and customs clearance</td>
        <td class="text-right">${customs.toFixed(2)}</td>
      </tr>
      ` : ""}
      ${insurance > 0 ? `
      <tr>
        <td><strong>Insurance</strong></td>
        <td>Cargo insurance coverage</td>
        <td class="text-right">${insurance.toFixed(2)}</td>
      </tr>
      ` : ""}
      ${handling > 0 ? `
      <tr>
        <td><strong>Handling Fees</strong></td>
        <td>Loading, unloading, and handling</td>
        <td class="text-right">${handling.toFixed(2)}</td>
      </tr>
      ` : ""}
    </tbody>
  </table>

  <table class="totals">
    <tr>
      <td><strong>Subtotal:</strong></td>
      <td class="text-right">₦${subtotal.toFixed(2)}</td>
    </tr>
    <tr class="total-row">
      <td><strong>TOTAL:</strong></td>
      <td class="text-right">₦${total.toFixed(2)}</td>
    </tr>
  </table>

  ${breakdown.notes ? `
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 40px;">
    <h3 style="margin-top: 0; color: #667eea;">Additional Notes</h3>
    <p style="margin: 0;">${breakdown.notes}</p>
  </div>
  ` : ""}

  <div class="footer">
    <p><strong>Thank you for your business!</strong></p>
    <p>For questions about this invoice, please contact us at support@shipping.com</p>
    <p>Payment terms: ${request.payment_timing === "before" ? "Payment required before shipping" : "Payment due within 7 days of delivery"}</p>
  </div>
</body>
</html>
  `;
}
