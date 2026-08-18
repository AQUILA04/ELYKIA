import { expect, Page, test } from '@playwright/test';
import { ApiClient } from '../../fixtures/api-client';
import { loginAsGestionnaire } from '../../fixtures/auth';
import { assertPdfMagic, extractPdfText } from '../../fixtures/pdf-helpers';
import { TEST_COMMERCIAL_USERNAME } from '../../fixtures/test-data';
import { selectNgSelectOption } from '../../fixtures/ui-helpers';

const NAVY_MARK = 'AMENOUVEVE-YAVEH';

function expectHealthyPdf(status: number, body: Buffer, contentType: string, label: string): string {
  expect(status, `${label} HTTP ${status}`).toBe(200);
  assertPdfMagic(body, label);
  expect(contentType, `${label} content-type=${contentType}`).toMatch(/pdf|octet-stream/i);
  const asText = body.toString('latin1');
  expect(asText, `${label} must not be a Thymeleaf/Spring error page`).not.toMatch(
    /Whitelabel|TemplateInputException|Exception evaluating|500 Internal/i,
  );
  return extractPdfText(body);
}

async function openRemainingClientsDialog(page: Page): Promise<void> {
  await loginAsGestionnaire(page);
  await page.goto('/report/daily');
  await expect(page.getByTestId('e2e-daily-report')).toBeVisible();
  await page.getByTestId('e2e-daily-report-tab-overview').click();
  await selectNgSelectOption(page, 'e2e-daily-report-agent-select', TEST_COMMERCIAL_USERNAME);
  await expect(page.getByTestId('e2e-yearly-kpi-remaining-client')).toBeVisible();
  await page.getByTestId('e2e-yearly-kpi-remaining-client').click();
  await expect(page.getByTestId('e2e-remaining-clients-dialog')).toBeVisible();
}

async function waitForStockDashboardSettled(page: Page): Promise<'panels' | 'empty'> {
  await page.locator('.ngx-spinner-overlay').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
  await expect.poll(async () => {
    if (await page.getByTestId('e2e-my-stock-panel').count() > 0) {
      return 'panels';
    }
    if (await page.getByText('Aucune donnée de stock trouvée').isVisible().catch(() => false)) {
      return 'empty';
    }
    return 'pending';
  }, { timeout: 20_000 }).not.toBe('pending');
  return (await page.getByTestId('e2e-my-stock-panel').count()) > 0 ? 'panels' : 'empty';
}

interface MonthlyStockRow {
  collector: string;
  year: number;
  month: number;
}

interface StockListPage {
  content?: MonthlyStockRow[];
}

async function findMonthlyStock(
  api: ApiClient,
): Promise<{ row: MonthlyStockRow; historic: boolean } | null> {
  const tries: Array<{ path: string; historic: boolean }> = [
    {
      path: `/api/commercial-stocks?collector=${TEST_COMMERCIAL_USERNAME}&page=0&size=20`,
      historic: false,
    },
    {
      path: `/api/commercial-stocks?collector=${TEST_COMMERCIAL_USERNAME}&page=0&size=20&historic=true`,
      historic: true,
    },
    { path: `/api/commercial-stocks?page=0&size=20`, historic: false },
    { path: `/api/commercial-stocks?page=0&size=20&historic=true`, historic: true },
  ];
  for (const attempt of tries) {
    const list = await api.get<StockListPage>(attempt.path);
    const row = list.content?.[0];
    if (row?.collector && row.year && row.month) {
      return { row, historic: attempt.historic };
    }
  }
  return null;
}

async function waitForStockList(page: Page, historic: boolean): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (!url.includes('/api/commercial-stocks') || url.includes('export') || response.request().method() !== 'GET') {
        return false;
      }
      if (!response.ok()) {
        return false;
      }
      return historic ? url.includes('historic=true') : !url.includes('historic=true');
    },
    { timeout: 20_000 },
  );
}

