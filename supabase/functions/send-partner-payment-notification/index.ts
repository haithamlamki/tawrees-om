import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { payment_id, partner_id, payment_reference, total_amount, invoice_count } = await req.json();

    console.log('Sending partner payment notification:', {
      payment_id,
      partner_id,
      payment_reference,
      total_amount,
      invoice_count,
    });

    // Get partner email
    const { data: partner, error: partnerError } = await supabaseClient
      .from('shipping_partners')
      .select('company_name, email')
      .eq('id', partner_id)
      .single();

    if (partnerError) {
      console.error('Error fetching partner:', partnerError);
      throw partnerError;
    }

    if (!partner.email) {
      console.error('Partner has no email');
      throw new Error('Partner email not found');
    }

    // Get partner users
    const { data: partnerUsers, error: usersError } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'shipping_partner')
      .eq('shipping_partner_id', partner_id);

    if (usersError) {
      console.error('Error fetching partner users:', usersError);
      throw usersError;
    }

    // Create in-app notifications for all partner users
    if (partnerUsers && partnerUsers.length > 0) {
      const notifications = partnerUsers.map(user => ({
        user_id: user.user_id,
        title: 'New Payment Received',
        message: `Payment ${payment_reference} for ${total_amount.toFixed(3)} OMR is ready for confirmation. ${invoice_count} invoice(s) included.`,
        type: 'payment',
        related_id: payment_id,
      }));

      const { error: notifError } = await supabaseClient
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating notifications:', notifError);
      } else {
        console.log(`Created ${notifications.length} in-app notifications`);
      }
    }

    // Send email notification
    const emailBody = {
      to: partner.email,
      subject: `Payment Confirmation Required - ${payment_reference}`,
      html: `
        <h2>Payment Confirmation Required</h2>
        <p>Dear ${partner.company_name},</p>
        <p>A payment has been processed and is awaiting your confirmation.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0;">Payment Details:</h3>
          <p><strong>Payment Reference:</strong> ${payment_reference}</p>
          <p><strong>Amount:</strong> OMR ${total_amount.toFixed(3)}</p>
          <p><strong>Number of Invoices:</strong> ${invoice_count}</p>
        </div>

        <p>Please log in to your partner dashboard to review the payment details and confirm receipt.</p>
        
        <p>
          <a href="${Deno.env.get('SUPABASE_URL')}/partner-dashboard#payments" 
             style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Review Payment
          </a>
        </p>

        <p>Best regards,<br>Tawreed Team</p>
      `,
    };

    // Call email service (Resend)
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Tawreed <notifications@resend.dev>',
          to: emailBody.to,
          subject: emailBody.subject,
          html: emailBody.html,
        }),
      });

      if (!emailResponse.ok) {
        const error = await emailResponse.text();
        console.error('Error sending email:', error);
        throw new Error(`Failed to send email: ${error}`);
      }

      console.log('Email sent successfully');
    } else {
      console.warn('RESEND_API_KEY not configured, skipping email');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in send-partner-payment-notification:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});