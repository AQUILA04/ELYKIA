import { expect, Locator, Page } from '@playwright/test';

export function stockRequestRowLocator(page: Page, reference: string): Locator {
  return page.locator(`[data-testid="e2e-stock-request-row"][data-reference="${reference}"]`);
}

async function waitForStockListReady(page: Page): Promise<void> {
  await page.locator('.ngx-spinner-overlay').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
  await page.getByTestId('e2e-stock-request-list').waitFor({ state: 'visible', timeout: 15_000 });
}

/** Ouvre la liste des demandes et attend le chargement. */
export async function prepareStockRequestList(page: Page): Promise<void> {
  await page.goto('/stock/request');
  await waitForStockListReady(page);

  const firstPageBtn = page.getByRole('button', { name: 'First page' });
  if (await firstPageBtn.isEnabled().catch(() => false)) {
    await firstPageBtn.click();
    await waitForStockListReady(page);
  }
}

/** Parcourt les pages du tableau jusqu'à trouver la demande par référence. */
export async function findStockRequestRow(page: Page, reference: string): Promise<Locator> {
  await prepareStockRequestList(page);

  for (let pageIndex = 0; pageIndex < 15; pageIndex++) {
    const row = stockRequestRowLocator(page, reference);
    if (await row.isVisible({ timeout: 2000 }).catch(() => false)) {
      return row;
    }

    const nextBtn = page.getByRole('button', { name: 'Next page' });
    if (!(await nextBtn.isEnabled().catch(() => false))) {
      break;
    }
    await nextBtn.click();
    await waitForStockListReady(page);
  }

  return stockRequestRowLocator(page, reference);
}

/** Vérifie le libellé de statut affiché dans le tableau (Créé / Validé / Livré). */
export async function expectStockRequestStatusLabel(
  page: Page,
  reference: string,
  statusLabel: string,
): Promise<void> {
  await expect.poll(async () => {
    await prepareStockRequestList(page);
    const row = await findStockRequestRow(page, reference);
    if (!(await row.isVisible().catch(() => false))) {
      return '';
    }
    return (await row.textContent()) ?? '';
  }, { timeout: 20_000 }).toContain(statusLabel);
}

/** Sélectionne une option dans un `ng-select` identifié par `data-testid`. */
export async function selectNgSelectOption(page: Page, testId: string, value: string): Promise<void> {
  const select = page.getByTestId(testId);
  await select.locator('.ng-select-container').click();
  await select.locator('input').fill(value);
  await page.locator('.ng-dropdown-panel .ng-option', { hasText: value }).first().click();
}

/** Garantit qu'au moins une ligne article est présente (le CVA peut vider le tableau au init). */
export async function ensureArticleSelectorRow(page: Page, rowIndex = 0): Promise<void> {
  await page.getByTestId('e2e-article-selector').waitFor({ state: 'visible' });
  const select = page.getByTestId(`e2e-article-select-${rowIndex}`);
  if (!(await select.isVisible({ timeout: 2000 }).catch(() => false))) {
    await page.getByTestId('e2e-article-add-btn').click();
  }
  await select.waitFor({ state: 'visible', timeout: 10_000 });
}

/** Sélectionne un article dans le composant article-selector (ligne indexée). */
export async function selectArticleInSelector(
  page: Page,
  rowIndex: number,
  searchText: string,
  quantity: number,
  articleId?: number,
): Promise<void> {
  await ensureArticleSelectorRow(page, rowIndex);
  const select = page.getByTestId(`e2e-article-select-${rowIndex}`);
  await select.locator('.ng-select-container').click();

  await page
    .waitForResponse(
      (resp) => resp.url().includes('/api/v1/articles') && resp.ok(),
      { timeout: 30_000 },
    )
    .catch(() => {});

  const trySelectVisibleOption = async (): Promise<boolean> => {
    if (articleId != null) {
      const byId = page.locator(`.ng-dropdown-panel [data-article-id="${articleId}"]`);
      if (await byId.isVisible({ timeout: 2000 }).catch(() => false)) {
        await byId.click();
        return true;
      }
    }

    const namePart = searchText.includes(':')
      ? searchText.split(':').slice(1).join(':').trim()
      : searchText.trim();
    let option = page.locator('.ng-dropdown-panel .ng-option').filter({ hasText: searchText });
    if ((await option.count()) === 0 && namePart) {
      option = page.locator('.ng-dropdown-panel .ng-option').filter({ hasText: namePart });
    }
    if (await option.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await option.first().click();
      return true;
    }
    return false;
  };

  if (await trySelectVisibleOption()) {
    await page.getByTestId(`e2e-article-quantity-${rowIndex}`).fill(String(quantity));
    return;
  }

  const namePart = searchText.includes(':')
    ? searchText.split(':').slice(1).join(':').trim()
    : searchText.trim();
  const typePart = searchText.includes(':') ? (searchText.split(':')[0]?.trim() ?? '') : '';
  const searchTerms = [
    namePart.split(/\s+/).filter(Boolean)[0] ?? '',
    namePart,
    typePart,
    searchText.trim(),
  ].filter((term, index, all) => term.length >= 2 && all.indexOf(term) === index);

  for (const term of searchTerms) {
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/api/v1/articles') &&
        ['GET', 'POST'].includes(resp.request().method()) &&
        resp.ok(),
      { timeout: 30_000 },
    );

    await select.locator('input').fill('');
    await select.locator('input').pressSequentially(term, { delay: 40 });
    await responsePromise.catch(() => {});
    await page.waitForTimeout(450);

    if (await trySelectVisibleOption()) {
      await page.getByTestId(`e2e-article-quantity-${rowIndex}`).fill(String(quantity));
      return;
    }
  }

  throw new Error(
    `Article introuvable dans article-selector (hint: ${searchText}${articleId != null ? `, id=${articleId}` : ''})`,
  );
}

