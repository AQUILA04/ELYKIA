import { test, expect } from '@playwright/test';
import { loginAsGestionnaire, loginAsMagasinier, loginAsCommercial, logout } from '../fixtures/auth';
import { ApiClient, TestArticle } from '../fixtures/api-client';
import {
  expectStockRequestDelivered,
  expectStockRequestValidated,
} from '../fixtures/stock-request-helpers';
import {
  expectStockReturnReceived,
  findCreatedStockReturnId,
} from '../fixtures/stock-return-helpers';
import {
  expectStockTontineRequestDelivered,
  expectStockTontineRequestValidated,
  expectTontineStockAvailable,
} from '../fixtures/stock-tontine-helpers';
import {
  expectTontineCollectionSummary,
  expectTontineMemberDeliveryStatus,
  expectTontineMemberExists,
} from '../fixtures/tontine-helpers';
import {
  chooseCurrentMonthIfPrompted,
  confirmSwal,
  dismissSwalSuccess,
  findStockRequestRow,
  selectArticleInSelector,
  selectNgSelectOption,
  findCreditRow,
  fillBilletageAmount,
  selectCashSaleType,
  findStockReturnRow,
  findStockTontineRequestRow,
  selectMatSelectByText,
  expectKpiCountPositive,
  selectTontineDeliveryArticle,
} from '../fixtures/ui-helpers';
import {
  expectCreditForClient,
  expectRecouvrementForCredit,
  fillCreditSaleForm,
  getMonthlyStockItem,
  submitCreditForm,
} from '../fixtures/credit-helpers';
import { activateClientAccount } from '../fixtures/account-helpers';
import {
  expectRattrapageCreditForClient,
  expectResidualStockRemaining,
} from '../fixtures/rattrapage-helpers';
import {
  E2E_CASH_SALE_QTY,
  E2E_CREDIT_SALE_QTY,
  E2E_RATTRAPAGE_QTY,
  E2E_RATTRAPAGE_DAILY_STAKE,
  E2E_RESIDUAL_STOCK_QTY,
  E2E_STOCK_REQUEST_QTY,
  E2E_STOCK_RETURN_QTY,
  E2E_STOCK_TONTINE_REQUEST_QTY,
  E2E_TONTINE_COLLECTION_AMOUNT,
  E2E_TONTINE_MEMBER_AMOUNT,
  TEST_AGENCY_COMMERCIAL_USERNAME,
  TEST_COMMERCIAL_USERNAME,
  todayIsoDate,
  uniqueE2eLabel,
  uniqueE2ePhone,
} from '../fixtures/test-data';

/**
 * Parcours métier séquentiel — phases 1 à 3.
 *
 * Flux sortie stock (ordre obligatoire) :
 * 1. Demande créée (CREATED)
 * 2. Validation par le gestionnaire ges003 (VALIDATED)
 * 3. Livraison par le magasinier mag001 (DELIVERED)
 *
 * Phase 3 : vente crédit → mise (recouvrement) → rapport journalier → versement → stock mensuel.
 * Phase 4 : retour stock → vente comptant → contrôle totaux.
 * Phase 5 : tontine (membre, collecte, stock tontine, livraison) → KPIs.
 * Phase 6 : rattrapage crédit sur stock résiduel du mois précédent.
 *
 * Nécessite le backend sur E2E_API_URL (défaut http://localhost:8081).
 */
