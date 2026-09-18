import { expect, Locator, Page, Request } from '@playwright/test';
import { test } from '../fixtures/offline-test';

test.describe.configure({ mode: 'serial' });

async function fillIonModalInput(modal: Locator, value: string, inputId?: string): Promise<void> {
  const input = inputId
    ? modal.locator(`ion-input#${inputId} input.native-input, ion-input#${inputId} input`).first()
    : modal.locator('ion-input input:not([type="checkbox"]), input.native-input:not([type="checkbox"])').last();
  await input.waitFor({ state: 'visible', timeout: 20_000 });
  await input.click();
  await input.fill('');
  await input.fill(value);
  await input.dispatchEvent('input');
  await input.dispatchEvent('change');
  await input.blur();
  // ion-input ngModel listens to ionInput more reliably than native input events alone.
  await modal.locator(inputId ? `ion-input#${inputId}` : 'ion-input').last().evaluate((el, nextValue) => {
    (el as HTMLIonInputElement).value = nextValue;
    el.dispatchEvent(new CustomEvent('ionInput', { detail: { value: nextValue }, bubbles: true }));
  }, value);
}

async function completeMockDailyConsentIfNeeded(page: Page, required = false): Promise<void> {
  const modal = page
    .locator('ion-modal')
    .filter({ hasText: /Démarrage des opérations|mot de passe de connexion/i })
    .last();
  const visible = await modal.isVisible({ timeout: required ? 20_000 : 5_000 }).catch(() => false);
  if (!visible) {
    if (required) {
      throw new Error('Daily consent modal expected but not visible');
    }
    return;
  }

  await fillIonModalInput(modal, 'password', 'consent-password');
  await modal.getByRole('button', { name: 'Continuer' }).click({ force: true });

  const challenge = modal.locator('.challenge-code');
  await expect(challenge).toBeVisible({ timeout: 15_000 });
  const code = ((await challenge.innerText()) ?? '').trim();
  expect(code.length).toBeGreaterThan(3);

  await fillIonModalInput(modal, code, 'consent-code');
  const checkbox = modal.locator('ion-checkbox');
  await checkbox.click({ force: true });
  await modal.getByRole('button', { name: /Démarrer mes opérations/ }).click({ force: true });
  await expect(modal).toBeHidden({ timeout: 20_000 });
}

async function chooseDeliveryMode(page: Page, mode: 'DIRECT' | 'ORDER'): Promise<void> {
  await expect(page.getByTestId('e2e-tontine-delivery-validate')).toBeEnabled({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Valider' }).click();

  const label = mode === 'DIRECT' ? 'Livraison directe' : 'Commande';
  // Ionic action-sheet buttons are exposed as role=button in the a11y tree.
  await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: label, exact: true }).click();

  const confirmHeader = mode === 'DIRECT' ? /Confirmer la livraison/i : /Confirmer la commande/i;
  const alert = page.locator('ion-alert').filter({ hasText: confirmHeader });
  await expect(alert).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
  await expect(alert).toBeHidden({ timeout: 15_000 });
  // First financial write of the day shows daily consent; later writes skip it.
  await completeMockDailyConsentIfNeeded(page, false);
}

async function goToTontineDashboard(page: Page): Promise<void> {
  if (/\/tontine\/dashboard/.test(page.url())) {
    await expect(page.getByTestId('e2e-tontine-dashboard-title')).toBeVisible({ timeout: 15_000 });
    return;
  }

  if (/\/tabs\/dashboard/.test(page.url())) {
    await page.getByTestId('e2e-action-tontine').click();
  } else if (/\/tabs\//.test(page.url())) {
    await page.getByTestId('e2e-tab-dashboard').evaluate((el: HTMLElement) => el.click());
    await expect(page).toHaveURL(/\/tabs\/dashboard/, { timeout: 15_000 });
    await page.getByTestId('e2e-action-tontine').click();
  } else {
    // Prefer history.back() — Ionic overlay/router-outlet often intercepts header back clicks.
    for (let attempt = 0; attempt < 8 && !/\/tontine\/dashboard|\/tabs\//.test(page.url()); attempt += 1) {
      await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await page.waitForTimeout(400);
    }
    if (/\/tabs\/dashboard/.test(page.url())) {
      await page.getByTestId('e2e-action-tontine').click();
    } else if (/\/tabs\//.test(page.url())) {
      await page.getByTestId('e2e-tab-dashboard').evaluate((el: HTMLElement) => el.click());
      await expect(page).toHaveURL(/\/tabs\/dashboard/, { timeout: 15_000 });
      await page.getByTestId('e2e-action-tontine').click();
    }
  }

  await expect(page).toHaveURL(/\/tontine\/dashboard/, { timeout: 20_000 });
  await expect(page.getByTestId('e2e-tontine-dashboard-title')).toBeVisible({ timeout: 15_000 });
}

