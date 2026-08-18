import { test, expect } from '@playwright/test';
import { loginAsRecoveryManager } from '../../fixtures/auth';
import { ApiClient } from '../../fixtures/api-client';

function expectForbiddenAggregate(
  response: { status: number; text: string },
  label: string,
): void {
  expect(response.status, `${label} must not succeed: ${response.text}`).not.toBe(200);
  const denied =
    [401, 403].includes(response.status) ||
    /access denied|forbidden|unauthorized|n'est pas autorisé/i.test(response.text);
  expect(denied, `${label} HTTP ${response.status}: ${response.text}`).toBe(true);
}

test.describe('Permissions KPI financiers @p0 @web @august-2026 @regression', () => {
  test('W-P0-01 recov001 : listes ventes visibles, bandeaux KPI absents', async ({ page }) => {
    await loginAsRecoveryManager(page);
    await page.goto('/credit/list');
    await expect(page.getByTestId('e2e-credit-list')).toBeVisible();
    await expect(page.getByTestId('e2e-credit-list-kpi-closed')).toHaveCount(0);
    await expect(page.getByTestId('e2e-credit-kpi-period')).toHaveCount(0);
  });

  test('W-P0-01b recov001 : /home sans grille KPI financier dashboard-v2', async ({ page }) => {
    await loginAsRecoveryManager(page);
    await page.goto('/home');
    await expect(page.getByTestId('e2e-app-shell')).toBeVisible();
    await expect(page.getByTestId('e2e-dashboard-kpi-grid')).toHaveCount(0);
  });

  test('W-P0-02 recov001 : agrégats financiers API refusés', async () => {
    const api = new ApiClient();
    const auth = await api.signInAsRecoveryManager();
    expect(auth.roles.some((role) => role.startsWith('ROLE_KPI_FINANCIER_'))).toBe(false);

    const year = new Date().getFullYear();
    const summary = await api.requestStatus('/api/v1/credits/list-summary', {
      method: 'POST',
      body: JSON.stringify({
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
        search: null,
      }),
    });
    expectForbiddenAggregate(summary, 'list-summary');

    const yearly = await api.requestStatus(
      `/api/daily-commercial-reports/yearly-summary?year=${year}`,
    );
    expectForbiddenAggregate(yearly, 'yearly-summary');
  });

  test('W-P0-03 recov001 : rapport journalier — seul onglet Recouvrement', async ({ page }) => {
    await loginAsRecoveryManager(page);
    await page.goto('/report/daily');
    await expect(page.getByTestId('e2e-daily-report')).toBeVisible();
    await expect(page.getByTestId('e2e-daily-report-tab-recovery')).toBeVisible();
    await expect(page.getByTestId('e2e-daily-report-tab-overview')).toHaveCount(0);
    await expect(page.getByTestId('e2e-daily-report-tab-journal')).toHaveCount(0);
    await expect(page.getByTestId('e2e-daily-report-tab-deposits')).toHaveCount(0);
  });

  test('W-P1-12 ges003 : list-summary KPI autorisé (contrôle positif API)', async () => {
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const year = new Date().getFullYear();
    const summary = await api.requestStatus('/api/v1/credits/list-summary', {
      method: 'POST',
      body: JSON.stringify({
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
        search: null,
      }),
    });
    expect(summary.status, `list-summary body=${summary.text}`).toBe(200);
  });
});