test.describe.serial('Golden path — prérequis métier', () => {
  let localityName: string;
  let clientLastName: string;
  let clientFirstName: string;
  let clientPhone: string;
  let testArticle: TestArticle;
  let stockRequestReference: string;
  let creditReference: string;
  let dailyStakeAmount: number;
  let stockSoldBefore: number;
  let stockRemainingBefore: number;
  let stockReturnedBefore: number;
  let stockReturnId: number;
  let cashSaleReference: string;
  let collectionsBeforeCash: number;
  let tontineMemberId: number;
  let stockTontineRequestReference: string;
  let rattrapageReference: string;
  let rattrapageClientLastName: string;
  let residualStockRemainingBefore: number;

  test.beforeAll(async () => {
    localityName = uniqueE2eLabel('LOCALITE');
    clientLastName = uniqueE2eLabel('NOM');
    clientFirstName = 'Client';
    clientPhone = uniqueE2ePhone();

    const api = new ApiClient();
    await api.signInAsGestionnaire();
    await api.ensureTontineSessionActive();
    testArticle = await api.ensureArticleWithStock(20);
  });

  test('étape 0 — connexion gestionnaire ges003', async ({ page }) => {
    await loginAsGestionnaire(page);
    await expect(page.getByTestId('e2e-app-shell')).toBeVisible();
  });

  test('étape 1 — créer une localité', async ({ page }) => {
    await loginAsGestionnaire(page);

    await page.getByTestId('e2e-sidebar-configuration').click();
    await page.getByTestId('e2e-sidebar-localities').click();
    await page.getByTestId('e2e-locality-add-btn').click();

    await page.getByTestId('e2e-locality-name').fill(localityName);
    await page.getByTestId('e2e-locality-submit').click();

    await expect(page).toHaveURL(/\/localitylist/, { timeout: 20_000 });
    await dismissSwalSuccess(page);

    await page.getByTestId('e2e-locality-search').fill(localityName);
    await expect(page.getByTestId('e2e-locality-table')).toContainText(localityName, {
      timeout: 15_000,
    });
  });

  test('étape 2 — créer un client E2E et activer son compte (COM020)', async ({ page }) => {
    await loginAsGestionnaire(page);

    await page.getByTestId('e2e-sidebar-clients').click();
    await page.getByTestId('e2e-client-add-btn').click();
    await expect(page.getByTestId('e2e-client-form')).toBeVisible();

    await page.getByTestId('e2e-client-lastname').fill(clientLastName);
    await page.getByTestId('e2e-client-firstname').fill(clientFirstName);
    await page.getByTestId('e2e-client-address').fill('Adresse E2E Lomé');
    await page.getByTestId('e2e-client-phone').fill(clientPhone);
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

    await expect(page).toHaveURL(/\/client-list/, { timeout: 30_000 });
    await dismissSwalSuccess(page);

    await page.getByTestId('e2e-client-search').fill(clientLastName);
    await page.getByTestId('e2e-client-search').press('Enter');
    await expect(page.getByTestId('e2e-client-list')).toContainText(clientLastName, {
      timeout: 15_000,
    });

    await activateClientAccount(page, clientLastName);
  });

  test('étape 3 — créer une demande de sortie stock pour COM020', async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsGestionnaire(page);

    await page.getByTestId('e2e-sidebar-stock-commercial').click();
    await page.getByTestId('e2e-sidebar-stock-request').click();
    await page.getByTestId('e2e-stock-request-new-btn').click();

    await expect(page.getByTestId('e2e-stock-request-form')).toBeVisible();
    await page.locator('ngx-spinner').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
    await chooseCurrentMonthIfPrompted(page);

    await selectNgSelectOption(page, 'e2e-stock-request-collector', TEST_COMMERCIAL_USERNAME);
    await selectArticleInSelector(page, 0, testArticle.label, E2E_STOCK_REQUEST_QTY);

    await page.getByTestId('e2e-stock-request-submit').click();
    await expect(page).toHaveURL(/\/stock\/request/, { timeout: 30_000 });

    const createdRow = page
      .locator('[data-testid="e2e-stock-request-row"][data-status="CREATED"]')
      .filter({ hasText: TEST_COMMERCIAL_USERNAME })
      .first();

    await expect(createdRow).toBeVisible({ timeout: 15_000 });
    stockRequestReference = (await createdRow.getAttribute('data-reference')) ?? '';
    expect(stockRequestReference.length).toBeGreaterThan(0);
  });

  test('étape 4 — ges003 valide la demande (avant livraison magasin)', async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsGestionnaire(page);

    const createdRow = await findStockRequestRow(page, stockRequestReference);
    await expect(createdRow).toBeVisible({ timeout: 15_000 });
    await expect(createdRow).toContainText('Créé');

    await expect(createdRow.getByTestId('e2e-stock-request-validate')).toBeVisible();
    await expect(createdRow.getByTestId('e2e-stock-request-deliver')).toHaveCount(0);

    await createdRow.getByTestId('e2e-stock-request-validate').click();
    await confirmSwal(page);

    await expectStockRequestValidated(stockRequestReference);
  });

  test('étape 5 — mag001 livre la demande (après validation gestionnaire)', async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsMagasinier(page);

    const validatedRow = await findStockRequestRow(page, stockRequestReference);
    await expect(validatedRow).toBeVisible({ timeout: 15_000 });
    await expect(validatedRow).toContainText('Validé');

    await expect(validatedRow.getByTestId('e2e-stock-request-deliver')).toBeVisible();
    await expect(validatedRow.getByTestId('e2e-stock-request-validate')).toHaveCount(0);

    await validatedRow.getByTestId('e2e-stock-request-deliver').click();
    await confirmSwal(page);

    await expectStockRequestDelivered(stockRequestReference);
  });

  test('étape 6 — vérifier le stock mensuel de COM020', async ({ page }) => {
    await loginAsGestionnaire(page);

    await page.getByTestId('e2e-sidebar-stock-commercial').click();
    await page.getByTestId('e2e-sidebar-stock-my-stock').click();

    await expect(page.getByTestId('e2e-my-stock-dashboard')).toBeVisible();
    await selectNgSelectOption(page, 'e2e-my-stock-agent-select', TEST_COMMERCIAL_USERNAME);

    const stockPanel = page
      .getByTestId('e2e-my-stock-panel')
      .filter({ hasText: TEST_COMMERCIAL_USERNAME })
      .first();

    await expect(stockPanel).toBeVisible({ timeout: 15_000 });
    await expect(stockPanel).toContainText('FCFA');
  });

  test('étape 7 — vente à crédit pour le client E2E (COM020)', async ({ page }) => {
    test.setTimeout(120_000);

    const api = new ApiClient();
    await api.signInAsGestionnaire();
    await api.ensureCommercialStockRemaining(
      TEST_COMMERCIAL_USERNAME,
      testArticle.id,
      E2E_CREDIT_SALE_QTY,
    );

    const stockItemBefore = await api.getMonthlyStockItem(TEST_COMMERCIAL_USERNAME, testArticle.id);
    stockSoldBefore = stockItemBefore?.quantitySold ?? 0;
    stockRemainingBefore = stockItemBefore?.quantityRemaining ?? 0;

    await loginAsGestionnaire(page);
    await page.goto('/credit-add');
    await page.locator('ngx-spinner').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});

    await fillCreditSaleForm(
      page,
      TEST_COMMERCIAL_USERNAME,
      clientLastName,
      testArticle.label,
      E2E_CREDIT_SALE_QTY,
    );
    await submitCreditForm(page);

    const credit = await expectCreditForClient(clientLastName, { status: 'INPROGRESS' });
    creditReference = credit.reference;
    dailyStakeAmount = credit.dailyStake ?? 200;
    expect(creditReference.length).toBeGreaterThan(0);
  });

  test('étape 8 — effectuer une mise (recouvrement) sur le crédit', async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsGestionnaire(page);

    const creditRow = await findCreditRow(page, clientLastName);
    await expect(creditRow).toBeVisible({ timeout: 15_000 });
    await expect(creditRow.getByTestId('e2e-credit-daily-stake-btn')).toBeVisible();

    await creditRow.getByTestId('e2e-credit-daily-stake-btn').click();
    await expect(page.getByTestId('e2e-daily-stake-modal')).toBeVisible();

    const amountInput = page.getByTestId('e2e-daily-stake-amount');
    await expect(amountInput).toBeVisible({ timeout: 10_000 });

    const maxAttr = await amountInput.getAttribute('max');
    const maxAmount = maxAttr ? Number(maxAttr) : dailyStakeAmount;
    const stakeAmount = Math.min(dailyStakeAmount, maxAmount);
    await amountInput.fill(String(stakeAmount));
    dailyStakeAmount = stakeAmount;

    const submitBtn = page.getByTestId('e2e-daily-stake-submit');
    await expect(submitBtn).toBeEnabled({ timeout: 10_000 });
    await submitBtn.click();
    await dismissSwalSuccess(page);

    await expectRecouvrementForCredit(creditReference, dailyStakeAmount);
  });

  test('étape 9 — vérifier le recouvrement dans la liste', async ({ page }) => {
    await loginAsGestionnaire(page);
    await page.goto('/credits/recouvrements');

    await expect(page.getByTestId('e2e-recouvrement-page')).toBeVisible();
    await page.getByTestId('e2e-recouvrement-period-today').click();
    await selectNgSelectOption(page, 'e2e-commercial-selector', TEST_COMMERCIAL_USERNAME);

    const table = page.getByTestId('e2e-recouvrement-table');
    await expect(table).toBeVisible({ timeout: 15_000 });
    await expect(table).toContainText(creditReference, { timeout: 15_000 });
    await expect(table).toContainText(clientLastName);
    await expect(table).toContainText(TEST_COMMERCIAL_USERNAME);
  });

  test('étape 10 — rapport journalier et versement caisse', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsGestionnaire(page);

    await page.getByTestId('e2e-sidebar-daily-report').click();
    await expect(page.getByTestId('e2e-daily-report')).toBeVisible();

    await page.getByTestId('e2e-daily-report-filter-today').click();
    await selectNgSelectOption(page, 'e2e-daily-report-agent-select', TEST_COMMERCIAL_USERNAME);
    await page.locator('mat-spinner').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});

    const panel = page.getByTestId(`e2e-daily-report-panel-${TEST_COMMERCIAL_USERNAME}`);
    await expect(panel).toBeVisible({ timeout: 20_000 });

    const collectionsKpi = panel.getByTestId('e2e-daily-report-collections-kpi');
    await expectKpiCountPositive(collectionsKpi);

    const depositBtn = panel.getByTestId('e2e-daily-report-deposit-btn');
    await expect(depositBtn).toBeVisible({ timeout: 15_000 });
    await depositBtn.click();

    await expect(page.getByTestId('e2e-cash-deposit-modal')).toBeVisible();
    await fillBilletageAmount(page, dailyStakeAmount);
    await page.getByTestId('e2e-cash-deposit-submit').click();

    await expect(page.getByTestId('e2e-cash-deposit-modal')).toBeHidden({ timeout: 20_000 });
  });

  test('étape 11 — stock mensuel agrégé après vente et recouvrement', async ({ page }) => {
    test.setTimeout(60_000);
    await loginAsGestionnaire(page);

    await page.getByTestId('e2e-sidebar-stock-commercial').click();
    await page.getByTestId('e2e-sidebar-stock-my-stock').click();
    await selectNgSelectOption(page, 'e2e-my-stock-agent-select', TEST_COMMERCIAL_USERNAME);

    const stockPanel = page
      .getByTestId('e2e-my-stock-panel')
      .filter({ hasText: TEST_COMMERCIAL_USERNAME })
      .first();
    await expect(stockPanel).toBeVisible({ timeout: 15_000 });
    await stockPanel.click();

    const articleRow = page.locator(
      `[data-testid="e2e-my-stock-item-row"][data-article-id="${testArticle.id}"]`,
    );
    await expect(articleRow).toBeVisible({ timeout: 15_000 });

    const stockItemAfter = await getMonthlyStockItem(TEST_COMMERCIAL_USERNAME, testArticle.id);
    expect(stockItemAfter?.quantitySold ?? 0).toBeGreaterThanOrEqual(
      stockSoldBefore + E2E_CREDIT_SALE_QTY,
    );
    expect(stockItemAfter?.quantityRemaining ?? 0).toBeLessThanOrEqual(
      stockRemainingBefore - E2E_CREDIT_SALE_QTY,
    );

    await expect(articleRow).toContainText(String(stockItemAfter?.quantitySold ?? 0));
  });

  test('étape 12 — COM020 crée un retour stock commercial', async ({ page }) => {
    test.setTimeout(90_000);
    const stockItem = await getMonthlyStockItem(TEST_COMMERCIAL_USERNAME, testArticle.id);
    stockReturnedBefore = stockItem?.quantityReturned ?? 0;

    await loginAsCommercial(page);
    await page.getByTestId('e2e-sidebar-stock-commercial').click();
    await page.getByTestId('e2e-sidebar-stock-return').click();
    await page.getByTestId('e2e-stock-return-new-btn').click();

    await expect(page.getByTestId('e2e-stock-return-form')).toBeVisible();
    await selectArticleInSelector(page, 0, testArticle.label, E2E_STOCK_RETURN_QTY);
    await page.getByTestId('e2e-stock-return-submit').click();

    await expect(page).toHaveURL(/\/stock\/return/, { timeout: 30_000 });
    stockReturnId = await findCreatedStockReturnId(TEST_COMMERCIAL_USERNAME);
  });

  test('étape 13 — mag001 réceptionne le retour stock', async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsMagasinier(page);

    const returnRow = await findStockReturnRow(page, TEST_COMMERCIAL_USERNAME, 'CREATED');
    await expect(returnRow).toBeVisible({ timeout: 15_000 });
    await returnRow.getByTestId('e2e-stock-return-validate').click();
    await confirmSwal(page);

    await expectStockReturnReceived(stockReturnId);
  });

  test('étape 14 — totaux stock mensuel après retour', async ({ page }) => {
    await loginAsGestionnaire(page);
    await page.getByTestId('e2e-sidebar-stock-commercial').click();
    await page.getByTestId('e2e-sidebar-stock-my-stock').click();
    await selectNgSelectOption(page, 'e2e-my-stock-agent-select', TEST_COMMERCIAL_USERNAME);

    const stockItem = await getMonthlyStockItem(TEST_COMMERCIAL_USERNAME, testArticle.id);
    expect(stockItem?.quantityReturned ?? 0).toBeGreaterThanOrEqual(
      stockReturnedBefore + E2E_STOCK_RETURN_QTY,
    );
  });

  test('étape 15 — vente comptant pour le client E2E', async ({ page }) => {
    test.setTimeout(120_000);
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const reportsBefore = await api.getDailyReports(
      todayIsoDate(),
      todayIsoDate(),
      TEST_AGENCY_COMMERCIAL_USERNAME,
    );
    collectionsBeforeCash = reportsBefore[0]?.collectionsAmount ?? 0;

    await loginAsGestionnaire(page);
    await page.goto('/credit-add');
    await page.locator('ngx-spinner').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});

    await selectCashSaleType(page);
    await page.locator('ngx-spinner').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});

    await selectNgSelectOption(page, 'e2e-credit-client', clientLastName);
    await selectArticleInSelector(page, 0, testArticle.label, E2E_CASH_SALE_QTY);
    await submitCreditForm(page);

    await expect.poll(async () => {
      const apiClient = new ApiClient();
      await apiClient.signInAsGestionnaire();
      const sale = await apiClient.findCashSaleByClientLastName(clientLastName);
      return sale?.reference ?? '';
    }, { timeout: 30_000 }).toMatch(/^CSH-/);

    const apiAfter = new ApiClient();
    await apiAfter.signInAsGestionnaire();
    const cashSale = await apiAfter.findCashSaleByClientLastName(clientLastName);
    cashSaleReference = cashSale?.reference ?? '';
    expect(cashSale?.collector).toBe(TEST_AGENCY_COMMERCIAL_USERNAME);
  });

  test('étape 16 — totaux rapport journalier après vente comptant (commercial agence)', async ({ page }) => {
    await loginAsGestionnaire(page);
    await page.getByTestId('e2e-sidebar-daily-report').click();
    await page.getByTestId('e2e-daily-report-filter-today').click();
    await selectNgSelectOption(page, 'e2e-daily-report-agent-select', TEST_AGENCY_COMMERCIAL_USERNAME);
    await page.locator('mat-spinner').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});

    const panel = page.getByTestId(`e2e-daily-report-panel-${TEST_AGENCY_COMMERCIAL_USERNAME}`);
    await expect(panel).toBeVisible({ timeout: 20_000 });

    const collectionsKpi = panel.getByTestId('e2e-daily-report-collections-kpi');
    await expect(collectionsKpi).toBeVisible();

    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const reports = await api.getDailyReports(
      todayIsoDate(),
      todayIsoDate(),
      TEST_AGENCY_COMMERCIAL_USERNAME,
    );
    expect(reports[0]?.collectionsAmount ?? 0).toBeGreaterThan(collectionsBeforeCash);
  });

  test('étape 17 — ajouter le client E2E comme membre tontine', async ({ page }) => {
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    await api.ensureTontineSessionActive();

    await loginAsGestionnaire(page);
    await page.goto('/tontine');
    await expect(page.getByTestId('e2e-tontine-dashboard')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('e2e-tontine-add-member-btn')).toBeEnabled({ timeout: 30_000 });

    await page.getByTestId('e2e-tontine-add-member-btn').click();
    await expect(page.getByTestId('e2e-tontine-add-member-modal')).toBeVisible();
    await selectMatSelectByText(page, 'e2e-tontine-member-client', clientLastName);
    await page.getByTestId('e2e-tontine-member-amount').fill(String(E2E_TONTINE_MEMBER_AMOUNT));
    await page.getByTestId('e2e-tontine-member-submit').click();

    await expect(page.getByTestId('e2e-tontine-add-member-modal')).toBeHidden({ timeout: 20_000 });
    tontineMemberId = await expectTontineMemberExists(clientLastName);
  });

  test('étape 18 — enregistrer une collecte tontine sur la fiche membre', async ({ page }) => {
    // La collecte est attribuée au commercial connecté (pas au gestionnaire).
    await loginAsCommercial(page);
    await page.goto(`/tontine/member/${tontineMemberId}`);
    await expect(page.getByTestId('e2e-tontine-member-details')).toBeVisible({ timeout: 20_000 });

    await page.getByTestId('e2e-tontine-record-collection-btn').click();
    await expect(page.getByTestId('e2e-tontine-collection-modal')).toBeVisible();
    await page.getByTestId('e2e-tontine-collection-amount').fill(String(E2E_TONTINE_COLLECTION_AMOUNT));
    await page.getByTestId('e2e-tontine-collection-submit').click();

    await expect(page.getByTestId('e2e-tontine-collection-modal')).toBeHidden({ timeout: 20_000 });
    await expectTontineCollectionSummary(TEST_COMMERCIAL_USERNAME, E2E_TONTINE_COLLECTION_AMOUNT);
  });

  test('étape 19 — vérifier la collecte tontine dans la liste', async ({ page }) => {
    await loginAsGestionnaire(page);
    await page.getByTestId('e2e-sidebar-tontines').click();
    await page.getByTestId('e2e-sidebar-tontine-collectes').click();

    await expect(page.getByTestId('e2e-tontine-collecte-page')).toBeVisible();
    await page.getByTestId('e2e-tontine-collecte-filter-today').click();
    await selectNgSelectOption(page, 'e2e-commercial-selector', TEST_COMMERCIAL_USERNAME);

    const table = page.getByTestId('e2e-tontine-collecte-table');
    const clientRow = table.locator('tr').filter({ hasText: clientLastName });
    await expect(clientRow).toBeVisible({ timeout: 15_000 });
    await expect(clientRow).toContainText(E2E_TONTINE_COLLECTION_AMOUNT.toLocaleString('en-US'));

    await expectTontineCollectionSummary(TEST_COMMERCIAL_USERNAME, E2E_TONTINE_COLLECTION_AMOUNT);
  });

  test('étape 20 — créer une demande de stock tontine pour COM020', async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsGestionnaire(page);
    await page.getByTestId('e2e-sidebar-stock-tontine').click();
    await page.getByTestId('e2e-sidebar-stock-tontine-request').click();
    await page.getByTestId('e2e-stock-tontine-request-new-btn').click();

    await expect(page.getByTestId('e2e-stock-tontine-request-form')).toBeVisible();
    await selectNgSelectOption(page, 'e2e-stock-tontine-request-collector', TEST_COMMERCIAL_USERNAME);
    await selectArticleInSelector(page, 0, testArticle.label, E2E_STOCK_TONTINE_REQUEST_QTY);
    await page.getByTestId('e2e-stock-tontine-request-submit').click();

    await expect(page).toHaveURL(/\/stock-tontine\/request/, { timeout: 30_000 });

    const createdRow = page
      .locator('[data-testid="e2e-stock-tontine-request-row"][data-status="CREATED"]')
      .filter({ hasText: TEST_COMMERCIAL_USERNAME })
      .first();

    await expect(createdRow).toBeVisible({ timeout: 15_000 });
    stockTontineRequestReference = (await createdRow.getAttribute('data-reference')) ?? '';
    expect(stockTontineRequestReference.length).toBeGreaterThan(0);
  });

  test('étape 21 — ges003 valide la demande stock tontine', async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsGestionnaire(page);

    const createdRow = await findStockTontineRequestRow(page, stockTontineRequestReference);
    await expect(createdRow.getByTestId('e2e-stock-tontine-request-validate')).toBeVisible();
    await createdRow.getByTestId('e2e-stock-tontine-request-validate').click();
    await confirmSwal(page);

    await expectStockTontineRequestValidated(stockTontineRequestReference);
  });

  test('étape 22 — mag001 livre la demande stock tontine', async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsMagasinier(page);

    const validatedRow = await findStockTontineRequestRow(page, stockTontineRequestReference);
    await expect(validatedRow.getByTestId('e2e-stock-tontine-request-deliver')).toBeVisible();
    await validatedRow.getByTestId('e2e-stock-tontine-request-deliver').click();
    await confirmSwal(page);

    await expectStockTontineRequestDelivered(stockTontineRequestReference);
    await expectTontineStockAvailable(testArticle.id, E2E_STOCK_TONTINE_REQUEST_QTY);
  });

  test('étape 23 — vérifier le stock tontine annuel de COM020', async ({ page }) => {
    await loginAsGestionnaire(page);
    await page.getByTestId('e2e-sidebar-stock-tontine').click();
    await page.getByTestId('e2e-sidebar-stock-tontine-my-stock').click();
    await selectNgSelectOption(page, 'e2e-tontine-my-stock-agent-select', TEST_COMMERCIAL_USERNAME);

    const panel = page.getByTestId('e2e-tontine-my-stock-panel').filter({ hasText: TEST_COMMERCIAL_USERNAME }).first();
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await panel.click();
    await expect(panel).toContainText(testArticle.label, { timeout: 15_000 });
  });

  test('étape 24 — clôturer la session tontine (prérequis livraison)', async () => {
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    await api.closeCurrentTontineSession();
  });

  test('étape 25 — préparer la livraison tontine au client', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsGestionnaire(page);
    await page.goto(`/tontine/member/${tontineMemberId}`);
    await expect(page.getByTestId('e2e-tontine-member-details')).toBeVisible({ timeout: 20_000 });

    await expect(page.getByTestId('e2e-tontine-prepare-delivery-btn')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('e2e-tontine-prepare-delivery-btn').click();
    await expect(page.getByTestId('e2e-tontine-delivery-modal')).toBeVisible();

    await selectTontineDeliveryArticle(page, testArticle.id, testArticle.label);
    await expect(page.getByTestId('e2e-tontine-delivery-submit')).toBeEnabled({ timeout: 10_000 });
    await page.getByTestId('e2e-tontine-delivery-submit').click();

    await expect(page.getByTestId('e2e-tontine-delivery-modal')).toBeHidden({ timeout: 30_000 });
    await expectTontineMemberDeliveryStatus(clientLastName, 'VALIDATED');
  });

  test('étape 26 — COM020 marque la livraison tontine comme livrée', async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsCommercial(page);
    await page.goto(`/tontine/member/${tontineMemberId}`);
    await expect(page.getByTestId('e2e-tontine-member-details')).toBeVisible({ timeout: 20_000 });

    await expect(page.getByTestId('e2e-tontine-mark-delivered-btn')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('e2e-tontine-mark-delivered-btn').click();
    await confirmSwal(page);

    await expectTontineMemberDeliveryStatus(clientLastName, 'DELIVERED');
  });

  test('étape 27 — KPIs tontine (livraisons + rapport journalier)', async ({ page }) => {
    test.setTimeout(90_000);
    await loginAsGestionnaire(page);

    await page.getByTestId('e2e-sidebar-tontines').click();
    await page.getByTestId('e2e-sidebar-tontine-livraisons').click();
    await expect(page.getByTestId('e2e-tontine-delivery-list')).toBeVisible();
    await expect(page.getByTestId('e2e-tontine-delivery-list')).toContainText(clientLastName, {
      timeout: 20_000,
    });

    await page.getByTestId('e2e-sidebar-daily-report').click();
    await page.getByTestId('e2e-daily-report-filter-today').click();
    await selectNgSelectOption(page, 'e2e-daily-report-agent-select', TEST_COMMERCIAL_USERNAME);
    await page.locator('mat-spinner').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});

    const panel = page.getByTestId(`e2e-daily-report-panel-${TEST_COMMERCIAL_USERNAME}`);
    await expect(panel.getByTestId('e2e-daily-report-tontine-members-kpi')).toBeVisible();
    await expectKpiCountPositive(panel.getByTestId('e2e-daily-report-tontine-collections-kpi'));
    await expectKpiCountPositive(panel.getByTestId('e2e-daily-report-tontine-deliveries-kpi'));
  });

  test('étape 28 — préparer le stock résiduel du mois précédent (API)', async () => {
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    await api.seedResidualStockForE2e(
      TEST_COMMERCIAL_USERNAME,
      testArticle.id,
      E2E_RESIDUAL_STOCK_QTY,
    );

    const residualItem = await api.getResidualStockItemRemaining(
      TEST_COMMERCIAL_USERNAME,
      testArticle.id,
    );
    expect(residualItem).not.toBeNull();
    expect(residualItem!.quantityRemaining).toBeGreaterThanOrEqual(E2E_RATTRAPAGE_QTY);
    residualStockRemainingBefore = residualItem!.quantityRemaining;
  });

  test('étape 29 — COM020 crée un rattrapage crédit sur stock antérieur', async ({ page }) => {
    test.setTimeout(180_000);
    rattrapageClientLastName = uniqueE2eLabel('RATNOM');

    await loginAsGestionnaire(page);
    await page.getByTestId('e2e-sidebar-clients').click();
    await page.getByTestId('e2e-client-add-btn').click();
    await expect(page.getByTestId('e2e-client-form')).toBeVisible();
    await page.getByTestId('e2e-client-lastname').fill(rattrapageClientLastName);
    await page.getByTestId('e2e-client-firstname').fill('Rattrapage');
    await page.getByTestId('e2e-client-address').fill('Adresse E2E rattrapage');
    await page.getByTestId('e2e-client-phone').fill(uniqueE2ePhone());
    await page.getByTestId('e2e-client-card-type').selectOption('ID Card');
    await page.getByTestId('e2e-client-card-id').fill(`RAT${Date.now().toString().slice(-8)}`);
    await page.getByTestId('e2e-client-birthdate').fill('1992-03-20');
    await page.getByTestId('e2e-client-occupation').fill('Commerçant');
    await selectNgSelectOption(page, 'e2e-client-quarter', localityName);
    await selectNgSelectOption(page, 'e2e-client-collector', TEST_COMMERCIAL_USERNAME);
    await selectNgSelectOption(page, 'e2e-client-tontine-collector', TEST_COMMERCIAL_USERNAME);
    await page.getByTestId('e2e-client-type').selectOption('CLIENT');
    await page.getByTestId('e2e-client-account-balance').fill('1000');
    await page.getByTestId('e2e-client-submit').click();
    await expect(page).toHaveURL(/\/client-list/, { timeout: 30_000 });
    await dismissSwalSuccess(page);
    await activateClientAccount(page, rattrapageClientLastName);

    await logout(page);
    await loginAsCommercial(page);
    await page.goto('/stock/credit/rattrapage');
    await page.locator('ngx-spinner').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});

    await expect(page.getByTestId('e2e-rattrapage-page')).toBeVisible({ timeout: 20_000 });
    await selectNgSelectOption(page, 'e2e-rattrapage-client', rattrapageClientLastName);

    const monthCard = page.getByTestId('e2e-rattrapage-month-card').first();
    await expect(monthCard).toBeVisible({ timeout: 20_000 });
    await monthCard.click();

    const articleRow = page.locator(
      `[data-testid="e2e-rattrapage-article-row"][data-article-id="${testArticle.id}"]`,
    );
    await expect(articleRow).toBeVisible({ timeout: 15_000 });
    await articleRow.getByTestId('e2e-rattrapage-article-checkbox').check();

    if (E2E_RATTRAPAGE_QTY > 1) {
      await articleRow.locator('.qty-input').fill(String(E2E_RATTRAPAGE_QTY));
    }

    await page.getByTestId('e2e-rattrapage-daily-stake').fill(String(E2E_RATTRAPAGE_DAILY_STAKE));
    await page.getByTestId('e2e-rattrapage-submit').click();

    await expect(page).toHaveURL(/\/credit-list/, { timeout: 30_000 });
    await dismissSwalSuccess(page);

    const credit = await expectRattrapageCreditForClient(rattrapageClientLastName, { status: 'INPROGRESS' });
    rattrapageReference = credit.reference;
    expect(rattrapageReference).toMatch(/^RAT-/);
  });

  test('étape 30 — vérifier la décrémentation du stock résiduel et le crédit RAT', async ({ page }) => {
    await expectResidualStockRemaining(
      testArticle.id,
      residualStockRemainingBefore - E2E_RATTRAPAGE_QTY,
    );

    await loginAsGestionnaire(page);
    await page.goto('/credit-list');
    await page.locator('ngx-spinner').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});

    const rattrapageRow = page.locator(
      `[data-testid="e2e-credit-row"][data-credit-reference="${rattrapageReference}"]`,
    );
    await expect(rattrapageRow).toBeVisible({ timeout: 15_000 });
    await expect(rattrapageRow).toContainText(rattrapageClientLastName);
  });
});
