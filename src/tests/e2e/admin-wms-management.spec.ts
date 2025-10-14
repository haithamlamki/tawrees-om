import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Admin WMS Management
 * Tests admin workflows for managing customers, orders, and approvals
 */

test.describe('Admin Customer Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'adminpassword123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/admin/);
  });

  test('should access WMS dashboard', async ({ page }) => {
    await page.goto('/admin/wms-dashboard');
    
    await expect(page).toHaveURL(/\/admin\/wms-dashboard/);
    
    // Verify key metrics
    await expect(page.getByText(/Total Customers/i)).toBeVisible();
    await expect(page.getByText(/Active Orders/i)).toBeVisible();
    await expect(page.getByText(/Revenue/i)).toBeVisible();
  });

  test('should create new customer', async ({ page }) => {
    await page.goto('/admin/wms-customers');
    
    // Click create customer
    await page.click('button:has-text("Create Customer"), button:has-text("Add Customer")');
    
    // Fill customer details
    await page.fill('input[name="company_name"]', 'Test Company Ltd');
    await page.fill('input[name="contact_person"]', 'John Doe');
    await page.fill('input[name="email"]', 'john@testcompany.com');
    await page.fill('input[name="phone"]', '+96812345678');
    await page.fill('textarea[name="address"]', '123 Business Street, Muscat');
    
    // Submit
    await page.click('button[type="submit"]:has-text("Create"), button:has-text("Save")');
    
    // Verify success
    await expect(page.getByText(/created|success/i)).toBeVisible();
  });

  test('should create contract for customer', async ({ page }) => {
    await page.goto('/admin/wms-contracts');
    
    // Create contract
    await page.click('button:has-text("Create Contract"), button:has-text("New Contract")');
    
    // Select customer
    await page.selectOption('select[name="customer_id"]', { index: 1 });
    
    // Set dates
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[name="start_date"]', today);
    
    // Upload contract document (mock)
    const fileInput = page.locator('input[type="file"]');
    // await fileInput.setInputFiles('path/to/contract.pdf');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Verify contract created with auto-generated number
    await expect(page.getByText(/CON-\d{11}/)).toBeVisible();
  });

  test('should create user for customer', async ({ page }) => {
    await page.goto('/admin/wms-users');
    
    // Create user
    await page.click('button:has-text("Create User"), button:has-text("Add User")');
    
    // Fill user details
    await page.fill('input[name="email"]', 'employee@testcompany.com');
    await page.fill('input[name="full_name"]', 'Jane Employee');
    await page.fill('input[name="phone"]', '+96887654321');
    
    // Select customer
    await page.selectOption('select[name="customer_id"]', { index: 1 });
    
    // Select role
    await page.selectOption('select[name="role"]', 'employee');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Verify user created
    await expect(page.getByText(/created|success/i)).toBeVisible();
  });

  test('should view all customers with search', async ({ page }) => {
    await page.goto('/admin/wms-customers');
    
    // Search for customer
    await page.fill('input[placeholder*="Search"]', 'Test Company');
    
    // Verify results
    await expect(page.getByText(/Test Company/i)).toBeVisible();
  });

  test('should edit customer details', async ({ page }) => {
    await page.goto('/admin/wms-customers');
    
    // Click edit on first customer
    await page.click('table tbody tr:first-child button:has-text("Edit")');
    
    // Update details
    await page.fill('input[name="contact_person"]', 'Updated Contact');
    
    // Save
    await page.click('button[type="submit"]:has-text("Save")');
    
    // Verify update
    await expect(page.getByText(/updated|success/i)).toBeVisible();
  });

  test('should deactivate customer', async ({ page }) => {
    await page.goto('/admin/wms-customers');
    
    // Find active customer
    const customerRow = page.locator('tr:has-text("Active")').first();
    
    // Click deactivate
    await customerRow.locator('button:has-text("Deactivate")').click();
    
    // Confirm
    await page.click('button:has-text("Confirm")');
    
    // Verify status changed
    await expect(page.getByText(/Inactive/i)).toBeVisible();
  });
});

