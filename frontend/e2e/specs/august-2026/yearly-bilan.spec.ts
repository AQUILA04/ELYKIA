import { expect, Page, test } from '@playwright/test';
import { ApiClient } from '../../fixtures/api-client';
import { loginAsGestionnaire } from '../../fixtures/auth';
import { TEST_COMMERCIAL_USERNAME } from '../../fixtures/test-data';
import { selectNgSelectOption } from '../../fixtures/ui-helpers';

interface YearlySummary {
  year: number;
  commercialUsername: string;
  openingStockAmount: number;
  totalCreditSalesAmount: number;
  creditsReceivedAmount: number;
  creditsCededAmount: number;
  entrustedPortfolioAmount: number;
  totalCreditDepositedAmount: number;
  remainingAtCommercialAmount: number;
  remainingAtClientAmount: number;
}

interface RemainingCreditsPage {
  content?: { content?: unknown[]; last?: boolean };
  salesCount: number;
  totalRemainingAmount: number;
}

function parseFcfa(text: string): number {
  const digits = text.replace(/[^\d-]/g, '');
  return digits ? Number(digits) : 0;
}

async function kpiAmount(page: Page, testId: string): Promise<number> {
  const text = await page.getByTestId(testId).locator('.yearly-kpi-value').innerText();
  return parseFcfa(text);
}

function roundFcfa(value: number): number {
  return Math.round(value);
}

async function openYearlyBilan(page: Page): Promise<void> {
  await loginAsGestionnaire(page);
  await page.goto('/report/daily');
  await expect(page.getByTestId('e2e-daily-report')).toBeVisible();
  await page.getByTestId('e2e-daily-report-tab-overview').click();
  await selectNgSelectOption(page, 'e2e-daily-report-agent-select', TEST_COMMERCIAL_USERNAME);
  await expect(page.getByTestId('e2e-yearly-credit-bilan')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('e2e-yearly-kpi-opening-stock')).toBeVisible();
}

async function fetchYearlySummary(api: ApiClient, year: number): Promise<YearlySummary> {
  return api.get<YearlySummary>(
    `/api/daily-commercial-reports/yearly-summary?year=${year}&collector=${TEST_COMMERCIAL_USERNAME}`,
  );
}

async function fetchRemainingCredits(api: ApiClient, year: number, page = 0, size = 25): Promise<RemainingCreditsPage> {
  return api.get<RemainingCreditsPage>(
    `/api/daily-commercial-reports/yearly-remaining-credits?year=${year}&collector=${TEST_COMMERCIAL_USERNAME}&page=${page}&size=${size}`,
  );
}

