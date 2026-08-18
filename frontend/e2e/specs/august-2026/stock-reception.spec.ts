import { test, expect } from '@playwright/test';
import { ApiClient } from '../../fixtures/api-client';
import { loginAsGestionnaire, loginAsMagasinier } from '../../fixtures/auth';
import { confirmSwal, dismissSwalSuccess, selectArticleInSelector } from '../../fixtures/ui-helpers';

test.describe.configure({ mode: 'serial' });

/**
 * Création d'entrée par mag001 (PENDING, stock inchangé),
 * validation / refus par ges003.
 */
test.describe('Réception stock PENDING @p0 @web @august-2026 @regression', () => {
  let articleId: number;
  let articleLabel: string;
  let qtyBefore: number;
  let createdReference: string;

  test.beforeAll(async () => {
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const articles = await api.getEnabledArticles();
    const article = articles.find((row) => row.id != null);
    if (!article) {
      throw new Error('Aucun article activé pour W-P0-06');
    }
    articleId = article.id;
    articleLabel = article.commercialName || article.name || `article-${article.id}`;
    const fresh = await api.getArticle(articleId);
    qtyBefore = fresh.stockQuantity ?? 0;
  });

  async function createPendingViaApi(): Promise<{ id: number; reference: string; status: string }> {
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const pendingBefore = await api.getStockReceptions('PENDING');
    await api.makeStockEntries(articleId, 1);
    const pendingAfter = await api.getStockReceptions('PENDING');
    const created = pendingAfter.find((row) => !pendingBefore.some((before) => before.id === row.id));
    if (!created) {
      throw new Error('Réception PENDING non créée');
    }
    return created;
  }

  test('W-P0-06 magasinier crée une entrée → PENDING, stock inchangé', async ({ page }) => {
    const api = new ApiClient();
    await api.signInAsMagasinier();
    const pendingBefore = await api.getStockReceptions('PENDING');

    await loginAsMagasinier(page);
    await page.goto('/inventory/list');
    await page.getByTestId('e2e-inventory-add-stock').click();
    await expect(page).toHaveURL(/\/inventory\/add/);
    await selectArticleInSelector(page, 0, articleLabel, 1, articleId);
    await page.getByTestId('e2e-inventory-submit').click();
    await dismissSwalSuccess(page);
    await expect(page).toHaveURL(/\/stock\/receptions/, { timeout: 20_000 });
    await expect(page.getByTestId('e2e-stock-reception-list')).toBeVisible();

    const pendingAfter = await api.getStockReceptions('PENDING');
    expect(pendingAfter.length).toBeGreaterThan(pendingBefore.length);
    const created = pendingAfter.find((row) => !pendingBefore.some((before) => before.id === row.id));
    expect(created?.status).toBe('PENDING');
    createdReference = created!.reference;

    await api.signInAsGestionnaire();
    const qtyAfter = (await api.getArticle(articleId)).stockQuantity ?? 0;
    expect(qtyAfter).toBe(qtyBefore);
  });

  test('W-P0-07a ges003 valide → stock augmente', async ({ page }) => {
    const target = await createPendingViaApi();
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const qtyBeforeValidate = (await api.getArticle(articleId)).stockQuantity ?? 0;

    await loginAsGestionnaire(page);
    await page.goto('/stock/receptions');
    const row = page.locator(`[data-testid="e2e-stock-reception-row"][data-reference="${target.reference}"]`);
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.getByTestId('e2e-stock-reception-validate').click();
    await confirmSwal(page);
    await dismissSwalSuccess(page);

    await expect.poll(async () => {
      return (await api.getArticle(articleId)).stockQuantity ?? -1;
    }).toBe(qtyBeforeValidate + 1);
  });

  test('W-P0-07b ges003 refuse → stock inchangé', async ({ page }) => {
    const target = await createPendingViaApi();
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const qtyBeforeRefuse = (await api.getArticle(articleId)).stockQuantity ?? 0;

    await loginAsGestionnaire(page);
    await page.goto('/stock/receptions');
    const row = page.locator(`[data-testid="e2e-stock-reception-row"][data-reference="${target.reference}"]`);
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.getByTestId('e2e-stock-reception-refuse').click();
    await confirmSwal(page);
    await dismissSwalSuccess(page);

    await expect.poll(async () => {
      const receptions = await api.getStockReceptions();
      return receptions.find((row) => row.reference === target.reference)?.status ?? '';
    }).toBe('REFUSED');

    const qtyAfter = (await api.getArticle(articleId)).stockQuantity ?? 0;
    expect(qtyAfter).toBe(qtyBeforeRefuse);
  });

  test('W-P0-08 magasinier abandonne sa PENDING', async ({ page }) => {
    test.skip(!createdReference, 'Pas de réception W-P0-06 à abandonner');
    await loginAsMagasinier(page);
    await page.goto('/stock/receptions');
    const row = page.locator(`[data-testid="e2e-stock-reception-row"][data-reference="${createdReference}"]`);
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.getByTestId('e2e-stock-reception-abandon').click();
    await confirmSwal(page);
    await dismissSwalSuccess(page);

    const api = new ApiClient();
    await api.signInAsMagasinier();
    await expect.poll(async () => {
      const receptions = await api.getStockReceptions();
      return receptions.find((row) => row.reference === createdReference)?.status ?? '';
    }).toBe('CANCELLED');
  });
});
