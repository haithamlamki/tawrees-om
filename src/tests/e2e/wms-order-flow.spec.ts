import { test, expect } from '@playwright/test';

test.describe('WMS Order Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/warehouse/auth');
  });

  test('should complete full order creation flow', async ({ page }) => {
    // Login as customer
    await page.fill('input[type="email"]', 'customer@test.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/warehouse\/dashboard/);
    
    // Navigate to orders
    await page.click('text=Orders');
    await expect(page).toHaveURL(/\/warehouse\/orders/);
    
    // Click create new order
    await page.click('text=New Order');
    
    // Fill order form
    await page.fill('input[name="delivery_address"]', '123 Test Street');
    await page.fill('input[name="delivery_city"]', 'Muscat');
    
    // Add order items
    await page.click('text=Add Item');
    await page.fill('input[name="quantity"]', '5');
    
    // Submit order
    await page.click('button[type="submit"]');
    
    // Verify order created
    await expect(page.getByText(/Order created successfully/i)).toBeVisible();
  });

  test('should display order list', async ({ page }) => {
    // Login as customer
    await page.fill('input[type="email"]', 'customer@test.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    await page.goto('/warehouse/orders');
    
    // Check for orders table
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should filter orders by status', async ({ page }) => {
    await page.fill('input[type="email"]', 'customer@test.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    await page.goto('/warehouse/orders');
    
    // Click status filter
    await page.click('text=Status');
    await page.click('text=Approved');
    
    // Verify filtered results
    await expect(page.getByText(/approved/i)).toBeVisible();
  });
});
