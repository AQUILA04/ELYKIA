import { test, expect } from '@playwright/test';
import { loginAsCommercial, loginAsGestionnaire, loginAsRecoveryManager } from '../../fixtures/auth';
import { ApiClient } from '../../fixtures/api-client';

const RM_DEFAULT_ROLES = [
  'ROLE_CONSULT_CLIENT',
  'ROLE_EDIT_CLIENT',
  'ROLE_ASSIGN_CLIENT_COLLECTOR',
  'ROLE_ASSIGN_CREDIT_COLLECTOR',
] as const;

test.describe('Permissions changement commercial @p0 @web @august-2026 @regression', () => {
  test('W-P0-04 promoteur : pas de colonne sélection change-collector', async ({ page }) => {
    await loginAsCommercial(page);
    await page.goto('/credit/list');
    await expect(page.getByTestId('e2e-credit-list')).toBeVisible();
    await expect(page.getByTestId('e2e-credit-collector-select-col')).toHaveCount(0);
  });

  test('W-P0-05 gestionnaire : colonne sélection change-collector visible', async ({ page }) => {
    await loginAsGestionnaire(page);
    await page.goto('/credit/list');
    await expect(page.getByTestId('e2e-credit-list')).toBeVisible();
    await expect(page.getByTestId('e2e-credit-collector-select-col')).toBeVisible();
  });

  test('W-P0-05b recov001 : rôles clients et ASSIGN_* par défaut', async () => {
    const api = new ApiClient();
    const auth = await api.signInAsRecoveryManager();
    for (const role of RM_DEFAULT_ROLES) {
      expect(auth.roles, `JWT recov001 doit contenir ${role}`).toContain(role);
    }
  });

  test('W-P0-05c recov001 : menu clients + change-collector ventes/clients', async ({ page }) => {
    await loginAsRecoveryManager(page);
    await expect(page.getByTestId('e2e-sidebar-clients')).toBeVisible();

    await page.goto('/credit/list');
    await expect(page.getByTestId('e2e-credit-list')).toBeVisible();
    await expect(page.getByTestId('e2e-credit-collector-select-col')).toBeVisible();

    await page.getByTestId('e2e-sidebar-clients').click();
    await expect(page.getByTestId('e2e-client-list')).toBeVisible();
    await expect(page.getByTestId('e2e-client-collector-select-col')).toBeVisible();
  });
});
