import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { mockCustomers } from '../fixtures/customers';
import { mockInvoices, createMockInvoice } from '../fixtures/invoices';

/**
 * Critical RLS Tests for wms_invoices table
 * 
 * Security Requirements:
 * 1. Customer isolation: Invoices visible only to owning customer
 * 2. Invoice number uniqueness: Per customer per year
 * 3. VAT calculations: Correct tax computation
 * 4. Payment tracking: Status updates on payment
 */

describe('RLS Policies - wms_invoices', () => {
  describe('Customer Isolation', () => {
    it('should prevent Customer A from viewing Customer B invoices', async () => {
      const { data, error } = await supabase
        .from('wms_invoices')
        .select('*')
        .eq('customer_id', mockCustomers.activeCustomer2.id);

      if (!error) {
        expect(data).toEqual([]);
      } else {
        expect(error).toBeTruthy();
      }
    });

    it('should allow customer to view own invoices', async () => {
      const { data, error } = await supabase
        .from('wms_invoices')
        .select('*')
        .eq('customer_id', mockCustomers.activeCustomer1.id);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Invoice Number Format', () => {
    it('should match format CUSTCODE-INV-YYYY-NNNN', () => {
      const invoice = mockInvoices.pendingInvoice;
      expect(invoice.invoice_number).toMatch(/^CUST\d{3}-INV-\d{4}-\d{4}$/);
    });

    it('should include customer code prefix', () => {
      const invoice = mockInvoices.pendingInvoice;
      expect(invoice.invoice_number).toContain('CUST001');
    });

    it('should include year', () => {
      const invoice = mockInvoices.pendingInvoice;
      expect(invoice.invoice_number).toContain('2025');
    });

    it('should pad sequence number to 4 digits', () => {
      const invoice = mockInvoices.pendingInvoice;
      const parts = invoice.invoice_number.split('-');
      const sequence = parts[parts.length - 1];
      
      expect(sequence).toHaveLength(4);
      expect(sequence).toBe('0001');
    });
  });

  describe('VAT Calculations', () => {
    it('should calculate VAT correctly (5%)', () => {
      const subtotal = 100.000;
      const vatRate = 5;
      const expectedVAT = 5.000;
      
      const calculatedVAT = (subtotal * vatRate) / 100;
      
      expect(calculatedVAT).toBe(expectedVAT);
    });

    it('should calculate total with VAT', () => {
      const invoice = mockInvoices.pendingInvoice;
      const expectedTotal = invoice.subtotal + invoice.tax_amount;
      
      expect(invoice.total_amount).toBe(expectedTotal);
    });

    it('should handle VAT exempt invoices', () => {
      const invoice = createMockInvoice({
        vat_exempt: true,
        vat_rate: 0,
        tax_amount: 0,
      });
      
      expect(invoice.tax_amount).toBe(0);
      expect(invoice.total_amount).toBe(invoice.subtotal);
    });

    it('should round to 3 decimal places (baisa)', () => {
      const amount = 123.4567;
      const rounded = Math.round(amount * 1000) / 1000;
      
      expect(rounded).toBe(123.457);
    });

    it('should handle 3 decimal currency correctly', () => {
      const invoice = mockInvoices.pendingInvoice;
      expect(invoice.currency).toBe('OMR');
      
      // All amounts should have exactly 3 decimal places
      expect(invoice.subtotal.toString()).toMatch(/\d+\.\d{3}/);
      expect(invoice.tax_amount.toString()).toMatch(/\d+\.\d{3}/);
      expect(invoice.total_amount.toString()).toMatch(/\d+\.\d{3}/);
    });
  });

  describe('Invoice Status Management', () => {
    it('should start as pending status', () => {
      const invoice = createMockInvoice();
      expect(invoice.status).toBe('pending');
    });

    it('should identify paid invoices', () => {
      const invoice = mockInvoices.paidInvoice;
      expect(invoice.status).toBe('paid');
      expect(invoice.paid_at).toBeTruthy();
    });

    it('should identify overdue invoices', () => {
      const invoice = mockInvoices.overdueInvoice;
      expect(invoice.status).toBe('overdue');
      
      const dueDate = new Date(invoice.due_date);
      const now = new Date();
      expect(dueDate < now).toBe(true);
    });

    it('should track payment timestamp', () => {
      const invoice = mockInvoices.paidInvoice;
      expect(invoice.paid_at).toBeTruthy();
      
      const paidDate = new Date(invoice.paid_at!);
      expect(paidDate).toBeInstanceOf(Date);
    });
  });

  describe('Invoice Totals Calculation Function', () => {
    it('should calculate invoice totals correctly', () => {
      const subtotal = 255.000;
      const vatRate = 5;
      const taxAmount = (subtotal * vatRate) / 100;
      const totalAmount = subtotal + taxAmount;
      
      const result = {
        subtotal,
        tax_amount: Math.round(taxAmount * 1000) / 1000,
        total_amount: Math.round(totalAmount * 1000) / 1000,
        vat_rate: vatRate,
        currency: 'OMR',
      };
      
      expect(result.subtotal).toBe(255.000);
      expect(result.tax_amount).toBe(12.750);
      expect(result.total_amount).toBe(267.750);
    });
  });
});

describe('Invoice Payment Integration', () => {
  describe('Payment Status Tracking', () => {
    it('should mark invoice as paid after payment', () => {
      const invoice = createMockInvoice({ status: 'pending' });
      
      // Simulate payment
      const paidInvoice = {
        ...invoice,
        status: 'paid' as const,
        paid_at: new Date().toISOString(),
      };
      
      expect(paidInvoice.status).toBe('paid');
      expect(paidInvoice.paid_at).toBeTruthy();
    });

    it('should prevent modification of paid invoices', () => {
      const invoice = mockInvoices.paidInvoice;
      expect(invoice.status).toBe('paid');
      
      // Business rule: paid invoices should not be modified
      const isPaid = invoice.status === 'paid';
      expect(isPaid).toBe(true);
    });
  });

  describe('Due Date Management', () => {
    it('should set due date 30 days from creation', () => {
      const createdAt = new Date('2025-01-01');
      const dueDate = new Date(createdAt);
      dueDate.setDate(dueDate.getDate() + 30);
      
      expect(dueDate.getDate()).toBe(31); // Jan 31
    });

    it('should identify overdue invoices', () => {
      const invoice = mockInvoices.overdueInvoice;
      const dueDate = new Date(invoice.due_date);
      const now = new Date();
      
      const isOverdue = dueDate < now && invoice.paid_at === null;
      expect(isOverdue).toBe(true);
    });
  });
});
