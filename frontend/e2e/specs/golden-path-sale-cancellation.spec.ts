import { expect, Page, test } from '@playwright/test';
import { ApiClient, CreditSummary, TestArticle } from '../fixtures/api-client';
import { loginAsAdmin, loginAsGestionnaire, loginAsMagasinier } from '../fixtures/auth';
import {
  expectCreditForClient,
  fillCreditSaleForm,
  submitCreditForm,
} from '../fixtures/credit-helpers';
import { activateClientAccount } from '../fixtures/account-helpers';
import {
  expectStockRequestDelivered,
  expectStockRequestValidated,
} from '../fixtures/stock-request-helpers';
import {
  chooseCurrentMonthIfPrompted,
  confirmSwal,
  dismissSwalSuccess,
  findStockRequestRow,
  selectArticleInSelector,
  selectNgSelectOption,
} from '../fixtures/ui-helpers';
import {
  E2E_CREDIT_SALE_QTY,
  TEST_COMMERCIAL_USERNAME,
  todayIsoDate,
  uniqueE2eLabel,
  uniqueE2ePhone,
} from '../fixtures/test-data';

const SALE_QTY = E2E_CREDIT_SALE_QTY;
const STOCK_NEEDED = SALE_QTY * 2;

/**
 * Golden path isolé — Given / When / Then.
 *
 * Given : deux ventes crédit COM020 (deux clients, sans recouvrement).
 * When  : simulation UI admin + exécution API bornée aux deux IDs.
 * Then  : crédits CANCELLED, stock et rapport journalier restaurés, run COMPLETED + PDFs.
 */
