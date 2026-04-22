import { test, expect } from '@playwright/test';
import { NetworkInterceptor } from '../fixtures/network-interceptor';

test.describe('Offline Articles', () => {
  let interceptor: NetworkInterceptor;

  test.beforeEach(async ({ page }) => {
    interceptor = new NetworkInterceptor(page);
    await interceptor.setup();

    await page.goto('/login');
    await page.getByPlaceholder("Saisissez votre nom d'utilisateur").fill('COM002');
    await page.getByPlaceholder("Saisissez votre mot de passe").fill('password');
    await page.getByText('SE CONNECTER').click();
    await expect(page).toHaveURL(/\/tabs/, { timeout: 15000 });
    
    // Navigate to articles (Usually in 'Plus' tab then 'Articles' or directly via menu)
    await page.locator('ion-tab-button').filter({ hasText: 'Plus' }).click();
    await page.getByText('Articles').click();
    await expect(page).toHaveURL(/\/articles/);
  });

  test('should display article catalog and allow searching', async ({ page }) => {
    // Check title
    await expect(page.getByText('Articles').first()).toBeVisible();

    // Articles should be loaded from mock data
    // Example: "TOMATE: ROCCO 70G"
    await expect(page.getByText('TOMATE: ROCCO 70G')).toBeVisible();

    // Test search
    const searchBar = page.getByPlaceholder('Rechercher');
    await searchBar.fill('MERVIA');
    
    // Should filter articles
    await expect(page.getByText('MAYONNAISE: MERVIA PETIT')).toBeVisible();
    await expect(page.getByText('TOMATE: ROCCO 70G')).toBeHidden();
  });
});
