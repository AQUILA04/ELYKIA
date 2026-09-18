import { expect, Page, Request } from '@playwright/test';
import { test } from '../fixtures/offline-test';
import { openTontineDashboard, closeTontineReceipt } from '../fixtures/tontine-ops';

test.describe.configure({ mode: 'serial' });

async function completeMockDailyConsentIfNeeded(page: Page): Promise<void> {
  const modal = page
    .locator('ion-modal')
    .filter({ hasText: /Démarrage des opérations|mot de passe de connexion/i })
    .last();
  if (!(await modal.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return;
  }

  const passwordInput = modal.locator('ion-input input:not([type="checkbox"]), input.native-input:not([type="checkbox"])').last();
  await passwordInput.waitFor({ state: 'visible', timeout: 15_000 });
  await passwordInput.fill('password');
  await passwordInput.dispatchEvent('input');
  await modal.getByRole('button', { name: 'Continuer' }).click();

  const challenge = modal.locator('.challenge-code');
  await expect(challenge).toBeVisible({ timeout: 15_000 });
  const code = ((await challenge.innerText()) ?? '').trim();
  expect(code.length).toBeGreaterThan(3);

  const codeInput = modal.locator('ion-input input:not([type="checkbox"]), input.native-input:not([type="checkbox"])').last();
  await codeInput.fill(code);
  await codeInput.dispatchEvent('input');
  await modal.locator('ion-checkbox').click();
  await modal.getByRole('button', { name: /Démarrer mes opérations/ }).click();
  await expect(modal).toBeHidden({ timeout: 20_000 });
}

async function openMemberByName(page: Page, name: RegExp): Promise<void> {
  await openTontineDashboard(page);
  const card = page.locator('.member-card').filter({ hasText: name }).first();
  await expect(card).toBeVisible({ timeout: 60_000 });
  await card.click();
  await expect(page).toHaveURL(/member-detail/, { timeout: 20_000 });
}

async function openDeliveryCreation(page: Page): Promise<void> {
  await page.locator('ion-button').filter({ has: page.locator('ion-icon[name="ellipsis-vertical"]') }).click();
  await page.getByText("Livraison Fin d'Année").click();
  await expect(page).toHaveURL(/delivery-creation/, { timeout: 20_000 });
  await expect(page.getByTestId('e2e-delivery-budget')).toBeVisible({ timeout: 30_000 });
}

async function selectFirstArticle(page: Page): Promise<void> {
  const article = page.locator('.article-card').first();
  await expect(article).toBeVisible({ timeout: 30_000 });
  await article.locator('.qty-btn').filter({ has: page.locator('ion-icon[name="add"]') }).click();
  await expect(page.getByTestId('e2e-tontine-delivery-validate')).toBeEnabled({ timeout: 10_000 });
}

function trackApi(page: Page, matcher: (url: string, method: string) => boolean): Request[] {
  const hits: Request[] = [];
  page.on('request', (request) => {
    if (matcher(request.url(), request.method())) {
      hits.push(request);
    }
  });
  return hits;
}

test.describe('Tontine delivery order vs direct @smoke', () => {
  test('S1 direct delivery posts distribute and shows DELIVERED', async ({ authenticatedPage: page }) => {
    test.setTimeout(180_000);
    const distributePosts = trackApi(
      page,
      (url, method) => method === 'POST' && /\/api\/v1\/tontines\/deliveries\/distribute/.test(url)
    );
    const orderPosts = trackApi(
      page,
      (url, method) => method === 'POST' && /\/api\/v1\/tontines\/deliveries(?:\?|$)/.test(url)
    );

    await openMemberByName(page, /BOBO DIOUF/i);
    await openDeliveryCreation(page);
    await selectFirstArticle(page);

    await page.getByTestId('e2e-tontine-delivery-validate').click();
    await expect(page.locator('ion-action-sheet')).toBeVisible({ timeout: 10_000 });
    await page.locator('ion-action-sheet button, button').filter({ hasText: 'Livraison directe' }).first().click();
    await expect(page.locator('ion-alert').filter({ hasText: /Confirmer la livraison/i })).toBeVisible({
      timeout: 10_000,
    });
    await page.locator('ion-alert button').filter({ hasText: 'Confirmer' }).click();
    await completeMockDailyConsentIfNeeded(page);

    await expect.poll(() => distributePosts.length, { timeout: 45_000 }).toBeGreaterThan(0);
    expect(orderPosts.length, 'direct delivery must not POST /deliveries (order create)').toBe(0);

    await closeTontineReceipt(page).catch(async () => {
      // Receipt may already be dismissed if navigation raced; fall through to dashboard check.
      await page.locator('ion-alert button').filter({ hasText: 'OK' }).click({ timeout: 3_000 }).catch(() => {});
    });

    await openMemberByName(page, /BOBO DIOUF/i);
    await expect(page.getByTestId('e2e-tontine-member-delivery-status')).toContainText(/Livr/i, {
      timeout: 20_000,
    });
  });

  test('S2 order then mark delivered posts create then deliver', async ({ authenticatedPage: page }) => {
    test.setTimeout(180_000);
    const orderPosts = trackApi(
      page,
      (url, method) => method === 'POST' && /\/api\/v1\/tontines\/deliveries(?:\?|$)/.test(url)
    );
    const distributePosts = trackApi(
      page,
      (url, method) => method === 'POST' && /\/api\/v1\/tontines\/deliveries\/distribute/.test(url)
    );
    const deliverPatches = trackApi(
      page,
      (url, method) => method === 'PATCH' && /\/api\/v1\/tontines\/deliveries\/\d+\/deliver/.test(url)
    );

    await openMemberByName(page, /VITOR NOUHNA/i);
    await openDeliveryCreation(page);
    await selectFirstArticle(page);

    await page.getByTestId('e2e-tontine-delivery-validate').click();
    await expect(page.locator('ion-action-sheet')).toBeVisible({ timeout: 10_000 });
    await page.locator('ion-action-sheet button, button').filter({ hasText: /^Commande$/ }).first().click();
    await expect(page.locator('ion-alert').filter({ hasText: /Confirmer la commande/i })).toBeVisible({
      timeout: 10_000,
    });
    await page.locator('ion-alert button').filter({ hasText: 'Confirmer' }).click();
    await completeMockDailyConsentIfNeeded(page);

    await expect.poll(() => orderPosts.length, { timeout: 45_000 }).toBeGreaterThan(0);
    expect(distributePosts.length, 'order create must not POST /distribute').toBe(0);

    await expect(page.locator('ion-alert').filter({ hasText: /Commande enregistrée/i })).toBeVisible({
      timeout: 30_000,
    });
    await page.locator('ion-alert button').filter({ hasText: 'OK' }).click();

    await openMemberByName(page, /VITOR NOUHNA/i);
    await expect(page.getByTestId('e2e-tontine-member-delivery-status')).toContainText(/Commande/i, {
      timeout: 20_000,
    });
    await expect(page.getByTestId('e2e-tontine-mark-delivered')).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('e2e-tontine-mark-delivered').click();
    await expect(page.locator('ion-alert').filter({ hasText: /Marquer comme livré/i })).toBeVisible({
      timeout: 10_000,
    });
    await page.locator('ion-alert button').filter({ hasText: 'Livrer' }).click();
    await completeMockDailyConsentIfNeeded(page);

    await expect.poll(() => deliverPatches.length, { timeout: 45_000 }).toBeGreaterThan(0);
    await expect(page.getByTestId('e2e-tontine-member-delivery-status')).toContainText(/Livr/i, {
      timeout: 20_000,
    });
  });
});