test.describe.serial('Golden path — annulation de deux ventes COM020', () => {
  let localityName: string;
  let clientALastName: string;
  let clientBLastName: string;
  let testArticle: TestArticle;
  let stockRequestReference: string | null = null;
  let saleA: CreditSummary;
  let saleB: CreditSummary;
  let stockSoldBeforeSales: number;
  let stockRemainingBeforeSales: number;
  let reportCountBeforeSales: number;
  let reportAmountBeforeSales: number;
  let cancellationRunId: number;

  test.beforeAll(async () => {
    localityName = uniqueE2eLabel('LOC_CANCEL');
    clientALastName = uniqueE2eLabel('CANCEL_A');
    clientBLastName = uniqueE2eLabel('CANCEL_B');

    const api = new ApiClient();
    await api.signInAsGestionnaire();
    await api.ensureAccountingDayOpen();
    testArticle = await api.ensureArticleWithStock(20);
  });

  test('given — localité et deux clients COM020', async ({ page }) => {
    test.setTimeout(180_000);
    await loginAsGestionnaire(page);
    await createLocality(page, localityName);
    await createAndActivateClient(page, localityName, clientALastName, uniqueE2ePhone());
    await createAndActivateClient(page, localityName, clientBLastName, uniqueE2ePhone());
  });

  test('given — stock commercial COM020 suffisant (2 unités)', async ({ page }) => {
    test.setTimeout(180_000);
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const current = await api.getMonthlyStockItem(TEST_COMMERCIAL_USERNAME, testArticle.id);
    if ((current?.quantityRemaining ?? 0) >= STOCK_NEEDED) {
      return;
    }

    await loginAsGestionnaire(page);
    await page.getByTestId('e2e-sidebar-stock-commercial').click();
    await page.getByTestId('e2e-sidebar-stock-request').click();
    await page.getByTestId('e2e-stock-request-new-btn').click();
    await expect(page.getByTestId('e2e-stock-request-form')).toBeVisible();
    await page.locator('ngx-spinner').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
    await chooseCurrentMonthIfPrompted(page);
    await selectNgSelectOption(page, 'e2e-stock-request-collector', TEST_COMMERCIAL_USERNAME);
    await selectArticleInSelector(page, 0, testArticle.label, STOCK_NEEDED, testArticle.id);
    await page.getByTestId('e2e-stock-request-submit').click();
    await expect(page).toHaveURL(/\/stock\/request/, { timeout: 30_000 });

    const createdRow = page
      .locator('[data-testid="e2e-stock-request-row"][data-status="CREATED"]')
      .filter({ hasText: TEST_COMMERCIAL_USERNAME })
      .first();
    await expect(createdRow).toBeVisible({ timeout: 15_000 });
    stockRequestReference = (await createdRow.getAttribute('data-reference')) ?? '';
    expect(stockRequestReference.length).toBeGreaterThan(0);

    await createdRow.getByTestId('e2e-stock-request-validate').click();
    await confirmSwal(page);
    await expectStockRequestValidated(stockRequestReference);

    await loginAsMagasinier(page);
    const validatedRow = await findStockRequestRow(page, stockRequestReference);
    await validatedRow.getByTestId('e2e-stock-request-deliver').click();
    await confirmSwal(page);
    await expectStockRequestDelivered(stockRequestReference);
  });

  test('given — créer deux ventes crédit COM020 sans recouvrement', async ({ page }) => {
    test.setTimeout(180_000);
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    await api.ensureCommercialStockRemaining(
      TEST_COMMERCIAL_USERNAME,
      testArticle.id,
      STOCK_NEEDED,
    );

    const stockBefore = await api.getMonthlyStockItem(TEST_COMMERCIAL_USERNAME, testArticle.id);
    stockSoldBeforeSales = stockBefore?.quantitySold ?? 0;
    stockRemainingBeforeSales = stockBefore?.quantityRemaining ?? 0;

    const reportsBefore = await api.getDailyReports(
      todayIsoDate(),
      todayIsoDate(),
      TEST_COMMERCIAL_USERNAME,
    );
    const reportBefore = reportsBefore[0];
    reportCountBeforeSales = reportBefore?.creditSalesCount ?? 0;
    reportAmountBeforeSales = reportBefore?.creditSalesAmount ?? 0;

    await loginAsGestionnaire(page);
    saleA = await createCreditSale(page, clientALastName, testArticle);
    saleB = await createCreditSale(page, clientBLastName, testArticle);

    expect(saleA.id).not.toBe(saleB.id);
    expect(saleA.status).toBe('INPROGRESS');
    expect(saleB.status).toBe('INPROGRESS');

    const stockAfterSales = await api.getMonthlyStockItem(TEST_COMMERCIAL_USERNAME, testArticle.id);
    expect(stockAfterSales?.quantitySold ?? 0).toBe(stockSoldBeforeSales + STOCK_NEEDED);
    expect(stockAfterSales?.quantityRemaining ?? 0).toBe(stockRemainingBeforeSales - STOCK_NEEDED);

    const reportsAfterSales = await api.getDailyReports(
      todayIsoDate(),
      todayIsoDate(),
      TEST_COMMERCIAL_USERNAME,
    );
    const reportAfterSales = reportsAfterSales[0];
    expect(reportAfterSales?.creditSalesCount ?? 0).toBe(reportCountBeforeSales + 2);
    expect(Math.round(reportAfterSales?.creditSalesAmount ?? 0)).toBe(
      Math.round(reportAmountBeforeSales + (saleA.totalAmount ?? 0) + (saleB.totalAmount ?? 0)),
    );
  });

  test('when — ADMIN simule puis annule uniquement les deux ventes', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsAdmin(page);
    await page.goto('/credit/annulation');
    await expect(page.getByTestId('e2e-sale-cancellation-page')).toBeVisible();
    await page.getByTestId('e2e-sale-cancellation-new-btn').click();

    const commercialSelect = page.getByTestId('e2e-sale-cancellation-commercial');
    await expect(commercialSelect.locator('option').nth(1)).toBeAttached({ timeout: 20_000 });
    await commercialSelect.selectOption({ value: TEST_COMMERCIAL_USERNAME }).catch(async () => {
      await commercialSelect.selectOption({ label: new RegExp(TEST_COMMERCIAL_USERNAME, 'i') });
    });
    await page.getByTestId('e2e-sale-cancellation-simulate').click();

    await expect(page.getByTestId('e2e-sale-cancellation-eligible-kpi')).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator(`[data-testid="e2e-sale-cancellation-eligible-row"][data-credit-reference="${saleA.reference}"]`),
    ).toBeVisible();
    await expect(
      page.locator(`[data-testid="e2e-sale-cancellation-eligible-row"][data-credit-reference="${saleB.reference}"]`),
    ).toBeVisible();

    const adminApi = new ApiClient();
    await adminApi.signInAsAdmin();
    const preview = await adminApi.previewSaleCancellation({
      commercialUsername: TEST_COMMERCIAL_USERNAME,
      startDate: todayIsoDate(),
      endDate: todayIsoDate(),
      creditStatus: 'INPROGRESS',
    });
    const previewIds = preview.eligibleSales.map((row) => row.creditId);
    expect(previewIds).toEqual(expect.arrayContaining([saleA.id, saleB.id]));
    expect(preview.eligibleSales.some((row) => row.reference === saleA.reference)).toBe(true);
    expect(preview.eligibleSales.some((row) => row.reference === saleB.reference)).toBe(true);

    const run = await adminApi.executeSaleCancellation({
      commercialUsername: TEST_COMMERCIAL_USERNAME,
      startDate: todayIsoDate(),
      endDate: todayIsoDate(),
      creditStatus: 'INPROGRESS',
      cancellationReason: 'E2E golden-path — annulation de deux ventes de test COM020',
      eligibleCreditIds: [saleA.id, saleB.id],
    });
    expect(run.status).toBe('COMPLETED');
    expect(run.cancelledSalesCount).toBe(2);
    expect(run.pdfFileCount).toBe(3);
    expect(run.errorMessage ?? '').toBe('');
    cancellationRunId = run.id;
  });

  test('then — crédits, stock, rapport journalier et pièces d’audit', async ({ page }) => {
    test.setTimeout(90_000);
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const adminApi = new ApiClient();
    await adminApi.signInAsAdmin();

    await expect.poll(async () => {
      const credit = await api.getCreditById(saleA.id);
      return String(credit.status);
    }).toBe('CANCELLED');
    await expect.poll(async () => {
      const credit = await api.getCreditById(saleB.id);
      return String(credit.status);
    }).toBe('CANCELLED');

    const stockAfter = await api.getMonthlyStockItem(TEST_COMMERCIAL_USERNAME, testArticle.id);
    expect(stockAfter?.quantitySold ?? 0).toBe(stockSoldBeforeSales);
    expect(stockAfter?.quantityRemaining ?? 0).toBe(stockRemainingBeforeSales);

    const reportsAfter = await api.getDailyReports(
      todayIsoDate(),
      todayIsoDate(),
      TEST_COMMERCIAL_USERNAME,
    );
    const reportAfter = reportsAfter[0];
    expect(reportAfter?.creditSalesCount ?? 0).toBe(reportCountBeforeSales);
    expect(Math.round(reportAfter?.creditSalesAmount ?? 0)).toBe(Math.round(reportAmountBeforeSales));

    const details = await adminApi.getSaleCancellationRunDetails(cancellationRunId);
    expect(details.status).toBe('COMPLETED');
    expect(details.cancelledSalesCount).toBe(2);
    expect((details.files ?? []).length).toBeGreaterThanOrEqual(3);
    const auditFile = (details.files ?? []).find((file) => file.fileType === 'SALE_AUDIT_PDF');
    expect(auditFile).toBeTruthy();
    const download = await adminApi.getBinary(`/api/v1/sales/cancellation/files/${auditFile!.id}/download`);
    expect(download.status).toBe(200);
    expect(download.contentType).toContain('pdf');
    expect(download.body.length).toBeGreaterThan(100);

    await loginAsAdmin(page);
    await page.goto('/credit/annulation');
    await expect(
      page.locator(`[data-testid="e2e-sale-cancellation-run-row"][data-run-id="${cancellationRunId}"][data-status="COMPLETED"]`),
    ).toBeVisible({ timeout: 20_000 });
  });
});

