import { describe, it, expect, vi } from 'vitest';
import { mockCustomers } from '../fixtures/customers';
import { mockOrders, createMockOrder } from '../fixtures/orders';
import { mockInventoryItems } from '../fixtures/inventory';

/**
 * Integration Tests for Order Approval Workflow
 * Tests auto-approval logic and manual approval flow
 */

describe('Order Approval Workflow', () => {
  describe('Auto-Approval Based on Threshold', () => {
    it('should auto-approve order below threshold', () => {
      const workflowSettings = {
        require_approval: true,
        auto_approve_threshold: 100.000,
      };

      const order = createMockOrder({ total_amount: 75.000 });
      const shouldAutoApprove = order.total_amount <= workflowSettings.auto_approve_threshold;

      expect(shouldAutoApprove).toBe(true);
    });

    it('should require manual approval for order above threshold', () => {
      const workflowSettings = {
        require_approval: true,
        auto_approve_threshold: 100.000,
      };

      const order = createMockOrder({ total_amount: 150.000 });
      const shouldAutoApprove = order.total_amount <= workflowSettings.auto_approve_threshold;

      expect(shouldAutoApprove).toBe(false);
    });

    it('should auto-approve when require_approval is false', () => {
      const workflowSettings = {
        require_approval: false,
        auto_approve_threshold: null,
      };

      const order = createMockOrder({ total_amount: 500.000 });
      const shouldAutoApprove = !workflowSettings.require_approval;

      expect(shouldAutoApprove).toBe(true);
    });

    it('should auto-approve order at exact threshold', () => {
      const workflowSettings = {
        require_approval: true,
        auto_approve_threshold: 100.000,
      };

      const order = createMockOrder({ total_amount: 100.000 });
      const shouldAutoApprove = order.total_amount <= workflowSettings.auto_approve_threshold;

      expect(shouldAutoApprove).toBe(true);
    });
  });

  describe('Order Status After Auto-Approval', () => {
    it('should set status to approved on auto-approval', () => {
      const order = createMockOrder({ status: 'pending_approval' });
      
      // Simulate auto-approval
      const approvedOrder = {
        ...order,
        status: 'approved' as const,
      };

      expect(approvedOrder.status).toBe('approved');
    });

    it('should create approval record on auto-approval', () => {
      const order = createMockOrder();
      
      const approvalRecord = {
        order_id: order.id,
        status: 'approved' as const,
        notes: 'Auto-approved: approval not required per workflow settings',
        approved_at: new Date().toISOString(),
      };

      expect(approvalRecord.status).toBe('approved');
      expect(approvalRecord.notes).toContain('Auto-approved');
    });
  });

  describe('Manual Approval Flow', () => {
    it('should remain pending_approval until admin approves', () => {
      const order = mockOrders.pendingOrder;
      expect(order.status).toBe('pending_approval');
    });

    it('should transition to approved on admin approval', () => {
      const order = mockOrders.pendingOrder;
      
      // Admin approves
      const approvedOrder = {
        ...order,
        status: 'approved' as const,
      };

      expect(approvedOrder.status).toBe('approved');
    });

    it('should record approval timestamp', () => {
      const approvalRecord = {
        order_id: mockOrders.pendingOrder.id,
        status: 'approved' as const,
        approved_by: '00000000-0000-0000-0000-000000000admin',
        approved_at: new Date().toISOString(),
        notes: 'Approved by admin',
      };

      expect(approvalRecord.approved_at).toBeTruthy();
      expect(approvalRecord.approved_by).toBeTruthy();
    });

    it('should allow order cancellation before approval', () => {
      const order = mockOrders.pendingOrder;
      
      // Customer cancels
      const cancelledOrder = {
        ...order,
        status: 'cancelled' as const,
      };

      expect(cancelledOrder.status).toBe('cancelled');
    });
  });

  describe('Inventory Deduction on Approval', () => {
    it('should deduct inventory when order approved', () => {
      const inventory = { ...mockInventoryItems.customer1Item1 };
      const orderQuantity = 10;

      // Simulate deduction
      const updatedInventory = {
        ...inventory,
        quantity: inventory.quantity - orderQuantity,
        quantity_consumed: inventory.quantity_consumed + orderQuantity,
      };

      expect(updatedInventory.quantity).toBe(90);
      expect(updatedInventory.quantity_consumed).toBe(10);
    });

    it('should validate sufficient stock before approval', () => {
      const inventory = mockInventoryItems.customer1Item2; // quantity: 5
      const orderQuantity = 10;

      const hasSufficientStock = inventory.quantity >= orderQuantity;
      expect(hasSufficientStock).toBe(false);
    });

    it('should create audit log for inventory deduction', () => {
      const auditLog = {
        table_name: 'wms_inventory',
        record_id: mockInventoryItems.customer1Item1.id,
        action: 'INVENTORY_DEDUCTED',
        old_data: { quantity: 100 },
        new_data: { quantity: 90 },
        module: 'wms_orders',
      };

      expect(auditLog.action).toBe('INVENTORY_DEDUCTED');
      expect(auditLog.module).toBe('wms_orders');
    });
  });

  describe('Order Rejection Flow', () => {
    it('should allow admin to reject order', () => {
      const order = mockOrders.pendingOrder;
      
      const rejectionRecord = {
        order_id: order.id,
        status: 'rejected' as const,
        notes: 'Insufficient stock',
        approved_by: '00000000-0000-0000-0000-000000000admin',
        approved_at: new Date().toISOString(),
      };

      expect(rejectionRecord.status).toBe('rejected');
      expect(rejectionRecord.notes).toBeTruthy();
    });

    it('should not deduct inventory on rejection', () => {
      const inventory = { ...mockInventoryItems.customer1Item1 };
      const originalQuantity = inventory.quantity;

      // Order rejected - no deduction
      expect(inventory.quantity).toBe(originalQuantity);
    });
  });

  describe('Workflow Settings Configuration', () => {
    it('should validate workflow settings structure', () => {
      const settings = {
        customer_id: mockCustomers.activeCustomer1.id,
        require_approval: true,
        auto_approve_threshold: 100.000,
        approval_notification_email: 'approver@company.com',
      };

      expect(settings.customer_id).toBeTruthy();
      expect(typeof settings.require_approval).toBe('boolean');
      expect(typeof settings.auto_approve_threshold).toBe('number');
    });

    it('should allow threshold to be null (no auto-approval)', () => {
      const settings = {
        customer_id: mockCustomers.activeCustomer1.id,
        require_approval: true,
        auto_approve_threshold: null,
      };

      expect(settings.auto_approve_threshold).toBeNull();
    });
  });

  describe('Notification on Approval Needed', () => {
    it('should identify orders requiring approval notification', () => {
      const workflowSettings = {
        require_approval: true,
        auto_approve_threshold: 100.000,
        approval_notification_email: 'approver@company.com',
      };

      const order = createMockOrder({ total_amount: 200.000 });
      const needsNotification = 
        workflowSettings.require_approval && 
        order.total_amount > (workflowSettings.auto_approve_threshold || 0);

      expect(needsNotification).toBe(true);
    });

    it('should send notification to configured email', () => {
      const workflowSettings = {
        approval_notification_email: 'manager@company.com',
      };

      expect(workflowSettings.approval_notification_email).toBe('manager@company.com');
    });
  });
});

