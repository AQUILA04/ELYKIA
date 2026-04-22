import { test, expect } from '@playwright/test';
import { NetworkInterceptor } from '../fixtures/network-interceptor';

test.describe('Offline Clients Management', () => {
  let interceptor: NetworkInterceptor;

  test.beforeEach(async ({ page }) => {
    interceptor = new NetworkInterceptor(page);
    await interceptor.setup();

    // Login and wait for initial load to finish so we are at /tabs
    await page.goto('/login');
    await page.locator('input[name="username"]').fill('COM002');
    await page.locator('input[name="password"]').fill('password');
    await page.getByText('SE CONNECTER').click();
    await expect(page).toHaveURL(/\/tabs/, { timeout: 15000 });
    
    // Navigate to clients tab
    // Tab could be a button with text "Clients" or an icon
    await page.locator('ion-tab-button').filter({ hasText: 'Clients' }).click();
    await expect(page).toHaveURL(/\/tabs\/clients/);
  });

  test('should display client list and filters correctly', async ({ page }) => {
    // Check search bar
    await expect(page.getByPlaceholder('Rechercher un client...')).toBeVisible();

    // Check filters
    await expect(page.getByText('Tous')).toBeVisible();
    await expect(page.getByText('Crédit en cours')).toBeVisible();
    await expect(page.getByText('Nouveau')).toBeVisible();

    // Verify some mock clients are displayed
    // Depending on mock data, there should be some ion-item or card
    const clientItems = page.locator('ion-item.client-item');
    // We assume there are clients loaded from mock
    // Wait for at least one to be visible
    await expect(clientItems.first()).toBeVisible({ timeout: 5000 });
  });

  test('should create a new client offline', async ({ page }) => {
    // Click add button
    await page.locator('ion-fab-button').click(); // Usually the + button is a fab-button

    // Expect to be on create client page
    // Fill form (adjust selectors based on actual implementation)
    await page.locator('ion-item').filter({ hasText: 'Nom' }).locator('input').first().fill('Test Client Offline');
    await page.locator('ion-item').filter({ hasText: 'Prénom' }).locator('input').first().fill('E2E');
    await page.locator('ion-item').filter({ hasText: 'Téléphone' }).locator('input').first().fill('0123456789');
    
    // Select locality if required
    const localitySelect = page.locator('ion-select[name="locality"]');
    if (await localitySelect.isVisible()) {
      await localitySelect.click();
      await page.locator('ion-select-option').first().click();
      await page.getByText('OK', { exact: true }).click();
    }

    // Submit form
    await page.getByText('Enregistrer').click();

    // Should return to clients list
    await expect(page).toHaveURL(/\/tabs\/clients/);

    // Check if the "Nouveau" filter shows our new client
    await page.getByText('Nouveau').click();
    await expect(page.getByText('Test Client Offline')).toBeVisible();
  });
});