test.describe('Exports PDF août @p1 @web @august-2026 @regression', () => {
  test('W-P1-05 PDF reste clients : 200 + %PDF, pas d’erreur Thymeleaf', async ({ page }) => {
    const year = new Date().getFullYear();
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const pdf = await api.getBinary(
      `/api/daily-commercial-reports/yearly-remaining-credits/export/pdf?year=${year}&collector=${TEST_COMMERCIAL_USERNAME}`,
    );
    const text = expectHealthyPdf(pdf.status, pdf.body, pdf.contentType, 'reste-clients');
    expect(text).toMatch(/Reste chez les clients|Reste chez le client|AMENOUVEVE/i);

    await openRemainingClientsDialog(page);
    const downloadBtn = page.getByTestId('e2e-remaining-clients-download-pdf');
    if (await downloadBtn.isVisible().catch(() => false)) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 20_000 }),
        downloadBtn.click(),
      ]);
      const fs = await import('fs');
      const downloaded = fs.readFileSync((await download.path())!);
      assertPdfMagic(downloaded, 'reste-clients-ui');
    }
  });

  test('W-P1-06 PDF stock mensuel : collector/année/mois, qté panneau = PDF', async ({ page }) => {
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const found = await findMonthlyStock(api);
    test.skip(!found, 'Aucun stock mensuel en base locale pour W-P1-06');
    if (!found) {
      return;
    }

    await loginAsGestionnaire(page);
    await page.goto('/stock/my-stock');
    await expect(page.getByTestId('e2e-my-stock-dashboard')).toBeVisible();

    const stocksWait = waitForStockList(page, false);
    await selectNgSelectOption(page, 'e2e-my-stock-agent-select', found.row.collector);
    await stocksWait;
    if (found.historic) {
      const historicWait = waitForStockList(page, true);
      await page.getByTestId('e2e-my-stock-historic').click();
      await historicWait;
    }
    const state = await waitForStockDashboardSettled(page);
    expect(state, `stock ${found.row.collector} ${found.row.month}/${found.row.year}`).toBe('panels');

    const exportBtn = page.getByTestId(
      `e2e-my-stock-export-pdf-${found.row.collector}-${found.row.year}-${found.row.month}`,
    );
    const panel = page.locator('[data-testid="e2e-my-stock-panel"]', { has: exportBtn });
    await expect(panel).toBeVisible();
    const header = panel.locator('mat-expansion-panel-header');
    if ((await header.getAttribute('aria-expanded')) !== 'true') {
      await header.click();
    }
    await expect(header).toHaveAttribute('aria-expanded', 'true');
    await expect(exportBtn).toBeVisible();

    const row = panel.getByTestId('e2e-my-stock-item-row').first();
    await expect(row).toBeVisible();
    const articleName = ((await row.getByTestId('e2e-my-stock-item-name').innerText()) ?? '').trim();
    const remaining = ((await row.getByTestId('e2e-my-stock-item-remaining').innerText()) ?? '').trim();
    expect(articleName.length).toBeGreaterThan(1);

    const pdf = await api.getBinary(
      `/api/commercial-stocks/export/pdf?collector=${encodeURIComponent(found.row.collector)}&year=${found.row.year}&month=${found.row.month}`,
    );
    const text = expectHealthyPdf(pdf.status, pdf.body, pdf.contentType, 'stock-mensuel');
    expect(text).toContain(found.row.collector);
    const nameToken = articleName.split(/\s+/).find((token) => token.length >= 4) ?? articleName;
    expect(text, `PDF should contain article «${nameToken}»`).toContain(nameToken);
    expect(text.replace(/\s+/g, ' ')).toContain(remaining);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20_000 }),
      exportBtn.click(),
    ]);
    expect(await download.path()).toBeTruthy();
  });

  test('W-P1-07 PDF fiche client : bouton si commercial, blob navy', async ({ page }) => {
    await loginAsGestionnaire(page);
    await page.goto('/client/list');
    await expect(page.getByTestId('e2e-client-list')).toBeVisible();
    await expect(page.getByTestId('e2e-client-export-pdf')).toHaveCount(0);

    await selectNgSelectOption(page, 'e2e-commercial-selector', TEST_COMMERCIAL_USERNAME);
    const exportBtn = page.getByTestId('e2e-client-export-pdf');
    await expect(exportBtn).toBeVisible();

    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const pdf = await api.getBinary(
      `/api/v1/clients/by-commercial/${encodeURIComponent(TEST_COMMERCIAL_USERNAME)}/export/pdf`,
    );
    const text = expectHealthyPdf(pdf.status, pdf.body, pdf.contentType, 'fiche-client');
    expect(text).toContain(NAVY_MARK);
    expect(text).toMatch(/Fiche Client/i);
    expect(text).toMatch(/TOKOIN H[ÔO]PITAL/i);
    expect(text).toMatch(/\b1\/\d+\b/);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20_000 }),
      exportBtn.click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/fiche_client/i);
    const fs = await import('fs');
    const downloaded = fs.readFileSync((await download.path())!);
    assertPdfMagic(downloaded, 'fiche-client-ui');
  });
});
