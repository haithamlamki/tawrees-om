import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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

    // Send email via Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Shipping Notifications <onboarding@resend.dev>",
        to: [profile.email],
        subject,
        html: emailContent,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error("Resend API error:", errorData);
      throw new Error(`Failed to send email: ${JSON.stringify(errorData)}`);
    }

    const emailData = await resendResponse.json();

    // Log successful email
    const { error: logUpdateError } = await supabaseClient
      .from("email_logs")
      .insert({
        recipient_user_id: recipientUserId,
        recipient_email: profile.email,
        subject,
        template_type: templateType,
        metadata,
        status: "sent",
        sent_at: new Date().toISOString(),
      });

    if (logUpdateError) {
      console.error("Error updating email log:", logUpdateError);
    }

    console.log("Email sent successfully to:", profile.email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully",
        recipient: profile.email,
        emailId: emailData?.id
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
  const baseStyles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
      .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      .info-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; }
    </style>
  `;

  switch (templateType) {
    case "quote_ready":
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h1>📦 Your Quote is Ready!</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>Great news! We've prepared a detailed quote for your shipment request.</p>
            <div class="info-box">
              <strong>Total Price:</strong> ₦${metadata?.totalPrice || "N/A"}<br>
              <strong>Valid Until:</strong> ${metadata?.validUntil || "N/A"}
            </div>
            <p>Please review the quote in your dashboard and let us know if you'd like to proceed.</p>
            <a href="${Deno.env.get("SUPABASE_URL")?.replace("/supabase", "")}/dashboard" class="button">View Quote</a>
            <p>If you have any questions, feel free to reach out to our team.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Shipping Management System. All rights reserved.</p>
          </div>
        </div>
      `;
    case "status_update":
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h1>📍 Shipment Update</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>Your shipment status has been updated:</p>
            <div class="info-box">
              <strong>Status:</strong> ${metadata?.status || "N/A"}<br>
              <strong>Tracking Number:</strong> ${metadata?.trackingNumber || "N/A"}
              ${metadata?.location ? `<br><strong>Current Location:</strong> ${metadata.location}` : ""}
            </div>
            <p>You can track your shipment in real-time through your dashboard.</p>
            <a href="${Deno.env.get("SUPABASE_URL")?.replace("/supabase", "")}/tracking/${metadata?.trackingNumber}" class="button">Track Shipment</a>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Shipping Management System. All rights reserved.</p>
          </div>
        </div>
      `;
    case "request_approved":
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h1>✅ Request Approved!</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>Excellent news! Your shipment request has been approved and is now being processed.</p>
            <div class="info-box">
              <strong>Tracking Number:</strong> ${metadata?.trackingNumber || "N/A"}
            </div>
            <p>We'll keep you updated as your shipment progresses through each stage of delivery.</p>
            <a href="${Deno.env.get("SUPABASE_URL")?.replace("/supabase", "")}/dashboard" class="button">View Dashboard</a>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Shipping Management System. All rights reserved.</p>
          </div>
        </div>
      `;
    case "document_uploaded":
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h1>📄 New Document Available</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>A new document has been uploaded for your shipment:</p>
            <div class="info-box">
              <strong>Document Type:</strong> ${metadata?.documentType || "N/A"}
            </div>
            <p>You can view and download this document from your dashboard.</p>
            <a href="${Deno.env.get("SUPABASE_URL")?.replace("/supabase", "")}/dashboard" class="button">View Documents</a>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Shipping Management System. All rights reserved.</p>
          </div>
        </div>
      `;
    default:
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h1>📬 Notification</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>You have a new notification regarding your shipment.</p>
            <a href="${Deno.env.get("SUPABASE_URL")?.replace("/supabase", "")}/dashboard" class="button">View Dashboard</a>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Shipping Management System. All rights reserved.</p>
          </div>
        </div>
      `;
  }
}
