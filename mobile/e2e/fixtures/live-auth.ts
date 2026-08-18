import { expect, Page } from '@playwright/test';
import { LIVE_ACCOUNTS } from './accounts';

export async function dismissBlockingAlerts(page: Page) {
  const alert = page.locator('ion-alert').first();
  if (!(await alert.isVisible({ timeout: 2000 }).catch(() => false))) {
    return;
  }

  const knownButtons = ['Continuer (données limitées)', 'Continuer', 'OK', 'Fermer', 'Confirmer'];
  for (const label of knownButtons) {
    const button = page.locator('ion-alert button').filter({ hasText: label }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await alert.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      return;
    }
  }
}

async function fillIonInput(page: Page, placeholder: string, value: string) {
  const input = page.locator(`input.native-input[placeholder="${placeholder}"]`).first();
  await input.waitFor({ state: 'visible', timeout: 60_000 });
  await input.fill(value);
  await input.blur();
}

export async function loginLive(
  page: Page,
  username: string,
  password: string,
): Promise<void> {
  await page.goto('/', { waitUntil: 'load', timeout: 60_000 });
  await expect(page).toHaveURL(/\/login/, { timeout: 60_000 });
  await fillIonInput(page, "Saisissez votre nom d'utilisateur", username);
  await fillIonInput(page, 'Saisissez votre mot de passe', password);
  await page.getByRole('button', { name: 'SE CONNECTER', exact: true }).click();
  await dismissBlockingAlerts(page);
}

export async function loginAsRecoveryManagerLive(page: Page): Promise<void> {
  await loginLive(
    page,
    LIVE_ACCOUNTS.recoveryManager.username,
    LIVE_ACCOUNTS.recoveryManager.password,
  );
  await expect(page).toHaveURL(/\/rm\//, { timeout: 60_000 });
  await dismissBlockingAlerts(page);
}

export async function loginAsCommercialLive(page: Page): Promise<void> {
  await loginLive(page, LIVE_ACCOUNTS.commercial.username, LIVE_ACCOUNTS.commercial.password);
  await expect(page).toHaveURL(/\/(initial-loading|tabs)/, { timeout: 30_000 });
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (/\/tabs/.test(page.url())) {
      break;
    }
    await dismissBlockingAlerts(page);
    await page.waitForTimeout(500);
  }
  await expect(page).toHaveURL(/\/tabs/, { timeout: 15_000 });
}
