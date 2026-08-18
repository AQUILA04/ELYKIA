import { expect, Locator, Page } from '@playwright/test';

const COMMERCIAL = process.env['E2E_COMMERCIAL_USERNAME'] ?? 'COM020';

export async function clickIonic(locator: Locator): Promise<void> {
  await locator.evaluate((host) => {
    const native = host.shadowRoot?.querySelector('button, input, a') ?? host;
    native.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
  });
}

export async function dismissVolumeWarningIfNeeded(page: Page): Promise<void> {
  const alert = page.locator('ion-alert').filter({ hasText: /Volume élevé/i });
  if (await alert.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await alert.getByRole('button', { name: 'Continuer' }).click();
    await alert.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
  }
}

export async function openRmPlanWizard(page: Page): Promise<void> {
  if (/\/rm\/dashboard/.test(page.url())) {
    await clickIonic(page.getByTestId('e2e-rm-tab-more'));
    await expect(page).toHaveURL(/\/rm\/more/, { timeout: 20_000 });
    await page.getByText('Changer le plan du jour').click();
  }
  await expect(page).toHaveURL(/\/rm\/plan/, { timeout: 30_000 });
  await expect(page.getByTestId('e2e-rm-plan-page')).toBeVisible();
  await expect(page.locator('[data-testid="e2e-rm-plan-collector"]').first()).toBeVisible({ timeout: 60_000 });
}

export async function ensureRmFieldPack(
  page: Page,
  options: { pickLocality?: boolean; collectorCount?: number } = {},
): Promise<void> {
  if (/\/rm\/dashboard/.test(page.url()) && (await page.getByTestId('e2e-rm-shell').isVisible().catch(() => false))) {
    return;
  }

  await expect(page).toHaveURL(/\/rm\/plan/, { timeout: 30_000 });
  await expect(page.getByTestId('e2e-rm-plan-page')).toBeVisible();

  const wanted = Math.min(Math.max(options.collectorCount ?? 1, 1), 3);
  const collectors = page.locator('[data-testid="e2e-rm-plan-collector"]');
  await expect(collectors.first()).toBeVisible({ timeout: 60_000 });

  const preferred = collectors.filter({ hasText: COMMERCIAL }).first();
  if (wanted === 1 && (await preferred.isVisible().catch(() => false))) {
    await preferred.click();
  } else {
    const available = Math.min(wanted, await collectors.count());
    for (let i = 0; i < available; i++) {
      await collectors.nth(i).click();
    }
  }

  await clickIonic(page.getByTestId('e2e-rm-plan-continue'));
  await expect(page.getByRole('heading', { name: 'Localités' })).toBeVisible({ timeout: 15_000 });

  if (options.pickLocality) {
    await page.getByTestId('e2e-rm-plan-open-localities').click();
    const locality = page.getByTestId('e2e-rm-plan-locality').first();
    if (await locality.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await locality.click();
      await clickIonic(page.getByTestId('e2e-rm-plan-apply-localities'));
    } else {
      await page.getByRole('button', { name: 'Fermer' }).click();
    }
  }

  await clickIonic(page.getByTestId('e2e-rm-plan-localities-continue'));
  await expect(page.getByRole('heading', { name: 'Téléchargement' })).toBeVisible({ timeout: 15_000 });

  await clickIonic(page.getByTestId('e2e-rm-plan-download'));
  await dismissVolumeWarningIfNeeded(page);
  await page.locator('ion-loading').waitFor({ state: 'hidden', timeout: 180_000 }).catch(() => {});
  await expect(page).toHaveURL(/\/rm\/dashboard/, { timeout: 60_000 });
  await expect(page.getByTestId('e2e-rm-shell')).toBeVisible();
}
