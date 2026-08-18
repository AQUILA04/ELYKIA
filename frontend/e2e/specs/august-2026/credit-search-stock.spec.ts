import { test, expect } from '@playwright/test';
import { ApiClient } from '../../fixtures/api-client';
import { loginAsGestionnaire } from '../../fixtures/auth';
import { TEST_COMMERCIAL_USERNAME } from '../../fixtures/test-data';

test.describe('Recherche crédit + stock source @p0 @p1 @web @august-2026 @regression', () => {
  test('W-P0-09 recherche par référence RAT-* ne parse pas le tiret comme plage de dates', async ({ page }) => {
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const hits = await api.searchCredits({ keyword: 'RAT-', searchByReference: true }, 0, 50);
    const ratHits = hits.filter((credit) => credit.reference?.startsWith('RAT-'));
    test.skip(ratHits.length === 0, 'Aucun crédit RAT-* en base locale pour W-P0-09');
    if (ratHits.length === 0) {
      return;
    }

    const sample = ratHits[0]!;

    await loginAsGestionnaire(page);
    await page.goto('/credit/list');
    await expect(page.getByTestId('e2e-credit-list')).toBeVisible();
    await page.getByTestId('e2e-credit-advanced-toggle').click();
    await expect(page.getByTestId('e2e-credit-advanced-search')).toBeVisible();
    await page.getByTestId('e2e-credit-search-keyword').fill(sample.reference);
    await page.getByTestId('e2e-credit-search-by-reference').check();
    await page.getByTestId('e2e-credit-search-submit').click();

    const row = page.locator(`[data-testid="e2e-credit-row"][data-credit-reference="${sample.reference}"]`).first();
    await expect(row).toBeVisible({ timeout: 20_000 });

    const visibleRefs = await page.locator('[data-testid="e2e-credit-row"]').evaluateAll((nodes) =>
      nodes
        .filter((node) => (node as HTMLElement).offsetParent !== null)
        .map((node) => node.getAttribute('data-credit-reference') ?? ''),
    );
    expect(visibleRefs.every((reference) => reference.includes(sample.reference) || reference.startsWith('RAT-'))).toBe(
      true,
    );
  });

  test('W-P1-08 case « rechercher uniquement par référence » ignore le nom client', async ({ page }) => {
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const pool = [
      ...(await api.searchCredits({ commercial: TEST_COMMERCIAL_USERNAME }, 0, 100)),
      ...(await api.searchCredits({}, 0, 100)),
    ];
    const sample = pool.find((credit) => {
      const lastname = credit.client?.lastname?.trim() ?? '';
      const reference = credit.reference ?? '';
      return lastname.length >= 3 && !reference.toLowerCase().includes(lastname.toLowerCase());
    });
    test.skip(!sample, 'Aucun crédit avec nom client distinct de la référence');
    if (!sample) {
      return;
    }

    const lastname = sample.client!.lastname!.trim();
    const byName = await api.searchCredits({ keyword: lastname, searchByReference: false }, 0, 100);
    const byNameRefOnly = await api.searchCredits({ keyword: lastname, searchByReference: true }, 0, 100);
    const byRef = await api.searchCredits({ keyword: sample.reference, searchByReference: true }, 0, 50);

    expect(byName.some((credit) => credit.id === sample.id), 'sans case, le nom client doit matcher').toBe(true);
    expect(
      byNameRefOnly.every((credit) => credit.id !== sample.id),
      'avec case, le nom client ne doit pas matcher',
    ).toBe(true);
    expect(byRef.some((credit) => credit.id === sample.id)).toBe(true);

    await loginAsGestionnaire(page);
    await page.goto('/credit/list');
    await expect(page.getByTestId('e2e-credit-list')).toBeVisible();
    await page.getByTestId('e2e-credit-advanced-toggle').click();
    await expect(page.getByTestId('e2e-credit-advanced-search')).toBeVisible();
    await expect(page.getByTestId('e2e-credit-search-by-reference')).toBeVisible();
    await expect(page.locator('label.reference-only-toggle')).toContainText('Rechercher uniquement par référence');

    await page.getByTestId('e2e-credit-search-keyword').fill(lastname);
    await page.getByTestId('e2e-credit-search-by-reference').check();
    await page.getByTestId('e2e-credit-search-submit').click();
    await expect(
      page.locator(`[data-testid="e2e-credit-row"][data-credit-reference="${sample.reference}"]`),
    ).toHaveCount(0);

    await page.getByTestId('e2e-credit-search-keyword').fill(sample.reference!);
    await expect(page.getByTestId('e2e-credit-search-by-reference')).toBeChecked();
    await page.getByTestId('e2e-credit-search-submit').click();
    await expect(
      page.locator(`[data-testid="e2e-credit-row"][data-credit-reference="${sample.reference}"]`).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('W-P1-09 fiche crédit : stock mensuel source ouvre le modal ventes', async ({ page }) => {
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const ratHits = (await api.searchCredits({ keyword: 'RAT-', searchByReference: true }, 0, 50)).filter((credit) =>
      credit.reference?.startsWith('RAT-'),
    );
    const fallback = await api.searchCredits({ commercial: TEST_COMMERCIAL_USERNAME }, 0, 50);
    const candidates = [...ratHits, ...fallback];

    let creditId: number | null = null;
    let stock: { collector: string; month: number; year: number } | null = null;
    for (const candidate of candidates.slice(0, 30)) {
      if (!candidate.id) {
        continue;
      }
      const detail = await api.getCreditById(candidate.id);
      const source = detail.sourceMonthlyStocks?.[0];
      if (source?.collector && source.month && source.year) {
        creditId = candidate.id;
        stock = source;
        break;
      }
    }
    test.skip(!creditId || !stock, 'Aucun crédit avec stock mensuel source en base locale');
    if (!creditId || !stock) {
      return;
    }

    await loginAsGestionnaire(page);
    await page.goto(`/credit/details/${creditId}`);
    await expect(page.getByTestId('e2e-credit-details')).toBeVisible({ timeout: 20_000 });
    const chip = page.getByTestId('e2e-credit-source-stock').first();
    await expect(chip).toBeVisible();
    await expect(chip).toContainText(stock.collector);

    await chip.click();
    await expect(page).toHaveURL(/\/stock\/my-stock/, { timeout: 15_000 });
    await expect(page.getByTestId('e2e-stock-sold-sales-dialog')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('e2e-stock-sold-sales-dialog')).toContainText(stock.collector);
    await expect(page.getByTestId('e2e-stock-sold-sales-dialog')).toContainText(String(stock.year));
  });
});
