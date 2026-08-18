import { test, expect } from '@playwright/test';
import { loginAsRecoveryManagerLive } from '../../fixtures/live-auth';
import { clickIonic, ensureRmFieldPack } from '../../fixtures/rm-plan-ops';

test.describe('Pack terrain chef de recouvrement @p0 @mobile @rm @august-2026 @regression', () => {
  test('RM-P0-04 wizard : 1 commercial, localités, pack ACTIVE, shell + KPI', async ({ page }) => {
    test.setTimeout(240_000);

    await loginAsRecoveryManagerLive(page);
    await ensureRmFieldPack(page, { pickLocality: true });

    await expect(page.getByTestId('e2e-rm-tab-dashboard')).toBeAttached();
    await expect(page.getByTestId('e2e-rm-tab-field')).toBeAttached();
    await expect(page.getByTestId('e2e-rm-tab-clients')).toBeAttached();
    await expect(page.getByTestId('e2e-rm-tab-more')).toBeAttached();
    await expect(page.getByTestId('e2e-rm-kpi-lates')).toBeVisible();
    await expect(page.getByTestId('e2e-rm-kpi-strip')).toBeVisible();
  });
});
