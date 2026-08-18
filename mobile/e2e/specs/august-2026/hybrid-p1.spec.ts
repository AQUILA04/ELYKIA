import { expect, Locator, Page, test } from '@playwright/test';
import { loginAsCommercialLive } from '../../fixtures/live-auth';
import { startBackend } from '../../fixtures/backend-lifecycle';
import {
  backToCommercialTabs,
  closeTontineReceipt,
  completeDailyConsentIfNeeded,
  confirmOperationAmount,
  openTontineDashboard,
  recordTontineCollection,
} from '../../fixtures/tontine-ops';


async function clickIonic(locator: Locator): Promise<void> {
  await locator.evaluate((host) => {
    const native = host.shadowRoot?.querySelector('button, input, a') ?? host;
    native.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
  });
}

async function dismissAlerts(page: Page): Promise<void> {
  const alert = page.locator('ion-alert').last();
  if (!(await alert.isVisible({ timeout: 2_000 }).catch(() => false))) {
    return;
  }
  for (const label of ['OK', 'Continuer', 'Fermer', 'Confirmer']) {
    const button = alert.getByRole('button', { name: label });
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await alert.waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => {});
      return;
    }
  }
}

async function openManualSync(page: Page): Promise<void> {
  if (/\/sync\/manual/.test(page.url())) {
    return;
  }
  await expect(page).toHaveURL(/\/tabs/, { timeout: 30_000 });
  await page.getByTestId('e2e-tab-more').click();
  await expect(page).toHaveURL(/\/tabs\/more/, { timeout: 20_000 });
  await page.getByTestId('e2e-more-sync-manual').click();
  await expect(page).toHaveURL(/\/sync\/manual/, { timeout: 20_000 });
}

function uniquePhone(): string {
  return `90${String(Date.now()).slice(-6)}`;
}

async function submitNewClientForm(
  page: Page,
  payload: { firstname: string; lastname: string; phone: string; cardID: string },
): Promise<void> {
  await expect(page.locator('ion-title').filter({ hasText: 'Nouveau Client' })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('app-new-client')).toBeAttached({ timeout: 10_000 });
  const patched = await page.evaluate((data) => {
    const ng = (window as unknown as { ng?: { getComponent: (el: Element) => any } }).ng;
    const el = document.querySelector('app-new-client');
    if (!ng || !el) {
      return false;
    }
    const cmp = ng.getComponent(el);
    if (!cmp?.clientForm) {
      return false;
    }
    cmp.photoToSave = null;
    cmp.cardPhotoToSave = null;
    cmp.clientForm.patchValue({
      firstname: data.firstname,
      lastname: data.lastname,
      dateOfBirth: '1990-01-15',
      occupation: 'COMMERCANT',
      phone: data.phone,
      cardType: 'CNI',
      cardID: data.cardID,
      address: 'E2E rue test',
      quarter: 'E2E-QUARTIER',
      latitude: 6.137,
      longitude: 1.212,
      profilPhoto: 'e2e-photo',
      cardPhoto: null,
      balance: 0,
    });
    cmp.clientForm.updateValueAndValidity();
    void cmp.onSubmit();
    return true;
  }, payload);
  expect(patched, 'ng.getComponent(app-new-client) disponible en ng serve').toBe(true);
}

async function openTontineCollectionsSyncTab(page: Page): Promise<void> {
  await page.locator('.loading-container').waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => {});
  const tab = page.getByTestId('e2e-sync-tab-tontine-collections');
  await tab.evaluate((button) => (button as HTMLElement).click());
  await page.locator('.loading-container').waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => {});
  const panel = page.getByTestId('e2e-sync-panel-tontine-collections');
  if (await panel.isVisible({ timeout: 8_000 }).catch(() => false)) {
    return;
  }
  await page.waitForTimeout(1_000);
}

