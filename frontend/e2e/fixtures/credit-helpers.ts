import { expect, Page } from '@playwright/test';
import { ApiClient, CreditSummary, MonthlyStockItem } from './api-client';
import { dismissSwalSuccess, selectArticleInSelector, selectNgSelectOption } from './ui-helpers';
import { TEST_COMMERCIAL_USERNAME, todayIsoDate } from './test-data';

export async function expectCreditForClient(
  clientLastName: string,
  options?: { status?: string; timeoutMs?: number },
): Promise<CreditSummary> {
  const api = new ApiClient();
  await api.signInAsGestionnaire();
  const timeoutMs = options?.timeoutMs ?? 30_000;

  let found: CreditSummary | null = null;
  await expect.poll(async () => {
    found = await api.findCreditByClientLastName(TEST_COMMERCIAL_USERNAME, clientLastName);
    if (!found) {
      return null;
    }
    if (options?.status && found.status !== options.status) {
      return null;
    }
    return found;
  }, { timeout: timeoutMs }).not.toBeNull();

  return found!;
}

export async function expectRecouvrementForCredit(
  creditReference: string,
  minAmount = 1,
  collector = TEST_COMMERCIAL_USERNAME,
): Promise<void> {
  const api = new ApiClient();
  await api.signInAsGestionnaire();
  const today = todayIsoDate();

  await expect.poll(async () => {
    const rows = await api.getRecouvrements(today, today, collector);
    const match = rows.find(
      (row) => row.creditReference === creditReference && row.amount >= minAmount,
    );
    if (match) {
      return true;
    }
    const allRows = await api.getRecouvrements(today, today);
    return allRows.some(
      (row) => row.creditReference === creditReference && row.amount >= minAmount,
    );
  }, { timeout: 30_000 }).toBe(true);
}

/** Soumet le modal de mise journalière et vérifie le succès. */
export async function submitDailyStakeModal(page: Page): Promise<void> {
  const submitBtn = page.getByTestId('e2e-daily-stake-submit');
  await expect(submitBtn).toBeEnabled({ timeout: 10_000 });
  await submitBtn.click();

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (!(await page.getByTestId('e2e-daily-stake-modal').isVisible().catch(() => false))) {
      await dismissSwalSuccess(page);
      return;
    }
    if (await page.locator('.swal2-icon-error').isVisible().catch(() => false)) {
      const msg =
        (await page.locator('.swal2-html-container').textContent())?.trim() ??
        'erreur inconnue';
      throw new Error(`Mise journalière refusée : ${msg}`);
    }
    await page.waitForTimeout(400);
  }

  throw new Error('Modal mise journalière toujours visible après soumission');
}

export async function getMonthlyStockItem(
  collector: string,
  articleId: number,
): Promise<MonthlyStockItem | null> {
  const api = new ApiClient();
  await api.signInAsGestionnaire();
  return api.getMonthlyStockItem(collector, articleId);
}

/** Remplit le formulaire vente à crédit (commercial + client + article). */
export async function fillCreditSaleForm(
  page: Page,
  commercialUsername: string,
  clientLastName: string,
  articleLabel: string,
  quantity: number,
  articleId?: number,
): Promise<void> {
  await expect(page.getByTestId('e2e-credit-add-form')).toBeVisible();
  await selectNgSelectOption(page, 'e2e-credit-commercial', commercialUsername);
  await page.locator('ngx-spinner').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});

  await selectNgSelectOption(page, 'e2e-credit-client', clientLastName);
  await selectArticleInSelector(page, 0, articleLabel, quantity, articleId);

  await expect(page.getByTestId('e2e-credit-submit')).toBeEnabled({ timeout: 30_000 });
}

/**
 * Soumet une vente depuis credit-add et attend la fin (liste, modal reçu ou erreur explicite).
 */
export async function submitCreditForm(page: Page): Promise<void> {
  const submit = page.getByTestId('e2e-credit-submit');
  await expect(submit).toBeEnabled({ timeout: 30_000 });
  await submit.click();

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (/\/credit-list/.test(page.url())) {
      await dismissSwalSuccess(page);
      return;
    }

    const receiptModal = page.locator('.receipt-modal-container');
    if (await receiptModal.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Fermer' }).click();
      await expect(page).toHaveURL(/\/credit-list/, { timeout: 15_000 });
      return;
    }

    for (const icon of ['.swal2-icon-error', '.swal2-icon-warning']) {
      if (await page.locator(icon).isVisible().catch(() => false)) {
        const msg =
          (await page.locator('.swal2-html-container').textContent())?.trim() ??
          'erreur inconnue';
        throw new Error(`Soumission vente refusée : ${msg}`);
      }
    }

    await page.waitForTimeout(400);
  }

  throw new Error(
    `Soumission vente : pas de redirection vers /credit-list (URL=${page.url()})`,
  );
}
