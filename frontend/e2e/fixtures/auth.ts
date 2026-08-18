import { expect, Page } from '@playwright/test';
import { ApiClient } from './api-client';
import { E2eUserKey, resolveCredentials } from './test-data';

export type { E2eUserKey };

async function dismissSweetAlert(page: Page): Promise<void> {
  const confirmButton = page.locator('.swal2-confirm');
  if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmButton.click();
    await page.locator('.swal2-container').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}

export async function loginAs(page: Page, userKey: E2eUserKey): Promise<void> {
  const { username, password } = await resolveCredentials(userKey);

  // Évite que Firebase Remote Config active printReceiptAfterSale en CI (bloque la redirection).
  await page.addInitScript(() => {
    sessionStorage.setItem('elykia.skipRemoteConfig', '1');
  });

  await page.goto('/login');
  if (!/\/login/.test(page.url())) {
    await page.evaluate(() => {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('currentUser');
    });
    await page.goto('/login');
  }
  await page.getByTestId('e2e-login-form').waitFor({ state: 'visible' });

  await page.getByTestId('e2e-login-username').fill(username);
  await page.getByTestId('e2e-login-password').fill(password);
  await page.getByTestId('e2e-login-submit').click();

  await expect(page).toHaveURL(/\/home/, { timeout: 30_000 });
  await page.getByTestId('e2e-app-shell').waitFor({ state: 'visible', timeout: 15_000 });
  await dismissSweetAlert(page);
}

export async function loginAsGestionnaire(page: Page): Promise<void> {
  await loginAs(page, 'gestionnaire');
}

export async function loginAsMagasinier(page: Page): Promise<void> {
  await loginAs(page, 'magasinier');
}

export async function loginAsCommercial(page: Page): Promise<void> {
  await loginAs(page, 'commercial');
}

export async function loginAsSecretaire(page: Page): Promise<void> {
  await loginAs(page, 'secretaire');
}

export async function loginAsRecoveryManager(page: Page): Promise<void> {
  await loginAs(page, 'recoveryManager');
}

/** Vérifie que les identifiants fonctionnent sur l'API du environnement courant. */
export async function canSignIn(userKey: E2eUserKey): Promise<boolean> {
  try {
    await resolveCredentials(userKey);
    return true;
  } catch {
    return false;
  }
}

export async function logout(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('currentUser');
  });
  await page.goto('/login');
}
