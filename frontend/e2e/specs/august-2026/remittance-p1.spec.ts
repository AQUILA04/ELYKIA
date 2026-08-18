import { expect, Page, test } from '@playwright/test';
import { ApiClient } from '../../fixtures/api-client';
import { loginAsGestionnaire } from '../../fixtures/auth';

const MONTH_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function parseKpiAmount(text: string): number {
  const digits = text.replace(/[^\d-]/g, '');
  return digits ? Number(digits) : 0;
}

function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function monthEnd(year: number, month: number): string {
  const last = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

async function openRemittanceTab(page: Page): Promise<void> {
  await page.goto('/report/daily');
  await page.getByTestId('e2e-daily-report-tab-remittance').click();
  await expect(page.getByTestId('e2e-cash-period-remittance-tab')).toBeVisible();
}

async function selectRemittancePeriod(page: Page, year: number, month: number): Promise<void> {
  await page.getByTestId('e2e-remittance-year').fill(String(year));
  await page.getByTestId('e2e-remittance-month').selectOption({ label: MONTH_LABELS[month - 1]! });
  const summaryWait = page.waitForResponse((response) =>
    response.url().includes('/api/cash-period-remittances/summary') && response.ok(),
  );
  await page.getByTestId('e2e-remittance-refresh').click();
  await summaryWait;
  await expect(page.getByTestId('e2e-remittance-net-kpi')).toBeVisible();
}

test.describe('Remise P1 @p1 @web @august-2026 @regression', () => {
  test('W-P1-15 gestionnaire retire une dépense PENDING → net recalculé', async ({ page }) => {
    const secretary = new ApiClient();
    await secretary.signInAsSecretaire();
    const managerApi = new ApiClient();
    await managerApi.signInAsGestionnaire();

    const now = new Date();
    let pendingYear: number | null = null;
    let pendingMonth: number | null = null;
    let linked: Array<{ id: number; amount: number }> = [];

    for (let offset = 0; offset < 24; offset++) {
      const cursor = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const year = cursor.getFullYear();
      const month = cursor.getMonth() + 1;
      const summary = await managerApi.getRemittanceSummary(year, month);
      if (summary.status === 'PENDING') {
        pendingYear = year;
        pendingMonth = month;
        linked = summary.linkedExpenses ?? [];
        break;
      }
    }

    if (!pendingYear || !pendingMonth || linked.length === 0) {
      let submitYear: number | null = null;
      let submitMonth: number | null = null;
      let expenseIds: number[] = [];
      for (let offset = 0; offset < 24; offset++) {
        const cursor = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        const year = cursor.getFullYear();
        const month = cursor.getMonth() + 1;
        const summary = await secretary.getRemittanceSummary(year, month);
        if (summary.status || !summary.canSubmit) {
          continue;
        }
        const total = summary.totalAmount ?? 0;
        const candidates = summary.candidateExpenses ?? [];
        const picked: number[] = [];
        let expenseSum = 0;
        for (const expense of candidates) {
          if (!expense.id || expense.amount <= 0) {
            continue;
          }
          if (expenseSum + expense.amount > total) {
            continue;
          }
          picked.push(expense.id);
          expenseSum += expense.amount;
        }
        if (picked.length === 0) {
          continue;
        }
        submitYear = year;
        submitMonth = month;
        expenseIds = picked;
        break;
      }

      test.skip(
        !submitYear || !submitMonth || expenseIds.length === 0,
        'Aucune remise PENDING ni période soumissible avec dépenses',
      );
      if (!submitYear || !submitMonth || expenseIds.length === 0) {
        return;
      }

      await secretary.submitRemittance(submitYear, submitMonth, expenseIds);
      const created = await managerApi.getRemittanceSummary(submitYear, submitMonth);
      expect(created.status).toBe('PENDING');
      expect(created.canAcknowledge).toBe(true);
      linked = created.linkedExpenses ?? [];
      pendingYear = submitYear;
      pendingMonth = submitMonth;
    }

    expect(linked.length, 'dépenses liées à la PENDING').toBeGreaterThan(0);

    await loginAsGestionnaire(page);
    await openRemittanceTab(page);
    await selectRemittancePeriod(page, pendingYear, pendingMonth);

    await expect(page.getByTestId('e2e-remittance-acknowledge')).toBeVisible();
    const items = page.getByTestId('e2e-remittance-expense-item');
    await expect(items.first()).toBeVisible();
    await expect(items.first().locator('input[type="checkbox"]')).toBeEnabled();

    const first = items.first();
    const expenseAmount = Number(await first.getAttribute('data-amount'));
    expect(expenseAmount).toBeGreaterThan(0);

    const netBefore = parseKpiAmount(
      await page.getByTestId('e2e-remittance-net-kpi').locator('.kpi-value').innerText(),
    );
    const expensesBefore = parseKpiAmount(
      await page.getByTestId('e2e-remittance-expenses-kpi').locator('.kpi-value').innerText(),
    );

    await first.click();

    const netAfter = parseKpiAmount(
      await page.getByTestId('e2e-remittance-net-kpi').locator('.kpi-value').innerText(),
    );
    const expensesAfter = parseKpiAmount(
      await page.getByTestId('e2e-remittance-expenses-kpi').locator('.kpi-value').innerText(),
    );

    expect(expensesAfter).toBe(expensesBefore - expenseAmount);
    expect(netAfter).toBe(netBefore + expenseAmount);

    await first.click();
    const netRestored = parseKpiAmount(
      await page.getByTestId('e2e-remittance-net-kpi').locator('.kpi-value').innerText(),
    );
    expect(netRestored).toBe(netBefore);
  });

  test('W-P1-16 plusieurs remises par période ; seuls versements non remis proposés', async ({ page }) => {
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const remittances = await api.listRemittances(50);
    expect(remittances.length, 'historique remises').toBeGreaterThan(0);

    const byPeriod = new Map<string, typeof remittances>();
    for (const remittance of remittances) {
      const key = periodKey(remittance.year, remittance.month);
      const group = byPeriod.get(key) ?? [];
      group.push(remittance);
      byPeriod.set(key, group);
    }

    const multi = [...byPeriod.entries()].find(([, group]) => group.length >= 2);
    expect(multi, 'au moins une période avec 2 remises').toBeTruthy();
    const [period, group] = multi!;
    const [year, month] = period.split('-').map(Number) as [number, number];

    const depositIds = group.flatMap((item) => (item.deposits ?? []).map((deposit) => deposit.id));
    expect(depositIds.length, 'versements rattachés').toBeGreaterThan(0);
    expect(new Set(depositIds).size, 'aucun versement dans deux remises').toBe(depositIds.length);

    const summary = await api.getRemittanceSummary(year, month);
    const remittedTotal = group.reduce((sum, item) => sum + (item.totalAmount ?? 0), 0);
    expect(summary.alreadyRemittedAmount ?? 0).toBe(remittedTotal);

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const deposits = await api.listCashDeposits(startDate, monthEnd(year, month));
    const remittedIdSet = new Set(depositIds);
    const unremitted = deposits.filter((deposit) => (deposit.amount ?? 0) > 0 && !remittedIdSet.has(deposit.id));
    const unremittedSum = unremitted.reduce((sum, deposit) => sum + (deposit.amount ?? 0), 0);

    if (summary.status !== 'PENDING') {
      expect(summary.totalAmount ?? 0).toBe(unremittedSum);
    }

    await loginAsGestionnaire(page);
    await openRemittanceTab(page);
    await selectRemittancePeriod(page, year, month);

    if ((summary.alreadyRemittedAmount ?? 0) > 0) {
      await expect(page.getByTestId('e2e-remittance-already-remitted')).toBeVisible();
    }

    const rows = page.locator(
      `[data-testid="e2e-remittance-history-row"][data-year="${year}"][data-month="${month}"]`,
    );
    await expect(rows).toHaveCount(group.length);
  });

  test('W-P1-18 plage Du/Au visible et envoyée au résumé', async ({ page }) => {
    await loginAsGestionnaire(page);
    await openRemittanceTab(page);
    await expect(page.getByTestId('e2e-remittance-start-date')).toBeVisible();
    await expect(page.getByTestId('e2e-remittance-end-date')).toBeVisible();

    const summaryWait = page.waitForResponse((response) =>
      response.url().includes('/api/cash-period-remittances/summary')
      && response.url().includes('startDate=')
      && response.url().includes('endDate=')
      && response.ok(),
    );
    await page.getByTestId('e2e-remittance-refresh').click();
    const response = await summaryWait;
    expect(response.url()).toContain('startDate=');
    expect(response.url()).toContain('endDate=');
  });
});
