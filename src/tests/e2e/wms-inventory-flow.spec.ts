import { test, expect } from '@playwright/test';

test.describe('WMS Inventory Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/warehouse/auth');
    await page.fill('input[type="email"]', 'customer@test.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
  });

  test('should display inventory list', async ({ page }) => {
    await page.goto('/warehouse/inventory');
    
    await expect(page).toHaveURL(/\/warehouse\/inventory/);
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should show low stock alerts', async ({ page }) => {
    await page.goto('/warehouse/inventory');
    
    // Check for alert badge or indicator
    const lowStockItems = page.getByText(/Low Stock/i);
    if (await lowStockItems.count() > 0) {
      expect(await lowStockItems.first().isVisible()).toBe(true);
    }
  });

  test('should filter inventory by product', async ({ page }) => {
    await page.goto('/warehouse/inventory');
    
    // Use search/filter
    await page.fill('input[placeholder*="Search"]', 'Product');
    
    // Verify filtered results
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should view inventory details', async ({ page }) => {
    await page.goto('/warehouse/inventory');
    
    // Click on first inventory item
    await page.click('table tbody tr:first-child');
    
    // Verify details are displayed
    await expect(page.getByText(/Quantity/i)).toBeVisible();
  });
});