/** Confirme une boîte SweetAlert2 (Oui / OK / Confirmer). */
export async function confirmSwal(page: Page): Promise<void> {
  const confirm = page.locator('.swal2-confirm, .custom-swal-confirm-button').first();
  await confirm.waitFor({ state: 'visible', timeout: 10_000 });
  await confirm.click();
  await page.locator('.swal2-container').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
}

/** Ferme une alerte de succès SweetAlert2 après création. */
export async function dismissSwalSuccess(page: Page): Promise<void> {
  const confirm = page.locator('.swal2-confirm');
  if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirm.click();
    await page.locator('.swal2-container').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}

/** Sélectionne « Mois courant » si l'option fin de mois est affichée. */
export async function chooseCurrentMonthIfPrompted(page: Page): Promise<void> {
  const currentMonthBtn = page.getByRole('button', { name: 'Mois courant' });
  if (await currentMonthBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await currentMonthBtn.click();
  }
}

function creditRowLocator(page: Page, clientLastName: string): Locator {
  // Desktop table + mobile cards both use e2e-credit-row; prefer the visible one.
  return page.locator(
    `[data-testid="e2e-credit-row"][data-client-lastname="${clientLastName}"]:visible`,
  );
}

/** Parcourt les pages de la liste des ventes jusqu'à trouver le client E2E. */
export async function findCreditRow(page: Page, clientLastName: string): Promise<Locator> {
  await page.goto('/credit/list');
  await page.locator('ngx-spinner').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});

  for (let pageIndex = 0; pageIndex < 15; pageIndex++) {
    const row = creditRowLocator(page, clientLastName);
    if (await row.isVisible({ timeout: 2000 }).catch(() => false)) {
      return row;
    }

    const nextBtn = page.getByRole('button', { name: 'Next page' });
    if (!(await nextBtn.isEnabled().catch(() => false))) {
      break;
    }
    await nextBtn.click();
    await page.locator('ngx-spinner').waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
  }

  return creditRowLocator(page, clientLastName);
}

/**
 * Saisit un montant via le billetage (billets/pièces) puis clique « Suivant ».
 * Décompose le montant en plus grandes coupures disponibles.
 */
export async function fillBilletageAmount(page: Page, amount: number): Promise<void> {
  const denominations = [
    { testId: 'e2e-billetage-10000', value: 10_000 },
    { testId: 'e2e-billetage-5000', value: 5_000 },
    { testId: 'e2e-billetage-2000', value: 2_000 },
    { testId: 'e2e-billetage-1000', value: 1_000 },
    { testId: 'e2e-billetage-500', value: 500 },
    { testId: 'e2e-billetage-piece-500', value: 500 },
    { testId: 'e2e-billetage-piece-250', value: 250 },
    { testId: 'e2e-billetage-piece-200', value: 200 },
    { testId: 'e2e-billetage-piece-100', value: 100 },
    { testId: 'e2e-billetage-piece-50', value: 50 },
    { testId: 'e2e-billetage-piece-25', value: 25 },
  ];

  let remaining = amount;
  for (const { testId, value } of denominations) {
    if (remaining < value) {
      continue;
    }
    const count = Math.floor(remaining / value);
    if (count > 0) {
      await page.getByTestId(testId).fill(String(count));
      remaining -= count * value;
    }
  }

  if (remaining > 0) {
    throw new Error(`Impossible de composer le billetage pour ${amount} FCFA (reste ${remaining})`);
  }

  await page.getByTestId('e2e-billetage-submit').click();
}

export async function selectCashSaleType(page: Page): Promise<void> {
  await page.getByTestId('e2e-credit-add-form').waitFor({ state: 'visible', timeout: 30_000 });
  await page
    .locator('label.segment-btn')
    .filter({ has: page.getByTestId('e2e-credit-sale-type-cash') })
    .click();
}

export async function selectMatSelectByText(page: Page, testId: string, optionText: string): Promise<void> {
  await page.getByTestId(testId).click();
  await page.getByRole('option', { name: new RegExp(optionText) }).first().click();
}