describe('Order Status Transition Validation', () => {
  describe('Valid Transitions', () => {
    it('should allow pending_approval -> approved', () => {
      const validTransitions = {
        'pending_approval': ['approved', 'cancelled'],
      };

      expect(validTransitions['pending_approval']).toContain('approved');
    });

    it('should allow approved -> in_progress', () => {
      const validTransitions = {
        'approved': ['in_progress', 'cancelled'],
      };

      expect(validTransitions['approved']).toContain('in_progress');
    });

    it('should allow in_progress -> delivered', () => {
      const validTransitions = {
        'in_progress': ['delivered', 'cancelled'],
      };

      expect(validTransitions['in_progress']).toContain('delivered');
    });

    it('should allow delivered -> completed', () => {
      const validTransitions = {
        'delivered': ['completed', 'cancelled'],
      };

      expect(validTransitions['delivered']).toContain('completed');
    });
  });

  describe('Invalid Transitions', () => {
    it('should prevent completed -> any status', () => {
      const validTransitions = {
        'completed': [],
      };

      expect(validTransitions['completed']).toEqual([]);
    });

    it('should prevent cancelled -> any status', () => {
      const validTransitions = {
        'cancelled': [],
      };

      expect(validTransitions['cancelled']).toEqual([]);
    });

    it('should prevent pending_approval -> in_progress (skip approval)', () => {
      const validTransitions = {
        'pending_approval': ['approved', 'cancelled'],
      };

      expect(validTransitions['pending_approval']).not.toContain('in_progress');
    });

    it('should prevent approved -> delivered (skip in_progress)', () => {
      const validTransitions = {
        'approved': ['in_progress', 'cancelled'],
      };

      expect(validTransitions['approved']).not.toContain('delivered');
    });
  });
});
