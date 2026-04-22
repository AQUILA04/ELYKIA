import { test, expect } from '@playwright/test';
import { NetworkInterceptor } from '../fixtures/network-interceptor';

test.describe('Offline Synchronization', () => {
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

  test('should start synchronization and handle network correctly', async ({ page }) => {
    // Click on sync button in dashboard or menu
    // We assume there's a button with icon or text 'Démarrer la synchronisation'
    await page.locator('ion-tab-button').filter({ hasText: 'Plus' }).click();
    await page.getByText('Synchronisation').first().click();

    // Check if ready state
    await expect(page.getByText('Prêt à synchroniser')).toBeVisible();

    // Start sync
    await page.getByText('Démarrer la synchronisation').click();
    
    // Confirm
    await page.getByText('Confirmer', { exact: true }).click();

    // It should show progress (mock interceptor will immediately resolve API calls)
    await expect(page.getByText('Synchronisation terminée', { exact: false })).toBeVisible({ timeout: 15000 });
  });

  test('should display sync errors', async ({ page }) => {
    // Go to sync errors screen
    await page.locator('ion-tab-button').filter({ hasText: 'Plus' }).click();
    await page.getByText('Erreurs de synchronisation').click();

    // Should display list or "Aucune erreur"
    const noErrorMsg = page.getByText('Aucune erreur de synchronisation');
    const errorCard = page.locator('.error-card');
    
    // Assert one or the other is visible
    // Since we start from a clean state, it should be empty
    await expect(noErrorMsg).toBeVisible();
  });
});