async function createLocality(page: Page, name: string): Promise<void> {
  await page.getByTestId('e2e-sidebar-configuration').click();
  await page.getByTestId('e2e-sidebar-localities').click();
  await page.getByTestId('e2e-locality-add-btn').click();
  await page.getByTestId('e2e-locality-name').fill(name);
  await page.getByTestId('e2e-locality-submit').click();
  await expect(page).toHaveURL(/\/localitylist/, { timeout: 20_000 });
  await dismissSwalSuccess(page);
}

async function createAndActivateClient(
  page: Page,
  localityName: string,
  lastName: string,
  phone: string,
): Promise<void> {
  await page.getByTestId('e2e-sidebar-clients').click();
  await page.getByTestId('e2e-client-add-btn').click();
  await expect(page.getByTestId('e2e-client-form')).toBeVisible();
  await page.getByTestId('e2e-client-lastname').fill(lastName);
  await page.getByTestId('e2e-client-firstname').fill('Cancel');
  await page.getByTestId('e2e-client-address').fill('Adresse E2E annulation');
  await page.getByTestId('e2e-client-phone').fill(phone);
  await page.getByTestId('e2e-client-card-type').selectOption('ID Card');
  await page.getByTestId('e2e-client-card-id').fill(`E2E${Date.now().toString().slice(-8)}`);
  await page.getByTestId('e2e-client-birthdate').fill('1990-06-15');
  await page.getByTestId('e2e-client-occupation').fill('Commerçant');
  await selectNgSelectOption(page, 'e2e-client-quarter', localityName);
  await selectNgSelectOption(page, 'e2e-client-collector', TEST_COMMERCIAL_USERNAME);
  await selectNgSelectOption(page, 'e2e-client-tontine-collector', TEST_COMMERCIAL_USERNAME);
  await page.getByTestId('e2e-client-type').selectOption('CLIENT');
  await page.getByTestId('e2e-client-account-balance').fill('1000');
  await page.getByTestId('e2e-client-submit').click();
  await expect(page).toHaveURL(/\/client\/list/, { timeout: 30_000 });
  await dismissSwalSuccess(page);
  await activateClientAccount(page, lastName);
}

async function createCreditSale(
  page: Page,
  clientLastName: string,
  testArticle: TestArticle,
): Promise<CreditSummary> {
  await page.goto('/credit/add');
  await page.locator('ngx-spinner').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
  await fillCreditSaleForm(
    page,
    TEST_COMMERCIAL_USERNAME,
    clientLastName,
    testArticle.label,
    SALE_QTY,
    testArticle.id,
  );
  await submitCreditForm(page);
  return expectCreditForClient(clientLastName, { status: 'INPROGRESS' });
}
