import { test, expect } from '@playwright/test';
import { NetworkInterceptor } from '../fixtures/network-interceptor';

test.describe('Offline Recoveries', () => {
  let interceptor: NetworkInterceptor;

  test.beforeEach(async ({ page }) => {
    interceptor = new NetworkInterceptor(page);
    await interceptor.setup();

    await page.goto('/login');
    await page.getByPlaceholder("Saisissez votre nom d'utilisateur").fill('COM002');
    await page.getByPlaceholder("Saisissez votre mot de passe").fill('password');
    await page.getByText('SE CONNECTER').click();
    await expect(page).toHaveURL(/\/tabs/, { timeout: 15000 });
  });

  test('should process a recovery (encaissement) offline', async ({ page }) => {
    // Navigate to Recovery via Dashboard
    await page.getByText('Recouvrement').first().click();

    // Step 1: Select client
    await page.getByText('Sélectionner un Client').click();
    // Select a client that has an active credit (based on mock data)
    await page.locator('ion-item').filter({ hasText: 'Client Avec Credit' }).click();

    // Step 2: Select the active credit
    await page.getByText('Sélectionner ce Crédit').first().click();

    // Step 3: Enter amount
    // Use the 2x quick button
    await page.getByText('2x').click();

    // Step 4: Confirm Recovery
    await page.getByText('CONFIRMER LE RECOUVREMENT').click();

    // Check success
    await expect(page.getByText('Succès')).toBeVisible();
  });
});
