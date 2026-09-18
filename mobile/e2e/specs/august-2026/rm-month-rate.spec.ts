import { test, expect } from '@playwright/test';
import { loginAsRecoveryManagerLive } from '../../fixtures/live-auth';
import { ensureRmFieldPack } from '../../fixtures/rm-plan-ops';

test.describe('Taux du mois RM @p1 @mobile @rm @august-2026 @regression', () => {
  test('RM-KPI-01 bandeau Taux du mois visible online sur /rm/dashboard', async ({ page }) => {
    test.setTimeout(180_000);

    await page.route('**/api/v1/recovery-manager/kpi/monthly-recovery-rate**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 200,
          data: {
            year: 2026,
            month: 9,
            amountCollectedByChef: 250000,
            latePortfolioDue: 1000000,
            lateCreditsCount: 10,
            operationsCount: 4,
            recoveryRatePercent: 25
          }
        }),
      });
    });

    await loginAsRecoveryManagerLive(page);
    await ensureRmFieldPack(page);
    await page.goto('/rm/dashboard');

    await expect(page.getByTestId('e2e-rm-kpi-strip')).toBeVisible({ timeout: 20_000 });
    const banner = page.getByTestId('e2e-rm-month-rate-banner');
    await expect(banner).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('e2e-rm-month-rate-value')).toContainText('%');
    await expect(banner).toContainText('Taux du mois');
    await expect(banner).toContainText('tous les retards délai');
  });
});