async function openMemberByName(page: Page, name: RegExp): Promise<void> {
  await goToTontineDashboard(page);
  const card = page.locator('.member-card').filter({ hasText: name }).first();
  await expect(card).toBeVisible({ timeout: 60_000 });
  await card.click();
  await expect(page).toHaveURL(/member-detail/, { timeout: 20_000 });
}

async function openDeliveryCreation(page: Page): Promise<void> {
  await page
    .locator('ion-button')
    .filter({ has: page.locator('ion-icon[name="ellipsis-vertical"]') })
    .click();
  const actionsSheet = page.locator('ion-action-sheet').filter({ hasText: 'Actions' });
  await expect(actionsSheet).toBeVisible({ timeout: 10_000 });
  await actionsSheet.getByText("Livraison Fin d'Année").click();
  await expect(page).toHaveURL(/delivery-creation/, { timeout: 20_000 });
  await expect(page.getByTestId('e2e-delivery-budget')).toBeVisible({ timeout: 30_000 });
}

async function selectFirstArticle(page: Page): Promise<void> {
  const article = page.locator('.article-card').first();
  await expect(article).toBeVisible({ timeout: 30_000 });
  // Wait until member budget is loaded (collections synced); otherwise Valider stays disabled.
  await expect
    .poll(async () => {
      const text = await page.getByTestId('e2e-delivery-budget').innerText();
      return /Total épargné[\s\S]*?[1-9]/.test(text);
    }, { timeout: 45_000 })
    .toBe(true);
  await article.locator('.qty-btn').filter({ has: page.locator('ion-icon[name="add"]') }).click();
  await expect(page.locator('.footer-summary')).toContainText(/Articles\s*1/, { timeout: 10_000 });
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

async function returnToCommercialTabs(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 12 && !/\/tabs\//.test(page.url()); attempt += 1) {
    await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await page.waitForTimeout(350);
  }
  if (!/\/tabs\//.test(page.url())) {
    // Last resort: click tontine dashboard back if present.
    const back = page.getByRole('button', { name: 'Retour' }).first();
    if (await back.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await back.click({ force: true });
    }
  }
  await expect(page).toHaveURL(/\/tabs/, { timeout: 20_000 });
}

test.describe('Tontine delivery order vs direct @smoke', () => {
  test.afterEach(async ({ authenticatedPage: page }) => {
    // Keep worker-scoped page on commercial tabs for subsequent @smoke specs.
    await returnToCommercialTabs(page).catch(() => undefined);
  });
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
    await chooseDeliveryMode(page, 'DIRECT');

    await expect.poll(() => distributePosts.length, { timeout: 45_000 }).toBeGreaterThan(0);
    expect(orderPosts.length, 'direct delivery must not POST /deliveries (order create)').toBe(0);

    // Direct delivery shows the receipt modal (title "Reçu de livraison").
    const receipt = page.locator('ion-modal').filter({ hasText: /Reçu de livraison|REÇU DE LIVRAISON/i });
    await expect(receipt).toBeVisible({ timeout: 30_000 });
    await receipt.getByRole('button', { name: 'Fermer' }).first().click();
    await expect(receipt).toBeHidden({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/tontine\/dashboard|\/tabs\/dashboard/, { timeout: 30_000 });

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
    await chooseDeliveryMode(page, 'ORDER');

    await expect.poll(() => orderPosts.length, { timeout: 45_000 }).toBeGreaterThan(0);
    expect(distributePosts.length, 'order create must not POST /distribute').toBe(0);

    await expect(page.locator('ion-alert').filter({ hasText: /Commande enregistrée/i })).toBeVisible({
      timeout: 30_000,
    });
    await page.locator('ion-alert').filter({ hasText: /Commande enregistrée/i }).getByRole('button', { name: 'OK' }).click();

    await openMemberByName(page, /VITOR NOUHNA/i);
    await expect(page.getByTestId('e2e-tontine-member-delivery-status')).toContainText(/Commande/i, {
      timeout: 20_000,
    });
    await expect(page.getByTestId('e2e-tontine-mark-delivered')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Marquer comme livré' }).click();
    const markAlert = page.locator('ion-alert').filter({ hasText: /Marquer comme livré/i });
    await expect(markAlert).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Livrer', exact: true }).click();
    await expect(markAlert).toBeHidden({ timeout: 15_000 });
    await completeMockDailyConsentIfNeeded(page, false);

    await expect.poll(() => deliverPatches.length, { timeout: 45_000 }).toBeGreaterThan(0);
    await expect(page.getByTestId('e2e-tontine-member-delivery-status')).toContainText(/Livr/i, {
      timeout: 20_000,
    });
  });
});
