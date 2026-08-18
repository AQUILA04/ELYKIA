import { test, expect } from '@playwright/test';
import { ApiClient } from '../../fixtures/api-client';
import { loginAsSecretaire } from '../../fixtures/auth';

test.describe('Remise dépenses net @p0 @web @august-2026 @regression', () => {
  test('W-P0-09/10 onglet remise : net = versé − dépenses, freeze si RECEIVED', async ({ page }) => {
    const now = new Date();
    const api = new ApiClient();
    await api.signInAsSecretaire();
    const summary = await api.getRemittanceSummary(now.getFullYear(), now.getMonth() + 1);

    await loginAsSecretaire(page);
    await page.goto('/report/daily');
    await page.getByTestId('e2e-daily-report-tab-remittance').click();
    await expect(page.getByTestId('e2e-cash-period-remittance-tab')).toBeVisible();
    await expect(page.getByTestId('e2e-remittance-net-kpi')).toBeVisible();
    await expect(page.getByTestId('e2e-remittance-expenses-kpi')).toBeVisible();

    const expenses = page.getByTestId('e2e-remittance-expense-item');
    const expenseCount = await expenses.count();
    if (expenseCount > 0 && summary.status !== 'RECEIVED') {
      const netBefore = await page.getByTestId('e2e-remittance-net-kpi').locator('.kpi-value').innerText();
      await expenses.first().click();
      const netAfter = await page.getByTestId('e2e-remittance-net-kpi').locator('.kpi-value').innerText();
      expect(netAfter).not.toEqual(netBefore);
    }

    if (summary.status === 'RECEIVED') {
      if (expenseCount > 0) {
        await expect(expenses.first().locator('input[type="checkbox"]')).toBeDisabled();
      }
      await expect(page.getByTestId('e2e-remittance-submit')).toHaveCount(0);
    }

    const expenseSum = (summary.candidateExpenses ?? []).reduce((sum, expense) => sum + expense.amount, 0);
    if (summary.status !== 'RECEIVED' && expenseSum > (summary.totalAmount ?? 0)) {
      const refused = await api.requestStatus('/api/cash-period-remittances/submit', {
        method: 'POST',
        body: JSON.stringify({
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          expenseIds: (summary.candidateExpenses ?? []).map((expense) => expense.id),
        }),
      });
      expect(refused.status, refused.text).not.toBe(200);
    }
  });
});
