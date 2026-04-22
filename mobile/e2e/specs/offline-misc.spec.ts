import { test, expect } from '@playwright/test';
import { NetworkInterceptor } from '../fixtures/network-interceptor';

test.describe('Offline Misc (Localities, Tontines)', () => {
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

  test('should add a member to Tontine and process collection offline', async ({ page }) => {
    // Navigate to Tontines (Menu -> Tontines)
    await page.locator('ion-tab-button').filter({ hasText: 'Plus' }).click();
    await page.getByText('Tontines').click();

    // Select a Tontine session
    // Wait for mock sessions to appear
    await page.locator('ion-item.tontine-session').first().click();

    // Add a client as a member
    await page.getByText('Ajouter un membre').click();
    await page.locator('ion-item.client-item').first().click(); // Select first client
    await page.getByText('Confirmer').click();

    // Verify member is added
    await expect(page.getByText('Membre ajouté avec succès')).toBeVisible();

    // Perform a collection (cotisation) for this member
    // Find the member in the list and click "Collecter"
    await page.getByText('Collecter').first().click();

    // Enter amount
    const amountInput = page.locator('ion-input[name="amount"] input');
    await amountInput.fill('1000');

    // Validate
    await page.getByText('Valider la collecte').click();

    // Success and receipt
    await expect(page.getByText('Collecte enregistrée')).toBeVisible();
  });

  test('should add a new locality offline', async ({ page }) => {
    // Navigate to Localities (Menu -> Plus -> Données -> Localités)
    await page.locator('ion-tab-button').filter({ hasText: 'Plus' }).click();
    await page.getByText('Localités').click();

    // Click +
    await page.locator('ion-fab-button').click();

    // Fill form
    await page.getByLabel('Nom de la localité').fill('Quartier E2E');

    // Save
    await page.getByText('Enregistrer').click();

    // Check success
    await expect(page.getByText('Localité ajoutée')).toBeVisible();
    await expect(page.getByText('Quartier E2E')).toBeVisible();
  });
});