test.describe('Bilan crédit annuel @p1 @web @august-2026 @regression', () => {
  test('W-P1-01 deux rangées KPI stock puis portefeuille', async ({ page }) => {
    await openYearlyBilan(page);

    const bilan = page.getByTestId('e2e-yearly-credit-bilan');
    await expect(bilan.getByText(`BILAN CRÉDIT ${new Date().getFullYear()}`)).toBeVisible();

    const stockRow = page.getByTestId('e2e-yearly-credit-row-stock');
    await expect(stockRow.getByTestId('e2e-yearly-kpi-opening-stock')).toContainText('Stock ouverture');
    await expect(stockRow.getByTestId('e2e-yearly-kpi-credit-sales')).toContainText('Ventes crédit');
    await expect(stockRow.getByTestId('e2e-yearly-kpi-credits-received')).toContainText('Créances reçues');
    await expect(stockRow.getByTestId('e2e-yearly-kpi-credits-ceded')).toContainText('Créances cédées');

    const portfolioRow = page.getByTestId('e2e-yearly-credit-row-portfolio');
    await expect(portfolioRow.getByTestId('e2e-yearly-kpi-portfolio')).toContainText('Portefeuille confié');
    await expect(portfolioRow.getByTestId('e2e-yearly-kpi-deposits')).toContainText('Versements crédit');
    await expect(portfolioRow.getByTestId('e2e-yearly-kpi-remaining-commercial')).toContainText('Reste chez le commercial');
    await expect(portfolioRow.getByTestId('e2e-yearly-kpi-remaining-client')).toContainText('Reste chez le client');
  });

  test('W-P1-02 reste commercial = portefeuille − versements (API = UI)', async ({ page }) => {
    const year = new Date().getFullYear();
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const summary = await fetchYearlySummary(api, year);

    const expectedRemaining = roundFcfa(summary.entrustedPortfolioAmount - summary.totalCreditDepositedAmount);
    expect(
      roundFcfa(summary.remainingAtCommercialAmount),
      'API remainingAtCommercialAmount must equal entrustedPortfolio − deposits',
    ).toBe(expectedRemaining);

    await openYearlyBilan(page);

    const uiPortfolio = await kpiAmount(page, 'e2e-yearly-kpi-portfolio');
    const uiDeposits = await kpiAmount(page, 'e2e-yearly-kpi-deposits');
    const uiRemaining = await kpiAmount(page, 'e2e-yearly-kpi-remaining-commercial');

    expect(uiPortfolio).toBe(roundFcfa(summary.entrustedPortfolioAmount));
    expect(uiDeposits).toBe(roundFcfa(summary.totalCreditDepositedAmount));
    expect(uiRemaining).toBe(roundFcfa(summary.remainingAtCommercialAmount));
    expect(uiRemaining).toBe(roundFcfa(uiPortfolio - uiDeposits));
  });

  test('W-P1-03 reste client = somme live, pas filtrée par beginDate année', async ({ page }) => {
    const year = new Date().getFullYear();
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const summary = await fetchYearlySummary(api, year);
    const remaining = await fetchRemainingCredits(api, year);
    const remainingOtherYear = await fetchRemainingCredits(api, year === 2025 ? 2026 : 2025);

    expect(roundFcfa(remaining.totalRemainingAmount)).toBe(roundFcfa(summary.remainingAtClientAmount));
    expect(
      roundFcfa(remainingOtherYear.totalRemainingAmount),
      'live remaining must not change when the year query param changes',
    ).toBe(roundFcfa(remaining.totalRemainingAmount));
    expect(remainingOtherYear.salesCount).toBe(remaining.salesCount);

    await openYearlyBilan(page);
    const uiClient = await kpiAmount(page, 'e2e-yearly-kpi-remaining-client');
    expect(uiClient).toBe(roundFcfa(summary.remainingAtClientAmount));
  });

  test('W-P1-04 modal reste clients : totaux distincts, infinite scroll, lien fiche', async ({ page }) => {
    const year = new Date().getFullYear();
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const summary = await fetchYearlySummary(api, year);
    const remaining = await fetchRemainingCredits(api, year);

    await openYearlyBilan(page);
    await page.getByTestId('e2e-yearly-kpi-remaining-client').click();

    const dialog = page.getByTestId('e2e-remaining-clients-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('toutes années');
    await expect(dialog.getByTestId('e2e-remaining-clients-kpi-commercial')).toContainText('Reste commercial');
    await expect(dialog.getByTestId('e2e-remaining-clients-kpi-client')).toContainText('Reste client (live)');

    const commercialKpi = parseFcfa(
      await dialog.getByTestId('e2e-remaining-clients-kpi-commercial').locator('.kpi-value').innerText(),
    );
    const clientKpi = parseFcfa(
      await dialog.getByTestId('e2e-remaining-clients-kpi-client').locator('.kpi-value').innerText(),
    );
    expect(commercialKpi).toBe(roundFcfa(summary.remainingAtCommercialAmount));
    expect(clientKpi).toBe(roundFcfa(remaining.totalRemainingAmount));

    const firstRef = dialog.getByTestId('e2e-remaining-clients-ref-link').first();
    if (remaining.salesCount > 0) {
      await expect(firstRef).toBeVisible();
    }

    if (remaining.salesCount > 25) {
      const table = dialog.getByTestId('e2e-remaining-clients-table');
      const before = await table.locator('tbody tr').count();
      expect(before).toBeLessThanOrEqual(25);
      await table.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await expect.poll(async () => table.locator('tbody tr').count(), { timeout: 15_000 }).toBeGreaterThan(before);
    }

    if (remaining.salesCount > 0) {
      await firstRef.click();
      await expect(page).toHaveURL(/\/credit\/details\/\d+/, { timeout: 15_000 });
    }
  });

  test('W-P1-13 bilan tontine : collectes, versements, reste = collectes − versements', async ({ page }) => {
    const year = new Date().getFullYear();
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const summary = await api.get<{
      totalTontineCollectionsAmount: number;
      totalTontineDepositedAmount: number;
      remainingAtCommercialAmount: number;
    }>(
      `/api/daily-commercial-reports/yearly-tontine-summary?year=${year}&collector=${TEST_COMMERCIAL_USERNAME}`,
    );

    const expectedRemaining = roundFcfa(
      summary.totalTontineCollectionsAmount - summary.totalTontineDepositedAmount,
    );
    expect(roundFcfa(summary.remainingAtCommercialAmount)).toBe(expectedRemaining);

    await openYearlyBilan(page);
    const bilan = page.getByTestId('e2e-yearly-tontine-bilan');
    await expect(bilan).toBeVisible();
    await expect(bilan.getByText(`BILAN TONTINE ${year}`)).toBeVisible();
    await expect(page.getByTestId('e2e-yearly-tontine-kpi-collections')).toContainText('Collectes tontine');
    await expect(page.getByTestId('e2e-yearly-tontine-kpi-deposits')).toContainText('Versements tontine');
    await expect(page.getByTestId('e2e-yearly-tontine-kpi-remaining')).toContainText('Reste chez le commercial');

    const uiCollections = await kpiAmount(page, 'e2e-yearly-tontine-kpi-collections');
    const uiDeposits = await kpiAmount(page, 'e2e-yearly-tontine-kpi-deposits');
    const uiRemaining = await kpiAmount(page, 'e2e-yearly-tontine-kpi-remaining');
    expect(uiCollections).toBe(roundFcfa(summary.totalTontineCollectionsAmount));
    expect(uiDeposits).toBe(roundFcfa(summary.totalTontineDepositedAmount));
    expect(uiRemaining).toBe(roundFcfa(summary.remainingAtCommercialAmount));
    expect(uiRemaining).toBe(roundFcfa(uiCollections - uiDeposits));
  });
});
