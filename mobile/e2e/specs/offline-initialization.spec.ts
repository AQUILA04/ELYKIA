import { test, expect } from '@playwright/test';
import { NetworkInterceptor } from '../fixtures/network-interceptor';

test.describe('Offline Initialization', () => {
  let interceptor: NetworkInterceptor;

  test.beforeEach(async ({ page }) => {
    interceptor = new NetworkInterceptor(page);
    await interceptor.setup();

    // Clear local storage / IndexedDB before starting
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      // Delete indexedDB for localForage (Ionic Storage)
      indexedDB.databases().then(dbs => {
        dbs.forEach(db => {
          if(db.name) indexedDB.deleteDatabase(db.name);
        });
      });
    });
  });

  test('should login and perform mocked initialization', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    
    // Fill credentials
    const usernameInput = page.locator('ion-input[name="username"] input').first();
    // Sometimes ionic inputs are shadow DOM, but playwright pierces it, or we can use getByPlaceholder
    await page.getByPlaceholder("Saisissez votre nom d'utilisateur").fill('COM002');
    await page.getByPlaceholder("Saisissez votre mot de passe").fill('password');

    // Click Login
    await page.getByText('SE CONNECTER').click();

    // It should navigate to initial-loading page
    await expect(page).toHaveURL(/\/initial-loading/);

    // Progress bar should complete (the text will change as it mocks requests)
    await expect(page.getByText('Initialisation terminée !')).toBeVisible({ timeout: 15000 });

    // Should redirect to tabs
    await expect(page).toHaveURL(/\/tabs/, { timeout: 10000 });
  });

  test('should handle offline mode during initialization', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    
    // Go completely offline via Playwright
    await interceptor.goOffline();
    
    // Fill credentials
    await page.getByPlaceholder("Saisissez votre nom d'utilisateur").fill('COM002');
    await page.getByPlaceholder("Saisissez votre mot de passe").fill('password');

    // Click Login
    await page.getByText('SE CONNECTER').click();

    // If completely offline, maybe login fails, but let's assume login passes if we have a token,
    // or if the app detects offline mode. Actually the user guide says:
    // "Si hors ligne : L'écran indiquera que le mode hors ligne est détecté et vous redirigera..."
    // Wait, login requires backend if not cached. 
    // Let's go offline AFTER login.
    await interceptor.goOnline();
    await page.getByText('SE CONNECTER').click();
    await expect(page).toHaveURL(/\/initial-loading/);
    
    await interceptor.goOffline();

    // App should detect offline
    await expect(page.getByText('Mode hors ligne détecté')).toBeVisible({ timeout: 10000 });
    
    // Should still redirect to tabs eventually
    await expect(page).toHaveURL(/\/tabs/, { timeout: 10000 });
  });
});
