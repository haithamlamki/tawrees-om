import { test, expect } from '@playwright/test';

test.describe('Admin Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'adminpassword123');
    await page.click('button[type="submit"]');
  });

  test('should access admin dashboard', async ({ page }) => {
    await page.goto('/admin/wms-dashboard');
    
    await expect(page).toHaveURL(/\/admin\/wms-dashboard/);
    await expect(page.getByText(/Dashboard/i)).toBeVisible();
  });

  test('should approve pending order', async ({ page }) => {
    await page.goto('/admin/wms-orders');
    
    // Filter for pending orders
    await page.click('text=Pending');
    
    // Click approve on first order
    await page.click('button:has-text("Approve"):first');
    
    // Verify success message
    await expect(page.getByText(/approved successfully/i)).toBeVisible();
  });

  test('should manage customers', async ({ page }) => {
    await page.goto('/admin/wms-customers');
    
    await expect(page.getByRole('table')).toBeVisible();
    
    // Click add customer
    await page.click('text=Add Customer');
    
    // Fill customer form
    await page.fill('input[name="company_name"]', 'Test Company');
    await page.fill('input[name="customer_code"]', 'TEST001');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Verify customer created
    await expect(page.getByText(/customer created/i)).toBeVisible();
  });

  test('should generate MIS report', async ({ page }) => {
    await page.goto('/admin/wms-mis-report');
    
    await expect(page).toHaveURL(/\/admin\/wms-mis-report/);
    
    // Check for KPI cards
    await expect(page.getByText(/Total Revenue/i)).toBeVisible();
    await expect(page.getByText(/Total Orders/i)).toBeVisible();
    
    // Check for charts
    await expect(page.locator('.recharts-wrapper')).toBeVisible();
  });

  test('should export invoice', async ({ page }) => {
    await page.goto('/admin/wms-invoices');
    
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('text=Export');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/\.(pdf|csv|xlsx)$/);
  });
});
