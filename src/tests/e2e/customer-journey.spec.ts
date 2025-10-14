import { test, expect } from '@playwright/test';

/**
 * E2E Tests for WMS Customer Order Journey
 * Tests complete order creation workflow from customer perspective
 */

test.describe('Customer Order Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Login as customer
    await page.goto('/warehouse/auth');
    await page.fill('input[type="email"]', 'customer@test.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL(/\/warehouse/);
  });

  test('should display customer dashboard with metrics', async ({ page }) => {
    await page.goto('/warehouse/customer-dashboard');
    
    // Check dashboard loads
    await expect(page).toHaveURL(/\/warehouse\/customer-dashboard/);
    
    // Verify key metrics visible
    await expect(page.getByText(/inventory/i)).toBeVisible();
    await expect(page.getByText(/orders/i)).toBeVisible();
    await expect(page.getByText(/invoices/i)).toBeVisible();
  });

  test('should create new order with multiple items', async ({ page }) => {
    await page.goto('/warehouse/orders');
    
    // Click create order button
    await page.click('button:has-text("Create Order"), button:has-text("New Order")');
    
    // Fill order details
    await page.fill('input[name="delivery_address"], textarea[name="delivery_address"]', '123 Test Street, Muscat');
    await page.fill('input[type="date"]', '2025-12-31');
    
    // Add first item
    await page.click('button:has-text("Add Item")');
    await page.selectOption('select:has-text("Product"), select >> nth=0', { index: 1 });
    await page.fill('input[name="quantity"], input[placeholder*="quantity"]', '10');
    
    // Add second item
    await page.click('button:has-text("Add Item")');
    await page.selectOption('select >> nth=1', { index: 2 });
    await page.fill('input[name="quantity"] >> nth=1', '5');
    
    // Add notes
    await page.fill('textarea[name="notes"]', 'Urgent delivery required');
    
    // Submit order
    await page.click('button[type="submit"]:has-text("Submit"), button:has-text("Create Order")');
    
    // Verify success
    await expect(page.getByText(/order created|success/i)).toBeVisible();
  });

  test('should view order list with filters', async ({ page }) => {
    await page.goto('/warehouse/orders');
    
    // Verify orders table visible
    await expect(page.getByRole('table')).toBeVisible();
    
    // Apply status filter
    await page.selectOption('select[name="status"], select:has-text("Status")', 'approved');
    
    // Verify filtered results
    const statusCells = page.locator('td:has-text("approved"), td:has-text("Approved")');
    await expect(statusCells.first()).toBeVisible();
  });

  test('should view order details', async ({ page }) => {
    await page.goto('/warehouse/orders');
    
    // Click first order
    await page.click('table tbody tr:first-child');
    
    // Verify order details modal/page
    await expect(page.getByText(/Order Number|order #/i)).toBeVisible();
    await expect(page.getByText(/Status/i)).toBeVisible();
    await expect(page.getByText(/Total Amount/i)).toBeVisible();
  });

  test('should browse inventory before creating order', async ({ page }) => {
    await page.goto('/warehouse/inventory');
    
    // Search for product
    await page.fill('input[placeholder*="Search"], input[type="search"]', 'Widget');
    
    // Verify search results
    await expect(page.getByText(/Widget/i).first()).toBeVisible();
    
    // Click product to view details
    await page.click('table tbody tr:first-child');
    
    // Verify product details visible
    await expect(page.getByText(/Quantity/i)).toBeVisible();
    await expect(page.getByText(/Price/i)).toBeVisible();
  });

  test('should see low stock alerts', async ({ page }) => {
    await page.goto('/warehouse/inventory');
    
    // Look for low stock indicator
    const lowStockItems = page.locator('td:has-text("Low Stock"), .badge:has-text("Low")');
    
    if (await lowStockItems.count() > 0) {
      await expect(lowStockItems.first()).toBeVisible();
    }
  });

  test('should cancel pending order', async ({ page }) => {
    await page.goto('/warehouse/orders');
    
    // Find pending order
    await page.click('table tbody tr:has-text("Pending"), tr:has-text("pending")');
    
    // Click cancel button
    await page.click('button:has-text("Cancel Order")');
    
    // Confirm cancellation
    await page.click('button:has-text("Confirm"), button:has-text("Yes")');
    
    // Verify cancellation
    await expect(page.getByText(/cancelled|canceled/i)).toBeVisible();
  });
});

