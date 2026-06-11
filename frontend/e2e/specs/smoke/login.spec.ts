import { test, expect } from '@playwright/test';
import { loginAsGestionnaire, loginAsMagasinier } from '../../fixtures/auth';
import { USERS } from '../../fixtures/test-data';

test.describe('Authentification web admin', () => {
  test('ges003 (gestionnaire) se connecte et accède au tableau de bord', async ({ page }) => {
    await loginAsGestionnaire(page);
    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByTestId('e2e-sidebar')).toBeVisible();
    await expect(page.getByTestId('e2e-sidebar-clients')).toBeVisible();
  });

  test('mag001 (magasinier) se connecte et accède au tableau de bord', async ({ page }) => {
    await loginAsMagasinier(page);
    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByTestId('e2e-sidebar')).toBeVisible();
  });

  test('identifiants invalides affichent une erreur', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('e2e-login-username').fill('invalid_user');
    await page.getByTestId('e2e-login-password').fill('wrong_password');
    await page.getByTestId('e2e-login-submit').click();

    await expect(page.getByTestId('e2e-login-error')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirection vers login si non authentifié', async ({ page }) => {
    await page.goto('/client-list');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId('e2e-login-form')).toBeVisible();
  });
});

test.describe('Comptes de test documentés', () => {
  test('les identifiants par défaut ges003 et mag001 sont définis', () => {
    expect(USERS.gestionnaire.username).toMatch(/ges003/);
    expect(USERS.magasinier.username).toMatch(/mag001/);
  });
});
