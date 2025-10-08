import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Tawreed/);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should show validation errors for empty login', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check for validation messages
    await expect(page.getByText(/email.*required/i)).toBeVisible();
  });

  test('should navigate between login and signup', async ({ page }) => {
    await page.goto('/');
    
    // Click sign up link
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    
    // Go back to login
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check for main navigation elements
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
  });
});
