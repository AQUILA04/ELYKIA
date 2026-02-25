import { test, expect } from '@playwright/test';

test.describe('Mobile Offline Sync', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Mobile App
    await page.goto('/');

    // Login
    await page.fill('ion-input[name="username"] input', 'agent01');
    await page.fill('ion-input[name="password"] input', 'password');
    await page.click('ion-button[type="submit"]');

    // Wait for Dashboard
    await expect(page).toHaveURL('/tabs/dashboard');
  });

  test('should store transaction offline and sync when online', async ({ page }) => {
    // 1. Simulate Offline Mode
    await page.route('**/api/**', route => route.abort('internet-disconnected'));

    // 2. Perform Action (e.g., Add Tontine Member)
    await page.click('ion-tab-button[tab="tontine"]');
    await page.click('ion-fab-button[data-testid="add-member"]');

    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'Offline');
    await page.click('ion-button[type="submit"]');

    // 3. Verify Local Storage (UI Feedback)
    const toast = page.locator('ion-toast');
    await expect(toast).toContainText('Enregistré localement');

    // 4. Simulate Online Mode
    await page.unroute('**/api/**');

    // 5. Trigger Sync (Manual or Auto)
    await page.click('ion-button[data-testid="sync-button"]');

    // 6. Verify Sync Success
    const syncStatus = page.locator('ion-badge[color="success"]');
    await expect(syncStatus).toBeVisible();

    // Optional: Verify Backend received data via API check
    // const apiResponse = await request.get('/api/members?name=Test');
    // expect(apiResponse.ok()).toBeTruthy();
  });
});
