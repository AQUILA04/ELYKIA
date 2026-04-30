import { expect, Page } from '@playwright/test';

async function dismissBlockingAlerts(page: Page) {
  const alert = page.locator('ion-alert').first();
  if (!(await alert.isVisible({ timeout: 2000 }).catch(() => false))) {
    return;
  }

  const knownButtons = ['Continuer', 'OK', 'Fermer', 'Confirmer'];
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

export async function loginAndWaitForTabs(page: Page, timeoutMs = 45000) {
  await page.goto('/login');
  await page.locator('input[name="username"]').fill('COM002');
  await page.locator('input[name="password"]').fill('password');
  await page.getByText('SE CONNECTER').click();

  // App now goes through /initial-loading before landing on /tabs.
  await expect(page).toHaveURL(/\/(initial-loading|tabs)/, { timeout: 15000 });
  await expect(page).toHaveURL(/\/tabs/, { timeout: timeoutMs });
  await dismissBlockingAlerts(page);
}
