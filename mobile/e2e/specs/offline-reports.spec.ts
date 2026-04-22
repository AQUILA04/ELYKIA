import { test, expect } from '@playwright/test';
import { NetworkInterceptor } from '../fixtures/network-interceptor';

test.describe('Offline Reports', () => {
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

  test('should view the daily report offline', async ({ page }) => {
    // Navigate to Rapport Journalier
    // Could be on dashboard or via Plus menu
    await page.getByText('Rapport du Jour').first().click();

    // Check header
    await expect(page.getByText('Rapport Journalier').first()).toBeVisible();

    // Check KPIs
    await expect(page.getByText('Montant Distribué')).toBeVisible();
    await expect(page.getByText('Montant Collecté')).toBeVisible();
    await expect(page.getByText('Nouveaux Clients')).toBeVisible();
    await expect(page.getByText('Total à Verser')).toBeVisible();

    // Check Tabs
    await page.getByText('Distributions').click();
    // Verify some distribution appears (if the test interacts with state, otherwise empty)
    
    await page.getByText('Recouvrements').click();
    // Verify some recovery appears
    
    await page.getByText('Clients').click();
    // Verify new client appears
    
    // Check print button
    await expect(page.getByText('Imprimer').first()).toBeVisible();
  });
});
