import { generateUUID } from '../utils/testHelpers';
import { mockCustomers } from './customers';
import { mockInventoryItems } from './inventory';

export const mockOrders = {
  pendingOrder: {
    id: generateUUID(),
    customer_id: mockCustomers.activeCustomer1.id,
    order_number: `ORD-${Date.now()}-001`,
    status: 'pending_approval' as const,
    total_amount: 255.000,
    requested_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Urgent order - please expedite',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  approvedOrder: {
    id: generateUUID(),
    customer_id: mockCustomers.activeCustomer1.id,
    order_number: `ORD-${Date.now()}-002`,
    status: 'approved' as const,
    total_amount: 152.500,
    requested_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  completedOrder: {
    id: generateUUID(),
    customer_id: mockCustomers.activeCustomer2.id,
    order_number: `ORD-${Date.now()}-003`,
    status: 'completed' as const,
    total_amount: 457.500,
    requested_delivery_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    actual_delivery_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    notes: null,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

export const mockOrderItems = {
  pendingOrderItem1: {
    id: generateUUID(),
    order_id: mockOrders.pendingOrder.id,
    customer_id: mockCustomers.activeCustomer1.id,
    inventory_id: mockInventoryItems.customer1Item1.id,
    product_name: mockInventoryItems.customer1Item1.product_name,
    sku: mockInventoryItems.customer1Item1.sku,
    quantity: 10,
    price_per_unit: 25.500,
    total_price: 255.000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  approvedOrderItem1: {
    id: generateUUID(),
    order_id: mockOrders.approvedOrder.id,
    customer_id: mockCustomers.activeCustomer1.id,
    inventory_id: mockInventoryItems.customer1Item2.id,
    product_name: mockInventoryItems.customer1Item2.product_name,
    sku: mockInventoryItems.customer1Item2.sku,
    quantity: 10,
    price_per_unit: 15.250,
    total_price: 152.500,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

export const createMockOrder = (overrides?: Partial<typeof mockOrders.pendingOrder>) => {
  return {
    id: generateUUID(),
    customer_id: mockCustomers.activeCustomer1.id,
    order_number: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    status: 'pending_approval' as const,
    total_amount: 100.000,
    requested_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    actual_delivery_date: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
};