test.describe('Customer Invoice Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/warehouse/auth');
    await page.fill('input[type="email"]', 'customer@test.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
  });

  test('should view invoice list', async ({ page }) => {
    await page.goto('/warehouse/invoices');
    
    await expect(page).toHaveURL(/\/warehouse\/invoices/);
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should filter invoices by status', async ({ page }) => {
    await page.goto('/warehouse/invoices');
    
    // Filter by pending
    await page.selectOption('select:has-text("Status")', 'pending');
    
    // Verify filtered
    await expect(page.locator('td:has-text("Pending")').first()).toBeVisible();
  });

  test('should view invoice details', async ({ page }) => {
    await page.goto('/warehouse/invoices');
    
    // Click first invoice
    await page.click('table tbody tr:first-child');
    
    // Verify details
    await expect(page.getByText(/Invoice Number/i)).toBeVisible();
    await expect(page.getByText(/Total Amount/i)).toBeVisible();
    await expect(page.getByText(/VAT|Tax/i)).toBeVisible();
  });

  test('should download invoice PDF', async ({ page }) => {
    await page.goto('/warehouse/invoices');
    
    // Wait for download
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download"), button:has-text("PDF")');
    const download = await downloadPromise;
    
    // Verify PDF downloaded
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('should pay pending invoice', async ({ page }) => {
    await page.goto('/warehouse/invoices');
    
    // Find pending invoice
    const pendingRow = page.locator('tr:has-text("Pending")').first();
    await pendingRow.click();
    
    // Click pay button
    await page.click('button:has-text("Pay Now"), button:has-text("Pay Invoice")');
    
    // Should redirect to Stripe (or show payment modal)
    // In test environment, mock the payment flow
    await expect(page).toHaveURL(/stripe|payment|checkout/i, { timeout: 10000 });
  });
});

test.describe('Customer Profile & Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/warehouse/auth');
    await page.fill('input[type="email"]', 'customer@test.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
  });

  test('should view and update profile', async ({ page }) => {
    await page.goto('/warehouse/settings');
    
    // Update profile details
    await page.fill('input[name="full_name"]', 'Updated Name');
    await page.fill('input[name="phone"]', '+96812345678');
    
    // Save changes
    await page.click('button[type="submit"]:has-text("Save")');
    
    // Verify success
    await expect(page.getByText(/saved|updated/i)).toBeVisible();
  });

  test('should access notification settings', async ({ page }) => {
    await page.goto('/warehouse/settings');
    
    // Find notifications section
    await expect(page.getByText(/Notification/i)).toBeVisible();
    
    // Toggle email notifications
    const emailToggle = page.locator('input[type="checkbox"]').first();
    await emailToggle.click();
    
    // Save
    await page.click('button:has-text("Save")');
  });
});

test.describe('Customer Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/warehouse/auth');
    await page.fill('input[type="email"]', 'customer@test.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
  });

  test('should navigate between main sections', async ({ page }) => {
    // Dashboard
    await page.click('a[href*="customer-dashboard"], a:has-text("Dashboard")');
    await expect(page).toHaveURL(/customer-dashboard/);
    
    // Inventory
    await page.click('a[href*="inventory"]');
    await expect(page).toHaveURL(/inventory/);
    
    // Orders
    await page.click('a[href*="orders"]');
    await expect(page).toHaveURL(/orders/);
    
    // Invoices
    await page.click('a[href*="invoices"]');
    await expect(page).toHaveURL(/invoices/);
  });

  test('should have mobile responsive navigation', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/warehouse/customer-dashboard');
    
    // Mobile menu should be accessible
    const mobileMenu = page.locator('button[aria-label*="menu"], button:has-text("Menu")');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(page.getByRole('navigation')).toBeVisible();
    }
  });
});
