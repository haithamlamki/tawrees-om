import { generateUUID, createMockDate } from '../utils/testHelpers';
import { mockCustomers } from './customers';
import { mockOrders } from './orders';

export const mockInvoices = {
  pendingInvoice: {
    id: generateUUID(),
    customer_id: mockCustomers.activeCustomer1.id,
    order_id: mockOrders.approvedOrder.id,
    invoice_number: 'CUST001-INV-2025-0001',
    status: 'pending' as const,
    subtotal: 255.000,
    vat_rate: 5,
    vat_exempt: false,
    tax_amount: 12.750,
    total_amount: 267.750,
    currency: 'OMR',
    due_date: createMockDate(30).toISOString(),
    paid_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  paidInvoice: {
    id: generateUUID(),
    customer_id: mockCustomers.activeCustomer2.id,
    order_id: mockOrders.completedOrder.id,
    invoice_number: 'CUST002-INV-2025-0001',
    status: 'paid' as const,
    subtotal: 457.500,
    vat_rate: 5,
    vat_exempt: false,
    tax_amount: 22.875,
    total_amount: 480.375,
    currency: 'OMR',
    due_date: createMockDate(-10).toISOString(),
    paid_at: createMockDate(-5).toISOString(),
    created_at: createMockDate(-15).toISOString(),
    updated_at: createMockDate(-5).toISOString(),
  },
  overdueInvoice: {
    id: generateUUID(),
    customer_id: mockCustomers.activeCustomer1.id,
    order_id: mockOrders.approvedOrder.id,
    invoice_number: 'CUST001-INV-2025-0002',
    status: 'overdue' as const,
    subtotal: 152.500,
    vat_rate: 5,
    vat_exempt: false,
    tax_amount: 7.625,
    total_amount: 160.125,
    currency: 'OMR',
    due_date: createMockDate(-5).toISOString(),
    paid_at: null,
    created_at: createMockDate(-35).toISOString(),
    updated_at: createMockDate(-5).toISOString(),
  },
};

export const mockInvoiceItems = {
  pendingInvoiceItem: {
    id: generateUUID(),
    invoice_id: mockInvoices.pendingInvoice.id,
    product_name: 'Widget A',
    sku: 'WGT-A-001',
    quantity: 10,
    price_per_unit: 25.500,
    total_price: 255.000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

export const createMockInvoice = (overrides?: Partial<typeof mockInvoices.pendingInvoice>) => {
  const subtotal = 100.000;
  const vatRate = 5;
  const taxAmount = (subtotal * vatRate) / 100;
  const totalAmount = subtotal + taxAmount;

  return {
    id: generateUUID(),
    customer_id: mockCustomers.activeCustomer1.id,
    order_id: generateUUID(),
    invoice_number: `CUST001-INV-2025-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
    status: 'pending' as const,
    subtotal,
    vat_rate: vatRate,
    vat_exempt: false,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    currency: 'OMR',
    due_date: createMockDate(30).toISOString(),
    paid_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
};