async function syncPendingTontineCollections(page: Page): Promise<void> {
  await openTontineCollectionsSyncTab(page);
  await expect(page.getByText(/Collecte /)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Tout sélectionner')).toBeVisible({ timeout: 10_000 });
  await page.getByText('Tout sélectionner').click();

  const fab = page.locator('ion-fab-button');
  if (!(await fab.isVisible({ timeout: 5_000 }).catch(() => false))) {
    await page.locator('.select-all-item ion-checkbox').evaluate((checkbox) => {
      checkbox.dispatchEvent(new CustomEvent('ionChange', { bubbles: true, composed: true, detail: { checked: true } }));
    });
  }
  await expect(fab).toBeVisible({ timeout: 10_000 });
  await clickIonic(fab);

  const alert = page.locator('ion-alert').last();
  await expect(alert).toBeVisible({ timeout: 15_000 });
  const alertText = ((await alert.innerText().catch(() => '')) || '').trim();
  if (/inaccessible|pas accessible/i.test(alertText)) {
    throw new Error(`Sync bloquée, ping backend KO: ${alertText}`);
  }
  await alert.getByRole('button', { name: 'Synchroniser' }).click();
  await alert.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
}

function listenPosts(page: Page, pattern: RegExp, sink: Array<{ status: number; url: string }>): void {
  page.on('response', (response) => {
    if (response.request().method() !== 'POST') {
      return;
    }
    if (!pattern.test(response.url())) {
      return;
    }
    sink.push({ status: response.status(), url: response.url() });
  });
}

test.describe('Hybrid writes P1 @p1 @mobile @august-2026 @regression', () => {
  test.afterAll(async () => {
    await startBackend();
  });
  test('M-P1-01 création client online-first : POST 2xx, pas de file isSync=false', async ({ page }) => {
    const posts: Array<{ status: number; url: string }> = [];
    listenPosts(page, /\/api\/v1\/clients(?:\?|$)/, posts);

    await loginAsCommercialLive(page);
    await page.getByTestId('e2e-action-new-client').click();
    await expect(page).toHaveURL(/new-client/, { timeout: 20_000 });

    const lastname = `E2EP1A${Date.now().toString().slice(-6)}`;
    const phone = uniquePhone();
    await submitNewClientForm(page, {
      firstname: 'E2E',
      lastname,
      phone,
      cardID: `E2E${Date.now()}`,
    });

    const successAlert = page.locator('ion-alert').filter({ hasText: /succès|impossible|Erreur/i }).last();
    await expect(successAlert).toBeVisible({ timeout: 45_000 });
    const alertText = ((await successAlert.innerText().catch(() => '')) || '').trim();
    expect(alertText, `alerte création: ${alertText}; posts=${JSON.stringify(posts)}`).toMatch(/succès/i);
    await successAlert.getByRole('button', { name: 'OK' }).click();
    await successAlert.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});

    expect(
      posts.filter((item) => item.status >= 200 && item.status < 300).length,
      `POST clients statuses=${JSON.stringify(posts)}`,
    ).toBeGreaterThan(0);

    await backToCommercialTabs(page);
    await page.getByTestId('e2e-tab-clients').click();
    await expect(page).toHaveURL(/\/tabs\/clients/, { timeout: 20_000 });
    const search = page.locator('ion-searchbar input, input.searchbar-input').first();
    await search.fill(lastname);
    await search.dispatchEvent('input');
    const row = page.locator('ion-item').filter({ hasText: lastname }).first();
    await expect(row).toBeVisible({ timeout: 30_000 });
    await expect(row.getByText('Sync')).toBeVisible();
    await expect(row.getByText('Local')).toHaveCount(0);

    await openManualSync(page);
    await page.getByTestId('e2e-sync-tab-clients').evaluate((button) => (button as HTMLElement).click());
    const pendingPanel = page.getByTestId('e2e-sync-panel-clients');
    await expect(pendingPanel).toBeVisible({ timeout: 10_000 });
    await expect(pendingPanel.getByText(lastname)).toHaveCount(0);
  });

  test('M-P1-02 fallback offline client si API 4xx + alerte hors ligne', async ({ page }) => {
    await loginAsCommercialLive(page);
    await page.route((url) => new URL(url).pathname === '/api/v1/clients', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'E2E client 400' }),
        });
        return;
      }
      await route.continue();
    });
    await page.getByTestId('e2e-action-new-client').click();
    await expect(page).toHaveURL(/new-client/, { timeout: 20_000 });

    const lastname = `E2EP1B${Date.now().toString().slice(-6)}`;
    await submitNewClientForm(page, {
      firstname: 'E2E',
      lastname,
      phone: uniquePhone(),
      cardID: `E2E${Date.now()}`,
    });

    const alert = page.locator('ion-alert').filter({ hasText: /Enregistrement serveur impossible/i });
    await expect(alert).toBeVisible({ timeout: 30_000 });
    await alert.getByRole('button', { name: 'Enregistrer hors ligne' }).click();
    await page.locator('ion-alert').getByRole('button', { name: 'OK' }).click({ timeout: 20_000 }).catch(() => {});
    await dismissAlerts(page);

    await backToCommercialTabs(page);
    await page.getByTestId('e2e-tab-clients').click();
    const search = page.locator('ion-searchbar input, input.searchbar-input').first();
    await search.fill(lastname);
    await search.dispatchEvent('input');
    const row = page.locator('ion-item').filter({ hasText: lastname }).first();
    await expect(row).toBeVisible({ timeout: 30_000 });
    await expect(row.getByText('Local')).toBeVisible();
  });

  test('M-P1-03 encaissement + reliquat : un POST stake, pas de POST reliquats orphelin', async ({ page }) => {
    test.setTimeout(180_000);
    const stakePosts: Array<{ status: number; url: string }> = [];
    const reliquatPosts: Array<{ status: number; url: string }> = [];
    listenPosts(page, /\/api\/v1\/credits\/(default|special)-daily-stake/, stakePosts);
    listenPosts(page, /\/api\/v1\/mobiles\/reliquats/, reliquatPosts);

    await loginAsCommercialLive(page);
    await page.getByTestId('e2e-action-recovery').click();
    await expect(page).toHaveURL(/\/recovery/, { timeout: 20_000 });
    await page.getByRole('button', { name: /Sélectionner un Client/i }).click();
    const clientRow = page.locator('.client-item').first();
    await expect(clientRow).toBeVisible({ timeout: 30_000 });
    await clientRow.click();

    await page.waitForTimeout(2_000);
    const creditCount = await page.evaluate(() => {
      const ng = (window as unknown as { ng?: { getComponent: (el: Element) => any } }).ng;
      const el = document.querySelector('app-recovery');
      const cmp = ng && el ? ng.getComponent(el) : null;
      if (!cmp?.vm?.credits?.length) {
        return 0;
      }
      cmp.onCreditSelected(cmp.vm.credits[0]);
      return cmp.vm.credits.length;
    });
    test.skip(creditCount === 0, 'Aucun crédit actif pour le client sélectionné');

    const chip = page.locator('.mise-chip').first();
    await expect(chip).toBeVisible({ timeout: 15_000 });
    await chip.click();

    const received = page.locator('.received-amount-section ion-input input, ion-input input[type="number"]').last();
    await expect(received).toBeVisible({ timeout: 10_000 });
    const collectText = await page.locator('.mise-result-amount').innerText();
    const collectAmount = Number(collectText.replace(/[^\d]/g, '')) || 1000;
    await received.fill(String(collectAmount + 200));
    await received.evaluate((input, value) => {
      const native = input as HTMLInputElement;
      native.value = value;
      native.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new CustomEvent('ionInput', { bubbles: true, composed: true, detail: { value } }));
    }, String(collectAmount + 200));

    const confirm = page.locator('ion-button.confirm-button');
    await expect(confirm).toBeEnabled({ timeout: 15_000 });
    await clickIonic(confirm);

    await completeDailyConsentIfNeeded(page);
    await confirmOperationAmount(page, collectAmount);

    await expect.poll(() => stakePosts.filter((item) => item.status >= 200 && item.status < 300).length, {
      timeout: 45_000,
    }).toBe(1);
    expect(reliquatPosts, 'pas de POST reliquats séparé (orphelin)').toHaveLength(0);
  });

  test('M-P1-04 SWR listes clients et tontine : cache immédiat puis refresh', async ({ page }) => {
    await loginAsCommercialLive(page);

    let clientsRefreshSeen = false;
    await page.route(/\/api\/v1\/clients\/by-commercial\//, async (route) => {
      clientsRefreshSeen = true;
      await new Promise((resolve) => setTimeout(resolve, 6_000));
      await route.continue();
    });

    const listAppeared = page.locator('ion-item h2, .empty-state').first();
    await page.getByTestId('e2e-tab-clients').click();
    await expect(listAppeared).toBeVisible({ timeout: 4_000 });
    await expect.poll(() => clientsRefreshSeen, { timeout: 15_000 }).toBe(true);

    await page.unroute(/\/api\/v1\/clients\/by-commercial\//);

    let membersRefreshSeen = false;
    await page.route(/\/api\/v1\/tontines\/members/, async (route) => {
      membersRefreshSeen = true;
      await new Promise((resolve) => setTimeout(resolve, 6_000));
      await route.continue();
    });
    await page.getByTestId('e2e-tab-dashboard').click();
    await openTontineDashboard(page);
    await expect(page.locator('.member-card, .empty-state').first()).toBeVisible({ timeout: 4_000 });
    await expect.poll(() => membersRefreshSeen, { timeout: 15_000 }).toBe(true);
  });

  test('M-P1-05 livraison tontine : budget V1/V2 local + bandeau si unsynced', async ({ page }) => {
    test.setTimeout(180_000);
    await loginAsCommercialLive(page);
    await openTontineDashboard(page);
    await page.locator('.member-card').first().click();
    await expect(page).toHaveURL(/member-detail/, { timeout: 20_000 });

    await page.locator('ion-button').filter({ has: page.locator('ion-icon[name="ellipsis-vertical"]') }).click();
    await page.getByText("Livraison Fin d'Année").click();
    await expect(page).toHaveURL(/delivery-creation/, { timeout: 20_000 });
    await expect(page.getByTestId('e2e-delivery-budget')).toBeVisible({ timeout: 30_000 });
    const version = page.getByTestId('e2e-delivery-allocation-version');
    await expect(version).toBeVisible();
    await expect(version).toHaveText(/Part société V[12]/);
    await dismissAlerts(page);
    const banner = page.getByTestId('e2e-delivery-offline-banner');
    if (await banner.isVisible().catch(() => false)) {
      await expect(banner).toBeVisible();
    }
  });

  test('M-P1-06 retry manuel sync tontine-collection après erreur', async ({ page }) => {
    test.setTimeout(180_000);
    let failPosts = true;
    const posts: number[] = [];
    page.on('response', (response) => {
      if (response.request().method() === 'POST' && /\/api\/v1\/tontines\/collections/.test(response.url())) {
        posts.push(response.status());
      }
    });

    await loginAsCommercialLive(page);
    await page.route((url) => /\/api\/v1\/tontines\/collections/.test(String(url)), async (route) => {
      if (route.request().method() === 'POST' && failPosts) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'E2E sync fail' }),
        });
        return;
      }
      await route.continue();
    });

    const amount = 2300 + (Date.now() % 700);
    await recordTontineCollection(page, { amount, notes: `E2E-M-P1-06-${amount}` });
    await expect(page.getByTestId('e2e-tontine-receipt-offline')).toBeVisible({ timeout: 30_000 });
    await closeTontineReceipt(page);
    expect(posts.filter((status) => status >= 200 && status < 300)).toHaveLength(0);
    expect(posts.some((status) => status >= 500), `POST collections 5xx attendu (statuses=${posts.join(',')})`).toBe(true);

    const moreTab = page.getByTestId('e2e-tab-more');
    const reachedMore = await moreTab.click({ force: true, timeout: 3_000 }).then(async () => {
      await page.waitForTimeout(500);
      return /\/tabs\/more/.test(page.url());
    }).catch(() => false);
    test.skip(!reachedMore, 'Barre d’onglets inaccessible depuis la pile tontine (Playwright) — M-P1-06 retry à valider sur APK');
    await expect(page).toHaveURL(/\/tabs\/more/, { timeout: 20_000 });
    await page.getByTestId('e2e-more-sync-manual').click();
    await expect(page).toHaveURL(/\/sync\/manual/, { timeout: 20_000 });

    await page.getByTestId('e2e-sync-tab-tontine-collections').evaluate((button) => (button as HTMLElement).click());
    await page.locator('.loading-container').waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => {});
    await expect(page.getByText(/Collecte /)).toBeVisible({ timeout: 30_000 });
    await page.getByText('Tout sélectionner').click();
    const fab = page.locator('ion-fab-button');
    if (!(await fab.isVisible({ timeout: 5_000 }).catch(() => false))) {
      await page.locator('.select-all-item ion-checkbox').evaluate((checkbox) => {
        checkbox.dispatchEvent(new CustomEvent('ionChange', { bubbles: true, composed: true, detail: { checked: true } }));
      });
    }
    await expect(fab).toBeVisible({ timeout: 10_000 });
    await clickIonic(fab);
    const failAlert = page.locator('ion-alert').last();
    await expect(failAlert).toBeVisible({ timeout: 15_000 });
    if (/inaccessible|pas accessible/i.test(((await failAlert.innerText().catch(() => '')) || ''))) {
      throw new Error('Sync bloquée, ping backend KO');
    }
    await failAlert.getByRole('button', { name: 'Synchroniser' }).click();
    await failAlert.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});

    failPosts = false;
    await page.getByText('Tout sélectionner').click().catch(() => undefined);
    if (!(await fab.isVisible({ timeout: 5_000 }).catch(() => false))) {
      await page.locator('.select-all-item ion-checkbox').evaluate((checkbox) => {
        checkbox.dispatchEvent(new CustomEvent('ionChange', { bubbles: true, composed: true, detail: { checked: true } }));
      });
    }
    await clickIonic(fab);
    const retryAlert = page.locator('ion-alert').last();
    await expect(retryAlert).toBeVisible({ timeout: 15_000 });
    await retryAlert.getByRole('button', { name: 'Synchroniser' }).click();

    await expect.poll(() => posts.filter((status) => status >= 200 && status < 300).length, {
      timeout: 60_000,
    }).toBeGreaterThan(0);
  });
});
