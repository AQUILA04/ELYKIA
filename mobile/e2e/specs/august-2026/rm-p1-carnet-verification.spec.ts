import { expect, Page, test } from '@playwright/test';
import { loginAsRecoveryManagerLive } from '../../fixtures/live-auth';
import { clickIonic, ensureRmFieldPack } from '../../fixtures/rm-plan-ops';
import { ensureCom020InProgressTontineMember } from '../../fixtures/rm-tontine-seed';

function listenCarnetVerificationPatches(page: Page, sink: number[]): void {
  page.on('response', (response) => {
    if (response.request().method() !== 'PATCH') {
      return;
    }
    if (!/\/api\/v1\/tontines\/members\/\d+\/carnet-verification/.test(response.url())) {
      return;
    }
    sink.push(response.status());
  });
}

async function confirmIonAlert(page: Page, actionName: RegExp): Promise<void> {
  const alert = page.locator('ion-alert').last();
  await expect(alert).toBeVisible({ timeout: 10_000 });
  await alert.getByRole('button', { name: actionName }).click();
  await alert.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
}

test.describe('Vérification carnet tontine RM @p1 @mobile @rm @august-2026 @regression', () => {
  test('RM-P1-05 Terrain : vérifier un membre tontine', async ({ page }) => {
    test.setTimeout(240_000);

    const seeded = await ensureCom020InProgressTontineMember();
    expect(seeded.memberId, 'Arrange: membre tontine COM020 SESSION_INPROGRESS').toBeGreaterThan(0);

    await loginAsRecoveryManagerLive(page);
    await ensureRmFieldPack(page);

    await clickIonic(page.getByTestId('e2e-rm-tab-field'));
    await expect(page).toHaveURL(/\/rm\/field/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Terrain' })).toBeVisible();

    const verifyBtn = page.getByTestId('e2e-rm-carnet-verify').first();
    await expect(verifyBtn).toBeAttached({ timeout: 15_000 });
    const row = verifyBtn.locator('xpath=ancestor::div[contains(@class,"row")][1]');
    const alreadyVerified = (await row.getByTestId('e2e-rm-carnet-badge').count()) > 0;

    const patches: number[] = [];
    listenCarnetVerificationPatches(page, patches);

    await clickIonic(verifyBtn);
    await confirmIonAlert(page, alreadyVerified ? /^Annuler$/ : /^Vérifier$/);

    await expect(page.getByText(/Carnet vérifié|Vérification annulée/)).toBeVisible({ timeout: 20_000 });
    await expect.poll(() => patches.filter((s) => s >= 200 && s < 300).length, { timeout: 30_000 }).toBeGreaterThan(0);

    if (!alreadyVerified) {
      await expect(page.getByTestId('e2e-rm-carnet-badge').first()).toBeVisible({ timeout: 15_000 });
    }
  });
});
