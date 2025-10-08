import { test, expect } from '@playwright/test';

test.describe('WMS Invoice Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/warehouse/auth');
    await page.fill('input[type="email"]', 'customer@test.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
  });

  test('should display invoice list', async ({ page }) => {
    await page.goto('/warehouse/invoices');
    
    await expect(page).toHaveURL(/\/warehouse\/invoices/);
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should view invoice details', async ({ page }) => {
    await page.goto('/warehouse/invoices');
    
    // Click on first invoice
    await page.click('table tbody tr:first-child');
    
    // Verify invoice details are displayed
    await expect(page.getByText(/Invoice Number/i)).toBeVisible();
    await expect(page.getByText(/Total Amount/i)).toBeVisible();
  });

  test('should download invoice PDF', async ({ page }) => {
    await page.goto('/warehouse/invoices');
    
    // Wait for download
    const downloadPromise = page.waitForEvent('download');
    await page.click('text=Download PDF');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('should filter invoices by date', async ({ page }) => {
    await page.goto('/warehouse/invoices');
    
    // Set date filter
    await page.fill('input[type="date"]:first-of-type', '2025-01-01');
    await page.fill('input[type="date"]:last-of-type', '2025-12-31');
    
    // Apply filter
    await page.click('text=Apply');
    
    // Verify filtered results
    await expect(page.getByRole('table')).toBeVisible();
  });
});
