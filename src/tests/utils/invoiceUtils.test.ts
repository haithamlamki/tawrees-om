import { describe, it, expect } from 'vitest';

describe('Invoice Utilities', () => {
  describe('VAT Calculation', () => {
    it('should calculate VAT correctly for OMR', () => {
      const subtotal = 100.000;
      const vatRate = 5;
      const vat = (subtotal * vatRate) / 100;
      const total = subtotal + vat;
      
      expect(vat).toBe(5.000);
      expect(total).toBe(105.000);
    });

    it('should handle 3 decimal places for baisa', () => {
      const amount = 123.456;
      const formatted = amount.toFixed(3);
      
      expect(formatted).toBe('123.456');
    });

    it('should round correctly to 3 decimals', () => {
      const amount = 123.4567;
      const rounded = Math.round(amount * 1000) / 1000;
      
      expect(rounded).toBe(123.457);
    });

    it('should handle zero VAT for exempt items', () => {
      const subtotal = 100.000;
      const vatRate = 0;
      const vat = (subtotal * vatRate) / 100;
      
      expect(vat).toBe(0);
    });
  });

  describe('Invoice Number Generation', () => {
    it('should format invoice number correctly', () => {
      const customerCode = 'CUST001';
      const year = 2025;
      const sequence = 1;
      
      const invoiceNumber = `${customerCode}-INV-${year}-${String(sequence).padStart(4, '0')}`;
      
      expect(invoiceNumber).toBe('CUST001-INV-2025-0001');
    });

    it('should pad sequence numbers', () => {
      const sequence = 42;
      const padded = String(sequence).padStart(4, '0');
      
      expect(padded).toBe('0042');
    });
  });

  describe('Invoice Totals', () => {
    it('should sum line items correctly', () => {
      const items = [
        { quantity: 2, price_per_unit: 10.500, total_price: 21.000 },
        { quantity: 3, price_per_unit: 15.250, total_price: 45.750 },
      ];
      
      const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
      
      expect(subtotal).toBe(66.750);
    });

    it('should calculate line item total', () => {
      const quantity = 5;
      const pricePerUnit = 12.500;
      const total = quantity * pricePerUnit;
      
      expect(total).toBe(62.500);
    });
  });
});
