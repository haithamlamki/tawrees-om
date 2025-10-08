import { describe, it, expect } from 'vitest';

// Example utility function tests
describe('Calculator Utils', () => {
  it('should calculate volume correctly', () => {
    const length = 100;
    const width = 50;
    const height = 30;
    const volumeCbm = (length * width * height) / 1000000;
    
    expect(volumeCbm).toBe(0.15);
  });

  it('should handle decimal calculations', () => {
    const price = 100.123;
    const quantity = 3;
    const total = price * quantity;
    
    expect(total).toBeCloseTo(300.369, 2);
  });

  it('should calculate VAT correctly', () => {
    const subtotal = 100;
    const vatRate = 5;
    const vat = (subtotal * vatRate) / 100;
    const total = subtotal + vat;
    
    expect(vat).toBe(5);
    expect(total).toBe(105);
  });
});

describe('Currency Formatting', () => {
  it('should format OMR with 3 decimals', () => {
    const amount = 123.456;
    const formatted = amount.toFixed(3);
    
    expect(formatted).toBe('123.456');
  });

  it('should handle rounding for baisa', () => {
    const amount = 123.4567;
    const rounded = Math.round(amount * 1000) / 1000;
    
    expect(rounded).toBe(123.457);
  });
});
