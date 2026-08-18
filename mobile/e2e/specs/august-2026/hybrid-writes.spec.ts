import { test, expect, Page, Locator } from '@playwright/test';
import { loginAsCommercialLive } from '../../fixtures/live-auth';
import { startBackend, stopBackend, waitForBackend } from '../../fixtures/backend-lifecycle';
import {
  backToCommercialTabs,
  closeTontineReceipt,
  openTontineDashboard,
  recordTontineCollection,
} from '../../fixtures/tontine-ops';
import { assertTontineCollectionOnBackend } from '../../fixtures/tontine-api';

test.describe.configure({ mode: 'serial' });

function listenCollectionPostStatuses(page: Page, sink: number[]): void {
  page.on('response', (response) => {
    if (response.request().method() !== 'POST') {
      return;
    }
    if (!/\/api\/v1\/tontines\/collections/.test(response.url())) {
      return;
    }
    sink.push(response.status());
  });
}

function successfulPosts(statuses: number[]): number[] {
  return statuses.filter((status) => status >= 200 && status < 300);
}

async function refreshConnectivityCache(page: Page): Promise<void> {
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForTimeout(1_500);
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

async function openTontineCollectionsSyncTab(page: Page): Promise<void> {
  await page.locator('.loading-container').waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
  const tab = page.getByTestId('e2e-sync-tab-tontine-collections');
  await tab.evaluate((button) => (button as HTMLElement).click());
  const panel = page.getByTestId('e2e-sync-panel-tontine-collections');
  if (await panel.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await page.locator('.loading-container').waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
    return;
  }
  await page.waitForTimeout(1_000);
}

async function expectPendingTontineCollections(page: Page): Promise<void> {
  await openTontineCollectionsSyncTab(page);
  await expect(page.getByText(/Collecte -/)).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('ion-button.sync-button').first()).toBeAttached({ timeout: 10_000 });
}

async function clickIonic(locator: Locator): Promise<void> {
  await locator.evaluate((host) => {
    const native = host.shadowRoot?.querySelector('button, input, a') ?? host;
    native.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
  });
}

async function syncPendingTontineCollections(page: Page): Promise<void> {
  await openTontineCollectionsSyncTab(page);
  await expect(page.getByText(/Collecte -/)).toBeVisible({ timeout: 20_000 });
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

test.describe('Collecte tontine hybrid @p0 @mobile @august-2026 @regression', () => {
  test.afterAll(async () => {
    await startBackend();
  });

  test('M-P0-01 collecte online : un POST collections 2xx', async ({ page }) => {
    await waitForBackend(true, 180_000);
    const posts: number[] = [];
    listenCollectionPostStatuses(page, posts);

    await loginAsCommercialLive(page);
    await recordTontineCollection(page);
    await expect(page.getByTestId('e2e-tontine-receipt-offline')).toHaveCount(0);
    await closeTontineReceipt(page);

    expect(successfulPosts(posts).length, `POST collections statuses=${posts.join(',')}`).toBe(1);
  });

  test('M-P0-02 collecte offline puis un POST à la reconnexion', async ({ page }) => {
    test.setTimeout(420_000);
    await waitForBackend(true, 180_000);

    await loginAsCommercialLive(page);
    await openTontineDashboard(page);
    await expect(page.locator('.member-card').first()).toBeVisible({ timeout: 90_000 });

    await stopBackend();
    await waitForBackend(false, 30_000);
    await refreshConnectivityCache(page);

    const posts: number[] = [];
    listenCollectionPostStatuses(page, posts);

    const amount = 2100 + (Date.now() % 800);
    await recordTontineCollection(page, {
      amount,
      notes: `E2E-M-P0-02-${amount}`,
    });
    await expect(page.getByTestId('e2e-tontine-receipt-offline')).toBeVisible({ timeout: 30_000 });
    await closeTontineReceipt(page);
    expect(successfulPosts(posts), `aucun POST 2xx tant que le backend est arrêté (statuses=${posts.join(',')})`).toHaveLength(0);

    await backToCommercialTabs(page);
    await openManualSync(page);
    await expectPendingTontineCollections(page);

    await startBackend();
    await waitForBackend(true, 180_000);
    await refreshConnectivityCache(page);
    await page.waitForTimeout(2_000);

    await syncPendingTontineCollections(page);
    await expect
      .poll(() => successfulPosts(posts).length, { timeout: 60_000 })
      .toBe(1);

    await assertTontineCollectionOnBackend(amount);
  });
});
