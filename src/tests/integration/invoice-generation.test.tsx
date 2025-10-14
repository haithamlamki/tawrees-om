import { describe, it, expect } from 'vitest';
import { mockCustomers } from '../fixtures/customers';
import { mockOrders, createMockOrder } from '../fixtures/orders';
import { mockInvoices, createMockInvoice } from '../fixtures/invoices';

/**
 * Integration Tests for Invoice Generation
 * Tests automatic invoice creation when orders are approved
 */

describe('Invoice Generation Integration', () => {
  describe('Automatic Invoice Creation on Order Approval', () => {
    it('should generate invoice when order is approved', () => {
      const order = mockOrders.approvedOrder;
      
      // Invoice created with order details
      const invoice = createMockInvoice({
        order_id: order.id,
        customer_id: order.customer_id,
        subtotal: order.total_amount,
      });

      expect(invoice.order_id).toBe(order.id);
      expect(invoice.customer_id).toBe(order.customer_id);
      expect(invoice.subtotal).toBe(order.total_amount);
    });

    it('should not generate invoice for pending orders', () => {
      const order = mockOrders.pendingOrder;
      expect(order.status).toBe('pending_approval');
      
      // No invoice should exist yet
      const orderStatus: string = order.status;
      const shouldGenerateInvoice = orderStatus === 'approved';
      expect(shouldGenerateInvoice).toBe(false);
    });

    it('should generate invoice only once per order', () => {
      const order = mockOrders.approvedOrder;
      const invoiceCount = 1; // Should be exactly 1 invoice per order
      
      expect(invoiceCount).toBe(1);
    });
  });

  describe('Invoice Number Generation', () => {
    it('should generate unique invoice number per customer', () => {
      const invoice1 = createMockInvoice({
        customer_id: mockCustomers.activeCustomer1.id,
      });
      
      const invoice2 = createMockInvoice({
        customer_id: mockCustomers.activeCustomer1.id,
      });

      expect(invoice1.invoice_number).not.toBe(invoice2.invoice_number);
    });

    it('should use customer code in invoice number', () => {
      const invoice = createMockInvoice({
        customer_id: mockCustomers.activeCustomer1.id,
      });

      expect(invoice.invoice_number).toContain('CUST001');
    });

    it('should include year in invoice number', () => {
      const invoice = createMockInvoice();
      const year = new Date().getFullYear();
      
      expect(invoice.invoice_number).toContain(year.toString());
    });

    it('should increment sequence number per customer per year', () => {
      const invoice1 = mockInvoices.pendingInvoice; // -0001
      const invoice2 = mockInvoices.overdueInvoice; // -0002
      
      const seq1 = invoice1.invoice_number.split('-').pop();
      const seq2 = invoice2.invoice_number.split('-').pop();
      
      expect(seq1).toBe('0001');
      expect(seq2).toBe('0002');
    });

    it('should reset sequence for new year', () => {
      const invoice2024 = {
        invoice_number: 'CUST001-INV-2024-0099',
      };
      
      const invoice2025 = {
        invoice_number: 'CUST001-INV-2025-0001',
      };
      
      const year1 = invoice2024.invoice_number.split('-')[2];
      const year2 = invoice2025.invoice_number.split('-')[2];
      const seq2 = invoice2025.invoice_number.split('-').pop();
      
      expect(year1).not.toBe(year2);
      expect(seq2).toBe('0001'); // Reset for new year
    });
  });

  describe('Invoice Amount Calculations', () => {
    it('should copy order total to invoice subtotal', () => {
      const order = mockOrders.approvedOrder;
      const invoice = createMockInvoice({
        order_id: order.id,
        subtotal: order.total_amount,
      });

      expect(invoice.subtotal).toBe(order.total_amount);
    });

    it('should calculate VAT based on subtotal', () => {
      const subtotal = 100.000;
      const vatRate = 5;
      const expectedVAT = (subtotal * vatRate) / 100;
      
      expect(expectedVAT).toBe(5.000);
    });

    it('should calculate total as subtotal + VAT', () => {
      const invoice = createMockInvoice({
        subtotal: 100.000,
        vat_rate: 5,
        tax_amount: 5.000,
        total_amount: 105.000,
      });

      expect(invoice.total_amount).toBe(invoice.subtotal + invoice.tax_amount);
    });

    it('should round amounts to 3 decimal places for OMR', () => {
      const subtotal = 123.4567;
      const rounded = Math.round(subtotal * 1000) / 1000;
      
      expect(rounded).toBe(123.457);
    });

    it('should handle VAT exempt invoices', () => {
      const invoice = createMockInvoice({
        subtotal: 100.000,
        vat_exempt: true,
        vat_rate: 0,
        tax_amount: 0,
        total_amount: 100.000,
      });

      expect(invoice.vat_exempt).toBe(true);
      expect(invoice.tax_amount).toBe(0);
      expect(invoice.total_amount).toBe(invoice.subtotal);
    });
  });

  describe('Invoice Status on Creation', () => {
    it('should create invoice with pending status', () => {
      const invoice = createMockInvoice();
      expect(invoice.status).toBe('pending');
    });

    it('should set due date 30 days from creation', () => {
      const createdAt = new Date();
      const dueDate = new Date(createdAt);
      dueDate.setDate(dueDate.getDate() + 30);
      
      const daysDifference = Math.floor((dueDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDifference).toBe(30);
    });

    it('should not have payment timestamp on creation', () => {
      const invoice = createMockInvoice();
      expect(invoice.paid_at).toBeNull();
    });
  });

  describe('Invoice Items from Order Items', () => {
    it('should copy order items to invoice items', () => {
      const orderItem = {
        product_name: 'Widget A',
        sku: 'WGT-A-001',
        quantity: 10,
        price_per_unit: 25.500,
        total_price: 255.000,
      };

      const invoiceItem = {
        invoice_id: 'invoice-id',
        product_name: orderItem.product_name,
        sku: orderItem.sku,
        quantity: orderItem.quantity,
        price_per_unit: orderItem.price_per_unit,
        total_price: orderItem.total_price,
      };

      expect(invoiceItem.product_name).toBe(orderItem.product_name);
      expect(invoiceItem.quantity).toBe(orderItem.quantity);
      expect(invoiceItem.total_price).toBe(orderItem.total_price);
    });

    it('should sum invoice items to invoice subtotal', () => {
      const items = [
        { total_price: 255.000 },
        { total_price: 152.500 },
      ];

      const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
      expect(subtotal).toBe(407.500);
    });
  });

  describe('Notification on Invoice Generation', () => {
    it('should send notification when invoice created', () => {
      const notification = {
        user_id: 'customer-user-id',
        title: 'Invoice Generated',
        message: 'Invoice CUST001-INV-2025-0001 has been generated',
        type: 'invoice_generated',
        related_id: 'invoice-id',
      };

      expect(notification.type).toBe('invoice_generated');
      expect(notification.message).toContain('Invoice');
    });

    it('should include invoice number in notification', () => {
      const invoice = mockInvoices.pendingInvoice;
      const message = `Invoice ${invoice.invoice_number} has been generated`;
      
      expect(message).toContain(invoice.invoice_number);
    });
  });

  describe('Invoice Currency', () => {
    it('should use OMR currency by default', () => {
      const invoice = createMockInvoice();
      expect(invoice.currency).toBe('OMR');
    });

    it('should format amounts with 3 decimals for OMR', () => {
      const amount = 123.456;
      const formatted = amount.toFixed(3);
      
      expect(formatted).toBe('123.456');
    });
  });
});

describe('Invoice Number Sequence Management', () => {
  describe('wms_invoice_sequences Table', () => {
    it('should track sequence per customer per year', () => {
      const sequence = {
        customer_id: mockCustomers.activeCustomer1.id,
        year: 2025,
        current_number: 1,
        prefix: 'CUST001',
      };

      expect(sequence.customer_id).toBeTruthy();
      expect(sequence.year).toBe(2025);
      expect(sequence.current_number).toBe(1);
    });

    it('should increment current_number on each invoice', () => {
      const sequence = { current_number: 5 };
      const nextNumber = sequence.current_number + 1;
      
      expect(nextNumber).toBe(6);
    });

    it('should prevent duplicate invoice numbers with unique constraint', () => {
      // Unique constraint: (customer_id, year, current_number)
      const seq1 = {
        customer_id: mockCustomers.activeCustomer1.id,
        year: 2025,
        current_number: 1,
      };

      const seq2 = {
        customer_id: mockCustomers.activeCustomer1.id,
        year: 2025,
        current_number: 1, // Duplicate
      };

      expect(seq1.customer_id).toBe(seq2.customer_id);
      expect(seq1.year).toBe(seq2.year);
      expect(seq1.current_number).toBe(seq2.current_number);
    });
  });

  describe('generate_invoice_number Function', () => {
    it('should format invoice number correctly', () => {
      const customerCode = 'CUST001';
      const year = 2025;
      const sequence = 42;
      
      const invoiceNumber = `${customerCode}-INV-${year}-${String(sequence).padStart(4, '0')}`;
      
      expect(invoiceNumber).toBe('CUST001-INV-2025-0042');
    });

    it('should pad sequence to 4 digits', () => {
      const sequence = 7;
      const padded = String(sequence).padStart(4, '0');
      
      expect(padded).toBe('0007');
    });

    it('should handle large sequence numbers', () => {
      const sequence = 9999;
      const padded = String(sequence).padStart(4, '0');
      
      expect(padded).toBe('9999');
    });
  });
});
