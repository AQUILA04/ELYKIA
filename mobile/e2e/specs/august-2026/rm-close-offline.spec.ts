import { test, expect, Page } from '@playwright/test';
import { loginAsRecoveryManagerLive } from '../../fixtures/live-auth';
import { startBackend, stopBackend, waitForBackend } from '../../fixtures/backend-lifecycle';
import { clickIonic, ensureRmFieldPack } from '../../fixtures/rm-plan-ops';

function listenCloseCreditPosts(page: Page, sink: number[]): void {
  page.on('response', (response) => {
    if (response.request().method() !== 'POST') {
      return;
    }
    if (!/\/api\/v1\/recovery-manager\/close-credits/.test(response.url())) {
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

test.describe('Clôture RM offline @p0 @mobile @rm @august-2026 @regression', () => {
  test.afterAll(async () => {
    await startBackend();
  });

  test('RM-P0-06 clôture hors-ligne puis un POST close-credits à la sync', async ({ page }) => {
    test.setTimeout(420_000);
    await waitForBackend(true, 180_000);

    await loginAsRecoveryManagerLive(page);
    await ensureRmFieldPack(page);

    const closeOpen = page.getByTestId('e2e-rm-close-open').first();
    test.skip(!(await closeOpen.isVisible({ timeout: 20_000 }).catch(() => false)), 'Aucun retard dans le pack pour clôturer');

    await stopBackend();
    await waitForBackend(false, 30_000);
    await refreshConnectivityCache(page);

    const posts: number[] = [];
    listenCloseCreditPosts(page, posts);

    await clickIonic(closeOpen);
    await expect(page.getByText('Clôturer le retard')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('e2e-rm-close-partial').click();
    const halfChip = page.getByRole('button', { name: '½' });
    if (await halfChip.isVisible().catch(() => false)) {
      await halfChip.click();
    }
    await clickIonic(page.getByTestId('e2e-rm-close-confirm'));

    await expect(page.getByText('Clôture enregistrée hors ligne — sync ultérieure')).toBeVisible({
      timeout: 20_000,
    });
    expect(successfulPosts(posts), `aucun POST 2xx tant que le backend est arrêté (statuses=${posts.join(',')})`).toHaveLength(0);
    await expect(page.getByTestId('e2e-rm-pending-closes')).toBeVisible({ timeout: 15_000 });

    await clickIonic(page.getByTestId('e2e-rm-tab-more'));
    await expect(page).toHaveURL(/\/rm\/more/, { timeout: 20_000 });
    await expect(page.getByTestId('e2e-rm-pending-queue')).toBeVisible();
    await expect(page.getByTestId('e2e-rm-pending-close-count')).toContainText(/clôture/);

    await startBackend();
    await waitForBackend(true, 180_000);
    await refreshConnectivityCache(page);
    await page.waitForTimeout(2_000);

    await page.getByTestId('e2e-rm-more-sync').evaluate((host) => {
      const native = host.shadowRoot?.querySelector('button, a') ?? host;
      native.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
    });
    await page.locator('ion-loading').waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {});
    await expect.poll(() => successfulPosts(posts).length, { timeout: 60_000 }).toBe(1);
  });
});