test.describe('Admin Order Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'adminpassword123');
    await page.click('button[type="submit"]');
  });

  test('should view all orders across customers', async ({ page }) => {
    await page.goto('/admin/wms-orders');
    
    await expect(page).toHaveURL(/\/admin\/wms-orders/);
    await expect(page.getByRole('table')).toBeVisible();
    
    // Should see orders from multiple customers
    const customerColumn = page.locator('td:nth-child(2)'); // Assuming customer is 2nd column
    await expect(customerColumn.first()).toBeVisible();
  });

  test('should filter orders by status', async ({ page }) => {
    await page.goto('/admin/wms-orders');
    
    // Filter pending approval
    await page.selectOption('select:has-text("Status")', 'pending_approval');
    
    // Verify filtered
    await expect(page.locator('td:has-text("Pending")').first()).toBeVisible();
  });

  test('should approve pending order', async ({ page }) => {
    await page.goto('/admin/wms-orders');
    
    // Find pending order
    const pendingOrder = page.locator('tr:has-text("Pending")').first();
    await pendingOrder.click();
    
    // Click approve
    await page.click('button:has-text("Approve")');
    
    // Add approval notes
    await page.fill('textarea[name="notes"]', 'Approved - stock available');
    
    // Confirm
    await page.click('button:has-text("Confirm"), button[type="submit"]');
    
    // Verify status changed
    await expect(page.getByText(/Approved|success/i)).toBeVisible();
  });

  test('should reject order with reason', async ({ page }) => {
    await page.goto('/admin/wms-orders');
    
    // Find pending order
    const pendingOrder = page.locator('tr:has-text("Pending")').first();
    await pendingOrder.click();
    
    // Click reject
    await page.click('button:has-text("Reject")');
    
    // Add rejection reason
    await page.fill('textarea[name="notes"], textarea[name="reason"]', 'Insufficient stock');
    
    // Confirm
    await page.click('button:has-text("Confirm"), button[type="submit"]');
    
    // Verify rejection
    await expect(page.getByText(/Rejected|rejected/i)).toBeVisible();
  });

  test('should bulk approve multiple orders', async ({ page }) => {
    await page.goto('/admin/wms-orders');
    
    // Select multiple orders
    await page.check('input[type="checkbox"] >> nth=1');
    await page.check('input[type="checkbox"] >> nth=2');
    
    // Click bulk approve
    await page.click('button:has-text("Approve Selected"), button:has-text("Bulk Approve")');
    
    // Confirm
    await page.click('button:has-text("Confirm")');
    
    // Verify success
    await expect(page.getByText(/approved|success/i)).toBeVisible();
  });

  test('should update order status', async ({ page }) => {
    await page.goto('/admin/wms-orders');
    
    // Find approved order
    const approvedOrder = page.locator('tr:has-text("Approved")').first();
    await approvedOrder.click();
    
    // Update to in_progress
    await page.selectOption('select[name="status"]', 'in_progress');
    
    // Save
    await page.click('button:has-text("Update"), button:has-text("Save")');
    
    // Verify update
    await expect(page.getByText(/In Progress|updated/i)).toBeVisible();
  });
});

test.describe('Admin MIS Reporting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'adminpassword123');
    await page.click('button[type="submit"]');
  });

  test('should access MIS report page', async ({ page }) => {
    await page.goto('/admin/wms-mis-report');
    
    await expect(page).toHaveURL(/\/admin\/wms-mis-report/);
    
    // Verify key sections
    await expect(page.getByText(/Revenue/i)).toBeVisible();
    await expect(page.getByText(/Orders/i)).toBeVisible();
    await expect(page.getByText(/Inventory Value/i)).toBeVisible();
  });

  test('should filter report by date range', async ({ page }) => {
    await page.goto('/admin/wms-mis-report');
    
    // Set date range
    await page.fill('input[name="start_date"]', '2025-01-01');
    await page.fill('input[name="end_date"]', '2025-12-31');
    
    // Apply filter
    await page.click('button:has-text("Apply"), button:has-text("Filter")');
    
    // Verify data updated
    await expect(page.locator('.recharts-wrapper')).toBeVisible();
  });

  test('should export MIS report to CSV', async ({ page }) => {
    await page.goto('/admin/wms-mis-report');
    
    // Export
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export"), button:has-text("CSV")');
    const download = await downloadPromise;
    
    // Verify CSV
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });

  test('should display revenue chart', async ({ page }) => {
    await page.goto('/admin/wms-mis-report');
    
    // Verify chart rendered
    await expect(page.locator('.recharts-wrapper, [data-recharts]')).toBeVisible();
    
    // Chart should have data points
    const chartBars = page.locator('.recharts-bar, .recharts-line');
    await expect(chartBars.first()).toBeVisible();
  });

  test('should show customer-wise breakdown', async ({ page }) => {
    await page.goto('/admin/wms-mis-report');
    
    // Navigate to customer breakdown section
    await page.click('button:has-text("Customer Breakdown"), a:has-text("By Customer")');
    
    // Verify table/chart
    await expect(page.getByRole('table')).toBeVisible();
  });
});

test.describe('Admin Workflow Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'adminpassword123');
    await page.click('button[type="submit"]');
  });

  test('should configure workflow settings for customer', async ({ page }) => {
    await page.goto('/admin/wms-workflow');
    
    // Select customer
    await page.selectOption('select[name="customer_id"]', { index: 1 });
    
    // Configure settings
    await page.check('input[name="require_approval"]');
    await page.fill('input[name="auto_approve_threshold"]', '100.000');
    await page.fill('input[name="approval_notification_email"]', 'approver@company.com');
    
    // Save
    await page.click('button[type="submit"]');
    
    // Verify saved
    await expect(page.getByText(/saved|success/i)).toBeVisible();
  });

  test('should toggle auto-approval', async ({ page }) => {
    await page.goto('/admin/wms-workflow');
    
    // Select customer
    await page.selectOption('select[name="customer_id"]', { index: 1 });
    
    // Disable approval requirement
    await page.uncheck('input[name="require_approval"]');
    
    // Save
    await page.click('button[type="submit"]');
    
    // Verify
    await expect(page.getByText(/saved/i)).toBeVisible();
  });
});
