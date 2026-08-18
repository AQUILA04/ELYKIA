import { test, expect } from '@playwright/test';
import { loginAsCommercialLive, loginAsRecoveryManagerLive } from '../../fixtures/live-auth';

test.describe('Shell chef de recouvrement @p0 @mobile @rm @august-2026 @regression', () => {
  test('RM-P0-01 recov001 : login ouvre /rm, pas /tabs ni SSO web', async ({ page }) => {
    await loginAsRecoveryManagerLive(page);
    await expect(page).toHaveURL(/\/rm\/(plan|dashboard)/);
    await expect(page).not.toHaveURL(/\/tabs/);
    await expect(page).not.toHaveURL(/localhost:4200/);
  });

  test('RM-P0-03 sans pack : tabs redirigent vers /rm/plan', async ({ page }) => {
    await loginAsRecoveryManagerLive(page);
    await page.goto('/rm/dashboard');
    await expect(page).toHaveURL(/\/rm\/(plan|dashboard)/, { timeout: 20_000 });
    if (/\/rm\/plan/.test(page.url())) {
      await expect(page.getByTestId('e2e-rm-plan-page')).toBeVisible();
    } else {
      await expect(page.getByTestId('e2e-rm-shell')).toBeVisible();
    }
  });

  test('RM-P0-02 commercial : /rm est refusé vers /tabs', async ({ page }) => {
    await loginAsCommercialLive(page);
    await page.goto('/rm/dashboard');
    await expect(page).toHaveURL(/\/tabs/, { timeout: 20_000 });
  });
});
