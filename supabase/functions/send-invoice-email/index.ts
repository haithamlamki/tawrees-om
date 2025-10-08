import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoiceId, recipientEmail } = await req.json();

    if (!invoiceId || !recipientEmail) {
      throw new Error('Missing required parameters: invoiceId and recipientEmail');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Fetching invoice ${invoiceId} for email to ${recipientEmail}`);

    // Fetch invoice details with customer info
    const { data: invoice, error: invoiceError } = await supabase
      .from('wms_invoices')
      .select(`
        *,
        customer:wms_customers(name, email, customer_code, vatin),
        items:wms_invoice_items(*)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error(`Invoice not found: ${invoiceError?.message}`);
    }

    // Calculate totals
    const { data: totals } = await supabase
      .rpc('calculate_invoice_totals', { p_invoice_id: invoiceId });

    console.log('Sending invoice email via Resend');

    // Send email using Resend API
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Tawreed WMS <invoices@tawreed.com>',
        to: recipientEmail,
        subject: `Tax Invoice ${invoice.invoice_number}`,
        html: `
          <h1>Tax Invoice / فاتورة ضريبية</h1>
          <p>Dear ${invoice.customer.name},</p>
          <p>Please find attached your tax-compliant invoice.</p>
          
          <h2>Invoice Details</h2>
          <ul>
            <li><strong>Invoice Number:</strong> ${invoice.invoice_number}</li>
            <li><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</li>
            <li><strong>Subtotal:</strong> ${totals.subtotal} ${totals.currency}</li>
            <li><strong>VAT (${totals.vat_rate}%):</strong> ${totals.tax_amount} ${totals.currency}</li>
            <li><strong>Total Amount:</strong> ${totals.total_amount} ${totals.currency}</li>
          </ul>
          
          <p>Payment Terms: ${invoice.payment_terms || 'Due upon receipt'}</p>
          ${invoice.due_date ? `<p>Due Date: ${new Date(invoice.due_date).toLocaleDateString()}</p>` : ''}
          
          <p>Thank you for your business!</p>
          <p>Tawreed WMS Team</p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    const emailResult = await emailResponse.json();

    // Log email sent
    await supabase.from('email_logs').insert({
      recipient_email: recipientEmail,
      recipient_user_id: invoice.customer_id,
      subject: `Tax Invoice ${invoice.invoice_number}`,
      template_type: 'invoice_ready',
      status: 'sent',
      sent_at: new Date().toISOString(),
      metadata: {
        invoice_id: invoiceId,
        invoice_number: invoice.invoice_number,
        resend_id: emailResult.id,
      },
    });

    console.log('Invoice email sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResult.id,
        message: 'Invoice email sent successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending invoice email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
