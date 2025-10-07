import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  recipientUserId: string;
  templateType: string;
  subject: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { recipientUserId, templateType, subject, metadata } = await req.json() as EmailRequest;

    // Get user profile and email
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("email, full_name")
      .eq("id", recipientUserId)
      .single();

    if (profileError || !profile?.email) {
      throw new Error("User email not found");
    }

    // Check notification preferences
    const { data: preferences } = await supabaseClient
      .from("notification_preferences")
      .select("*")
      .eq("user_id", recipientUserId)
      .single();

    // Check if email notifications are enabled for this type
    const shouldSend = checkEmailPreference(preferences, templateType);

    if (!shouldSend) {
      return new Response(
        JSON.stringify({ message: "Email notifications disabled for this type" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Generate email content based on template
    const emailContent = generateEmailContent(templateType, profile.full_name, metadata);

    // Log email attempt
    const { error: logError } = await supabaseClient
      .from("email_logs")
      .insert({
        recipient_user_id: recipientUserId,
        recipient_email: profile.email,
        subject,
        template_type: templateType,
        metadata,
        status: "pending",
      });

    if (logError) {
      console.error("Error logging email:", logError);
    }

    // In production, integrate with email service (SendGrid, Resend, etc.)
    // For now, we'll just mark as sent
    console.log("Email would be sent to:", profile.email);
    console.log("Subject:", subject);
    console.log("Content:", emailContent);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email notification processed",
        recipient: profile.email 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

function checkEmailPreference(preferences: any, templateType: string): boolean {
  if (!preferences) return true; // Default to sending if no preferences set

  switch (templateType) {
    case "quote_ready":
      return preferences.email_on_quote_ready;
    case "status_update":
      return preferences.email_on_status_update;
    case "request_approved":
      return preferences.email_on_request_approved;
    case "document_uploaded":
      return preferences.email_on_document_uploaded;
    default:
      return true;
  }
}

function generateEmailContent(
  templateType: string,
  userName: string,
  metadata?: Record<string, any>
): string {
  switch (templateType) {
    case "quote_ready":
      return `
        <h1>Your Shipping Quote is Ready</h1>
        <p>Hello ${userName},</p>
        <p>Great news! We've prepared a quote for your shipment request.</p>
        <p><strong>Total Price:</strong> ₦${metadata?.totalPrice || "N/A"}</p>
        <p>Please log in to your dashboard to review and accept the quote.</p>
        <p>The quote is valid until: ${metadata?.validUntil || "N/A"}</p>
      `;
    case "status_update":
      return `
        <h1>Shipment Status Update</h1>
        <p>Hello ${userName},</p>
        <p>Your shipment status has been updated.</p>
        <p><strong>New Status:</strong> ${metadata?.status || "N/A"}</p>
        <p><strong>Tracking Number:</strong> ${metadata?.trackingNumber || "N/A"}</p>
        ${metadata?.location ? `<p><strong>Current Location:</strong> ${metadata.location}</p>` : ""}
        <p>Track your shipment anytime through your dashboard.</p>
      `;
    case "request_approved":
      return `
        <h1>Shipment Request Approved</h1>
        <p>Hello ${userName},</p>
        <p>Your shipment request has been approved!</p>
        <p><strong>Tracking Number:</strong> ${metadata?.trackingNumber || "N/A"}</p>
        <p>We'll keep you updated as your shipment progresses.</p>
      `;
    case "document_uploaded":
      return `
        <h1>New Document Uploaded</h1>
        <p>Hello ${userName},</p>
        <p>A new document has been uploaded for your shipment.</p>
        <p><strong>Document Type:</strong> ${metadata?.documentType || "N/A"}</p>
        <p>You can view it in your dashboard.</p>
      `;
    default:
      return `
        <h1>Notification</h1>
        <p>Hello ${userName},</p>
        <p>You have a new notification regarding your shipment.</p>
      `;
  }
}
