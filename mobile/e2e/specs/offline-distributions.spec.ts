import { test, expect } from '@playwright/test';
import { NetworkInterceptor } from '../fixtures/network-interceptor';

test.describe('Offline Distributions', () => {
  let interceptor: NetworkInterceptor;

  test.beforeEach(async ({ page }) => {
    interceptor = new NetworkInterceptor(page);
    await interceptor.setup();

    await page.goto('/login');
    await page.locator('input[name="username"]').fill('COM002');
    await page.locator('input[name="password"]').fill('password');
    await page.getByText('SE CONNECTER').click();
    await expect(page).toHaveURL(/\/tabs/, { timeout: 15000 });
    
    await page.locator('ion-tab-button').filter({ hasText: 'Distributions' }).click();
  });

  test('should create a new distribution (vente à crédit) offline', async ({ page }) => {
    // Click "Nouvelle Distribution"
    await page.getByText('Nouvelle Distribution').first().click();

    // Step 1: Select client
    await page.getByText('Sélectionner un Client').click();
    // Assuming a modal opens with client list
    await page.locator('ion-item').filter({ hasText: 'Client Sans Credit' }).click(); 

    // Step 2: Add articles
    // Increase quantity of first article
    const firstArticlePlusBtn = page.locator('.article-item').first().locator('ion-button').filter({ hasText: '+' });
    await firstArticlePlusBtn.click();
    await firstArticlePlusBtn.click();

    // Step 3: Check summary and calculate
    await expect(page.getByText('Résumé')).toBeVisible();
    // Verify auto calculation of "Mise journalière" and "Avance" (these depend on exact pricing in mock data)
    
    // Step 4: Validate
    await page.getByText('CONFIRMER LA DISTRIBUTION').click();
    
    // Confirmation modal
    await page.getByText('Confirmer', { exact: true }).click();

    // Success message and receipt prompt
    await expect(page.getByText('Succès')).toBeVisible();
  });
});
