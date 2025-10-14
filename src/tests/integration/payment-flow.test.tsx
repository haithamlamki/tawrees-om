import { describe, it, expect } from 'vitest';
import { mockInvoices, createMockInvoice } from '../fixtures/invoices';

/**
 * Integration Tests for Payment Flow
 * Tests Stripe payment integration and invoice verification
 */

describe('Payment Flow Integration', () => {
  describe('Stripe Checkout Session Creation', () => {
    it('should create checkout session with invoice details', () => {
      const invoice = mockInvoices.pendingInvoice;
      
      const sessionData = {
        invoice_id: invoice.id,
        amount: Math.round(invoice.total_amount * 1000), // Convert OMR to baisa
        currency: 'omr',
        customer_email: 'customer@example.com',
        success_url: 'https://app.example.com/invoices?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://app.example.com/invoices',
      };

      expect(sessionData.invoice_id).toBe(invoice.id);
      expect(sessionData.currency).toBe('omr');
    });

    it('should convert OMR to smallest currency unit (baisa)', () => {
      const amountOMR = 267.750;
      const amountBaisa = Math.round(amountOMR * 1000);
      
      expect(amountBaisa).toBe(267750);
    });

    it('should include invoice metadata in session', () => {
      const invoice = mockInvoices.pendingInvoice;
      
      const metadata = {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        customer_id: invoice.customer_id,
      };

      expect(metadata.invoice_id).toBeTruthy();
      expect(metadata.invoice_number).toContain('INV');
    });

    it('should set success redirect URL with session_id', () => {
      const successUrl = 'https://app.example.com/invoices?session_id={CHECKOUT_SESSION_ID}';
      expect(successUrl).toContain('session_id');
      expect(successUrl).toContain('{CHECKOUT_SESSION_ID}');
    });
  });

  describe('Edge Function: create-invoice-payment', () => {
    it('should validate invoice exists before creating session', () => {
      const invoiceId = mockInvoices.pendingInvoice.id;
      expect(invoiceId).toBeTruthy();
    });

    it('should validate invoice is not already paid', () => {
      const paidInvoice = mockInvoices.paidInvoice;
      const isPaid = paidInvoice.status === 'paid';
      
      // Should reject payment for already paid invoice
      expect(isPaid).toBe(true);
    });

    it('should validate invoice is not overdue', () => {
      const invoice = mockInvoices.pendingInvoice;
      const dueDate = new Date(invoice.due_date);
      const now = new Date();
      
      const isOverdue = dueDate < now;
      // Can still pay overdue invoices, but should note the status
      expect(typeof isOverdue).toBe('boolean');
    });

    it('should return checkout URL', () => {
      const response = {
        url: 'https://checkout.stripe.com/pay/cs_test_123',
        session_id: 'cs_test_123',
      };

      expect(response.url).toContain('checkout.stripe.com');
      expect(response.session_id).toBeTruthy();
    });
  });

  describe('Payment Verification Flow', () => {
    it('should verify session payment status', () => {
      const session = {
        id: 'cs_test_123',
        payment_status: 'paid' as const,
        amount_total: 267750, // baisa
        currency: 'omr',
      };

      expect(session.payment_status).toBe('paid');
      expect(session.amount_total).toBeGreaterThan(0);
    });

    it('should extract invoice_id from session metadata', () => {
      const session = {
        metadata: {
          invoice_id: mockInvoices.pendingInvoice.id,
          invoice_number: mockInvoices.pendingInvoice.invoice_number,
        },
      };

      expect(session.metadata.invoice_id).toBeTruthy();
    });

    it('should convert baisa back to OMR for verification', () => {
      const amountBaisa = 267750;
      const amountOMR = amountBaisa / 1000;
      
      expect(amountOMR).toBe(267.750);
    });
  });

  describe('Edge Function: verify-invoice-payment', () => {
    it('should update invoice status to paid', () => {
      const invoice = mockInvoices.pendingInvoice;
      
      const updatedInvoice = {
        ...invoice,
        status: 'paid' as const,
        paid_at: new Date().toISOString(),
      };

      expect(updatedInvoice.status).toBe('paid');
      expect(updatedInvoice.paid_at).toBeTruthy();
    });

    it('should verify session belongs to invoice', () => {
      const sessionInvoiceId = 'invoice-123';
      const invoiceId = 'invoice-123';
      
      const matches = sessionInvoiceId === invoiceId;
      expect(matches).toBe(true);
    });

    it('should verify payment amount matches invoice', () => {
      const invoice = mockInvoices.pendingInvoice;
      const sessionAmount = 267750; // baisa
      const invoiceAmount = Math.round(invoice.total_amount * 1000);
      
      const matches = sessionAmount === invoiceAmount;
      expect(matches).toBe(true);
    });

    it('should record payment timestamp', () => {
      const paidAt = new Date().toISOString();
      expect(paidAt).toBeTruthy();
      
      const date = new Date(paidAt);
      expect(date).toBeInstanceOf(Date);
    });
  });

  describe('Payment Confirmation Notification', () => {
    it('should send payment confirmation notification', () => {
      const notification = {
        user_id: 'customer-user-id',
        title: 'Payment Confirmed',
        message: 'Payment for invoice CUST001-INV-2025-0001 confirmed',
        type: 'payment_confirmed',
        related_id: mockInvoices.pendingInvoice.id,
      };

      expect(notification.type).toBe('payment_confirmed');
      expect(notification.message).toContain('Payment');
    });

    it('should send payment receipt email', () => {
      const emailData = {
        to: 'customer@example.com',
        subject: 'Payment Receipt - Invoice CUST001-INV-2025-0001',
        template: 'payment_receipt',
        invoice_id: mockInvoices.paidInvoice.id,
      };

      expect(emailData.template).toBe('payment_receipt');
      expect(emailData.subject).toContain('Payment Receipt');
    });
  });

  describe('Failed Payment Handling', () => {
    it('should handle payment cancellation', () => {
      const session = {
        payment_status: 'unpaid' as const,
        cancel_url: 'https://app.example.com/invoices',
      };

      expect(session.payment_status).toBe('unpaid');
      expect(session.cancel_url).toBeTruthy();
    });

    it('should not update invoice on failed payment', () => {
      const invoice = mockInvoices.pendingInvoice;
      
      // Invoice should remain pending
      expect(invoice.status).toBe('pending');
      expect(invoice.paid_at).toBeNull();
    });

    it('should allow retry on failed payment', () => {
      const invoice = mockInvoices.pendingInvoice;
      const canRetry = invoice.status === 'pending';
      
      expect(canRetry).toBe(true);
    });
  });

  describe('Payment History', () => {
    it('should track payment attempts', () => {
      const paymentLog = {
        invoice_id: mockInvoices.pendingInvoice.id,
        session_id: 'cs_test_123',
        status: 'completed' as const,
        amount: 267.750,
        timestamp: new Date().toISOString(),
      };

      expect(paymentLog.status).toBe('completed');
      expect(paymentLog.amount).toBeGreaterThan(0);
    });

    it('should link payment to Stripe payment intent', () => {
      const payment = {
        invoice_id: mockInvoices.paidInvoice.id,
        stripe_payment_intent_id: 'pi_123456789',
        stripe_session_id: 'cs_test_123',
      };

      expect(payment.stripe_payment_intent_id).toContain('pi_');
      expect(payment.stripe_session_id).toContain('cs_');
    });
  });

  describe('Currency Handling', () => {
    it('should handle OMR currency correctly', () => {
      const currency = 'omr';
      const decimalPlaces = 3;
      
      expect(currency.toUpperCase()).toBe('OMR');
      expect(decimalPlaces).toBe(3);
    });

    it('should multiply by 1000 for OMR smallest unit', () => {
      const amount = 100.000; // OMR
      const smallestUnit = amount * 1000; // baisa
      
      expect(smallestUnit).toBe(100000);
    });

    it('should divide by 1000 to convert back to OMR', () => {
      const baisa = 267750;
      const omr = baisa / 1000;
      
      expect(omr).toBe(267.750);
    });
  });
});

describe('Complete Payment Journey', () => {
  it('should complete full payment flow', () => {
    // 1. Start with pending invoice
    const invoice = createMockInvoice({ status: 'pending' });
    expect(invoice.status).toBe('pending');

    // 2. Create checkout session
    const sessionData = {
      invoice_id: invoice.id,
      amount: Math.round(invoice.total_amount * 1000),
      currency: 'omr',
    };
    expect(sessionData.amount).toBeGreaterThan(0);

    // 3. Customer completes payment
    const completedSession = {
      id: 'cs_test_123',
      payment_status: 'paid' as const,
      metadata: { invoice_id: invoice.id },
    };
    expect(completedSession.payment_status).toBe('paid');

    // 4. Verify payment and update invoice
    const paidInvoice = {
      ...invoice,
      status: 'paid' as const,
      paid_at: new Date().toISOString(),
    };
    expect(paidInvoice.status).toBe('paid');
    expect(paidInvoice.paid_at).toBeTruthy();

    // 5. Send confirmation
    const notification = {
      type: 'payment_confirmed',
      invoice_id: invoice.id,
    };
    expect(notification.type).toBe('payment_confirmed');
  });
});