/** Sélectionne un article dans le modal livraison tontine par identifiant. */
export async function selectTontineDeliveryArticle(
  page: Page,
  articleId: number,
  searchHint: string,
): Promise<void> {
  await page
    .waitForResponse(
      (resp) =>
        resp.url().includes('/api/v1/articles') &&
        resp.request().method() === 'GET' &&
        resp.ok(),
      { timeout: 30_000 },
    )
    .catch(() => {});

  const input = page.getByTestId('e2e-tontine-delivery-article-search');
  await input.click();

  const namePart = searchHint.includes(':')
    ? searchHint.split(':').slice(1).join(':').trim()
    : searchHint.trim();
  const searchTerms = [
    String(articleId),
    namePart,
    namePart.split(/\s+/).filter(Boolean)[0] ?? '',
    searchHint.trim(),
  ].filter((term, index, all) => term.length >= 2 && all.indexOf(term) === index);

  for (const term of searchTerms) {
    await input.fill('');
    await input.pressSequentially(term, { delay: 40 });
    await page.waitForTimeout(450);

    const option = page.locator(
      `.cdk-overlay-container mat-option[data-article-id="${articleId}"]`,
    );
    if (await option.isVisible({ timeout: 5000 }).catch(() => false)) {
      await option.click();
      return;
    }
  }

  throw new Error(
    `Article tontine ${articleId} introuvable dans l'autocomplete (hint: ${searchHint})`,
  );
}

/** Sélectionne le premier résultat d'un `mat-autocomplete` identifié par `data-testid`. */
export async function selectMatAutocompleteFirstOption(
  page: Page,
  inputTestId: string,
  searchText: string,
): Promise<void> {
  const input = page.getByTestId(inputTestId);
  await input.click();
  await input.fill('');
  const term = searchText.trim().length >= 2 ? searchText.trim() : `${searchText.trim()}__`.slice(0, 2);
  await input.pressSequentially(term, { delay: 50 });
  const options = page.locator('.cdk-overlay-container mat-option');
  await expect(options.first()).toBeVisible({ timeout: 25_000 });

  const distinctPart = searchText.includes(':')
    ? searchText.split(':').slice(1).join(':').trim()
    : searchText.trim();

  let option = options.filter({ hasText: searchText });
  if ((await option.count()) === 0 && distinctPart) {
    option = options.filter({ hasText: distinctPart });
  }
  if ((await option.count()) === 0) {
    option = options.first();
  }
  await option.first().click();
}

/** Vérifie qu'un KPI « count (montant) » affiche un compteur strictement positif. */
export async function expectKpiCountPositive(kpi: Locator): Promise<void> {
  await expect(kpi).toBeVisible();
  const text = (await kpi.innerText()).replace(/\s+/g, ' ');
  const countMatch = text.match(/(\d+)\s*\(/);
  expect(countMatch, `Format KPI inattendu : ${text}`).not.toBeNull();
  expect(Number(countMatch![1])).toBeGreaterThan(0);
}

function stockReturnRowLocator(page: Page, collector: string, status: string): Locator {
  return page.locator(
    `[data-testid="e2e-stock-return-row"][data-collector="${collector}"][data-status="${status}"]`,
  );
}

export async function findStockReturnRow(
  page: Page,
  collector: string,
  status = 'CREATED',
): Promise<Locator> {
  await page.goto('/stock/return');
  await page.locator('ngx-spinner').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});

  for (let pageIndex = 0; pageIndex < 10; pageIndex++) {
    const row = stockReturnRowLocator(page, collector, status);
    if (await row.isVisible({ timeout: 2000 }).catch(() => false)) {
      return row;
    }
    const nextBtn = page.getByRole('button', { name: 'Next page' });
    if (!(await nextBtn.isEnabled().catch(() => false))) {
      break;
    }
    await nextBtn.click();
  }

  return stockReturnRowLocator(page, collector, status);
}

function stockTontineRequestRowLocator(page: Page, reference: string): Locator {
  return page.locator(
    `[data-testid="e2e-stock-tontine-request-row"][data-reference="${reference}"]`,
  );
}

export async function findStockTontineRequestRow(page: Page, reference: string): Promise<Locator> {
  await page.goto('/stock-tontine/request');
  await page.locator('ngx-spinner').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});

  for (let pageIndex = 0; pageIndex < 15; pageIndex++) {
    const row = stockTontineRequestRowLocator(page, reference);
    if (await row.isVisible({ timeout: 2000 }).catch(() => false)) {
      return row;
    }
    const nextBtn = page.getByRole('button', { name: 'Next page' });
    if (!(await nextBtn.isEnabled().catch(() => false))) {
      break;
    }
    await nextBtn.click();
  }

  return stockTontineRequestRowLocator(page, reference);
}

export async function openSidebarSubmenu(page: Page, parentTestId: string): Promise<void> {
  await page.getByTestId(parentTestId).click();
}
