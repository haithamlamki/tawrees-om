export const emailTemplates = {
  orderConfirmation: (orderNumber: string, customerName: string) => ({
    subject: `Order Confirmation - ${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">Order Confirmed</h1>
        <p>Dear ${customerName},</p>
        <p>Thank you for your order! We're pleased to confirm that we've received your order <strong>${orderNumber}</strong>.</p>
        <h3>What's Next?</h3>
        <ul>
          <li>We'll process your order within 1-2 business days</li>
          <li>You'll receive a tracking number once shipped</li>
          <li>Estimated delivery: 7-14 business days</li>
        </ul>
        <p>Track your order anytime in your dashboard.</p>
        <p>Best regards,<br>Tawreed Logistics Team</p>
      </div>
    `,
  }),

  orderShipped: (orderNumber: string, trackingNumber: string, customerName: string) => ({
    subject: `Your Order Has Shipped - ${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">Order Shipped!</h1>
        <p>Dear ${customerName},</p>
        <p>Great news! Your order <strong>${orderNumber}</strong> has been shipped.</p>
        <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Tracking Number:</strong></p>
          <p style="font-size: 20px; color: #2d3748; margin: 5px 0;">${trackingNumber}</p>
        </div>
        <p>You can track your shipment in real-time through your dashboard.</p>
        <p>Best regards,<br>Tawreed Logistics Team</p>
      </div>
    `,
  }),

  orderDelivered: (orderNumber: string, customerName: string) => ({
    subject: `Order Delivered - ${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #22543d;">Order Delivered!</h1>
        <p>Dear ${customerName},</p>
        <p>Your order <strong>${orderNumber}</strong> has been successfully delivered.</p>
        <p>We hope you're satisfied with our service. If you have any questions or concerns, please don't hesitate to contact us.</p>
        <p>Thank you for choosing Tawreed Logistics!</p>
        <p>Best regards,<br>Tawreed Logistics Team</p>
      </div>
    `,
  }),

  invoiceGenerated: (invoiceNumber: string, amount: number, dueDate: string, customerName: string) => ({
    subject: `Invoice ${invoiceNumber} - Payment Due`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">New Invoice</h1>
        <p>Dear ${customerName},</p>
        <p>A new invoice has been generated for your account.</p>
        <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p><strong>Amount Due:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Due Date:</strong> ${dueDate}</p>
        </div>
        <p>Please log in to your dashboard to view and pay the invoice.</p>
        <p>Best regards,<br>Tawreed Logistics Team</p>
      </div>
    `,
  }),

  quoteReady: (quoteId: string, amount: number, validUntil: string, customerName: string) => ({
    subject: `Your Quote is Ready - ${quoteId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a365d;">Quote Ready</h1>
        <p>Dear ${customerName},</p>
        <p>Your shipping quote is now available!</p>
        <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Quote ID:</strong> ${quoteId}</p>
          <p><strong>Total Amount:</strong> $${amount.toFixed(2)}</p>
          <p><strong>Valid Until:</strong> ${validUntil}</p>
        </div>
        <p>View your detailed quote in your dashboard and proceed with booking when ready.</p>
        <p>Best regards,<br>Tawreed Logistics Team</p>
      </div>
    `,
  }),

  contractExpiringSoon: (contractNumber: string, expiryDate: string, customerName: string) => ({
    subject: `Contract Expiring Soon - ${contractNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #744210;">Contract Renewal Notice</h1>
        <p>Dear ${customerName},</p>
        <p>This is a friendly reminder that your warehouse contract <strong>${contractNumber}</strong> will expire soon.</p>
        <div style="background: #fef5e7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f39c12;">
          <p style="margin: 0;"><strong>Expiry Date:</strong> ${expiryDate}</p>
        </div>
        <p>Please contact us to discuss renewal options or if you have any questions.</p>
        <p>Best regards,<br>Tawreed Logistics Team</p>
      </div>
    `,
  }),
};

export type EmailTemplate = keyof typeof emailTemplates;
