import { expect, Page } from '@playwright/test';

async function dismissBlockingAlerts(page: Page) {
  const alert = page.locator('ion-alert').first();
  if (!(await alert.isVisible({ timeout: 2000 }).catch(() => false))) {
    return;
  }

  const knownButtons = [
    'Continuer (données limitées)',
    'Continuer',
    'OK',
    'Fermer',
    'Confirmer',
  ];
  for (const label of knownButtons) {
    const button = page.locator('ion-alert button').filter({ hasText: label }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await alert.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      return;
    }
  }

  // Fallback: click the first visible button in case text changed.
  const anyButton = page.locator('ion-alert button').first();
  if (await anyButton.isVisible().catch(() => false)) {
    await anyButton.click();
    await alert.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}

async function waitForTabsAfterInitialization(page: Page, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (/\/tabs/.test(page.url())) {
      return;
    }

    await dismissBlockingAlerts(page);
    await page.waitForTimeout(500);
  }

  await expect(page).toHaveURL(/\/tabs/, { timeout: 0 });
}

async function fillIonInput(page: Page, placeholder: string, value: string) {
  const input = page.locator(`input.native-input[placeholder="${placeholder}"]`).first();
  await input.waitFor({ state: 'visible', timeout: 60_000 });
  await input.fill(value);
  await input.blur();
}

export async function loginAndWaitForTabs(page: Page, timeoutMs = 90_000) {
  // Static http-server needs SPA fallback; always boot from / then wait for login route.
  await page.goto('/', { waitUntil: 'load', timeout: 60_000 });
  await expect(page).toHaveURL(/\/login/, { timeout: 60_000 });
  await expect(
    page.locator('input.native-input[placeholder="Saisissez votre nom d\'utilisateur"]'),
  ).toBeVisible({ timeout: 60_000 });

  await fillIonInput(page, "Saisissez votre nom d'utilisateur", 'COM002');
  await fillIonInput(page, 'Saisissez votre mot de passe', 'password');
  await page.getByRole('button', { name: 'SE CONNECTER', exact: true }).click();

  // App now goes through /initial-loading before landing on /tabs.
  await expect(page).toHaveURL(/\/(initial-loading|tabs)/, { timeout: 15_000 });
  await waitForTabsAfterInitialization(page, timeoutMs);
  await dismissBlockingAlerts(page);
}
