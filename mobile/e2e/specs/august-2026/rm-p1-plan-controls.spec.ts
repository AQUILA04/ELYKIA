import { test, expect, Page } from '@playwright/test';
import { loginAsRecoveryManagerLive } from '../../fixtures/live-auth';
import { clickIonic, ensureRmFieldPack, openRmPlanWizard } from '../../fixtures/rm-plan-ops';
import { ensureCom020InProgressTontineMember } from '../../fixtures/rm-tontine-seed';

async function fillIonNumber(page: Page, testId: string, value: string): Promise<void> {
  const input = page.getByTestId(testId).locator('input').first();
  await input.waitFor({ state: 'visible', timeout: 10_000 });
  await input.fill('');
  await input.fill(value);
  await input.blur();
}

function listenFieldControlPosts(page: Page, sink: number[]): void {
  page.on('response', (response) => {
    if (response.request().method() !== 'POST') {
      return;
    }
    if (!/\/api\/v1\/credits\/\d+\/field-controls/.test(response.url())) {
      return;
    }
    sink.push(response.status());
  });
}

function listenTontineControlPosts(page: Page, sink: number[]): void {
  page.on('response', (response) => {
    if (response.request().method() !== 'POST') {
      return;
    }
    if (!/\/api\/v1\/tontines\/members\/\d+\/field-controls/.test(response.url())) {
      return;
    }
    sink.push(response.status());
  });
}

test.describe('Plan et contrôles RM @p1 @mobile @rm @august-2026 @regression', () => {
  test('RM-P1-01 4e commercial désactivé + toast ; Continuer exige au moins 1', async ({ page }) => {
    test.setTimeout(180_000);
    await loginAsRecoveryManagerLive(page);
    await openRmPlanWizard(page);

    const continueBtn = page.getByTestId('e2e-rm-plan-continue');
    await expect(continueBtn).toHaveJSProperty('disabled', true);
    await expect(page.getByText(/0 \/ 3 sélectionnés/)).toBeVisible();

    await page.locator('[data-testid="e2e-rm-plan-collector"]').first().click();
    await expect(page.getByText(/1 \/ 3 sélectionnés/)).toBeVisible();
    await expect(continueBtn).toHaveJSProperty('disabled', false);

    const sizeAfterFourth = await page.evaluate(() => {
      const host = document.querySelector('app-rm-plan');
      const ng = (window as unknown as {
        ng?: { getComponent: (el: Element) => any; applyChanges?: (cmp: unknown) => void };
      }).ng;
      if (!host || !ng?.getComponent) {
        throw new Error('ng.getComponent indisponible');
      }
      const cmp = ng.getComponent(host);
      cmp.selectedCommercials = new Set(['E2E_A', 'E2E_B', 'E2E_C']);
      cmp.toggleCommercial('E2E_D');
      ng.applyChanges?.(cmp);
      return cmp.selectedCommercials.size as number;
    });
    expect(sizeAfterFourth).toBe(3);
    await expect(page.locator('ion-toast').filter({ hasText: /Maximum 3 commerciaux/i })).toBeVisible({
      timeout: 8_000,
    });
  });

  test('RM-P1-02 localités via modal multi-select + recherche', async ({ page }) => {
    test.setTimeout(180_000);
    await loginAsRecoveryManagerLive(page);
    await openRmPlanWizard(page);

    const picked = await page.evaluate(() => {
      const host = document.querySelector('app-rm-plan');
      const ng = (window as unknown as {
        ng?: { getComponent: (el: Element) => any; applyChanges?: (cmp: unknown) => void };
      }).ng;
      const cmp = host && ng?.getComponent ? ng.getComponent(host) : null;
      const withQuarters = cmp?.collectors?.find((c: { quarters?: string[] }) => (c.quarters || []).length > 0);
      if (!cmp || !withQuarters) {
        return null;
      }
      cmp.toggleCommercial(withQuarters.username);
      ng?.applyChanges?.(cmp);
      return withQuarters.username as string;
    });
    test.skip(!picked, 'Aucun commercial avec localités dans les stats RM');

    await clickIonic(page.getByTestId('e2e-rm-plan-continue'));
    await expect(page.getByRole('heading', { name: 'Localités' })).toBeVisible({ timeout: 15_000 });

    await expect(page.getByTestId('e2e-rm-plan-open-localities')).toBeVisible();
    await expect(page.getByText('Sélection multiple')).toBeVisible();
    await expect(page.locator('.step-localities ion-chip')).toHaveCount(0);

    await page.getByTestId('e2e-rm-plan-open-localities').click();
    await expect(page.getByTestId('e2e-rm-plan-locality-search')).toBeAttached({ timeout: 10_000 });

    await page.evaluate(() => {
      const host = document.querySelector('app-rm-plan');
      const ng = (window as unknown as {
        ng?: { getComponent: (el: Element) => any; applyChanges: (cmp: unknown) => void };
      }).ng;
      if (!host || !ng?.getComponent || !ng.applyChanges) {
        throw new Error('ng.getComponent/applyChanges indisponible');
      }
      const cmp = ng.getComponent(host);
      cmp.localityQuery = 'zzz-e2e-aucune-localite';
      ng.applyChanges(cmp);
    });
    await expect(page.getByText('Aucune localité ne correspond.')).toBeVisible({ timeout: 8_000 });

    await page.evaluate(() => {
      const host = document.querySelector('app-rm-plan');
      const ng = (window as unknown as {
        ng?: { getComponent: (el: Element) => any; applyChanges: (cmp: unknown) => void };
      }).ng;
      const cmp = ng!.getComponent(host!);
      cmp.localityQuery = '';
      ng!.applyChanges(cmp);
    });
    const locality = page.getByTestId('e2e-rm-plan-locality').first();
    await expect(locality).toBeAttached({ timeout: 8_000 });
    await locality.click();
    await clickIonic(page.getByTestId('e2e-rm-plan-apply-localities'));
    await expect(page.getByText(/1 localité\(s\) sélectionnée\(s\)/)).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('.selected-preview ion-chip').first()).toBeVisible();
  });

  test('RM-P1-03 contrôle carnet crédit CONFORME puis ECART + badge du jour', async ({ page }) => {
    test.setTimeout(240_000);
    await loginAsRecoveryManagerLive(page);
    await ensureRmFieldPack(page, { pickLocality: true });

    const openControl = page.getByTestId('e2e-rm-control-open').first();
    test.skip(!(await openControl.isVisible({ timeout: 20_000 }).catch(() => false)), 'Aucun retard dans le pack pour contrôle crédit');

    const posts: number[] = [];
    listenFieldControlPosts(page, posts);

    await clickIonic(openControl);
    await expect(page.getByText('Contrôle carnet')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('e2e-rm-control-sheet-status')).toContainText('CONFORME');

    await fillIonNumber(page, 'e2e-rm-control-amount', '999001');
    await expect(page.getByTestId('e2e-rm-control-sheet-status')).toContainText('ECART');

    await clickIonic(page.getByTestId('e2e-rm-control-confirm'));
    await expect(page.getByText(/Contrôle (enregistré|hors ligne)/)).toBeVisible({ timeout: 20_000 });
    await expect.poll(() => posts.filter((s) => s >= 200 && s < 300).length, { timeout: 30_000 }).toBeGreaterThan(0);
    await expect(page.getByTestId('e2e-rm-control-badge').first()).toHaveText(/ECART/, { timeout: 15_000 });
  });

  test('RM-P1-04 contrôle tontine V2 mois-par-mois + badge Terrain', async ({ page }) => {
    test.setTimeout(240_000);

    const seeded = await ensureCom020InProgressTontineMember();
    expect(seeded.memberId, 'Arrange: membre tontine COM020 SESSION_INPROGRESS').toBeGreaterThan(0);

    await loginAsRecoveryManagerLive(page);
    await ensureRmFieldPack(page);

    const packTontineCount = await page.evaluate(() => {
      const host = document.querySelector('app-rm-dashboard');
      const ng = (window as unknown as { ng?: { getComponent: (el: Element) => any } }).ng;
      const pack = host && ng?.getComponent ? ng.getComponent(host).pack : null;
      return Number(pack?.stats?.tontineMembers ?? pack?.tontineMembers?.length ?? 0);
    });
    expect(
      packTontineCount,
      `Pack RM sans membre tontine après arrange (memberId=${seeded.memberId}, clientId=${seeded.clientId})`,
    ).toBeGreaterThan(0);

    await clickIonic(page.getByTestId('e2e-rm-tab-field'));
    await expect(page).toHaveURL(/\/rm\/field/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Terrain' })).toBeVisible();

    const openControl = page.getByTestId('e2e-rm-tontine-control-open').first();
    await expect(openControl).toBeAttached({ timeout: 10_000 });

    const posts: number[] = [];
    listenTontineControlPosts(page, posts);

    await clickIonic(openControl);
    await expect(page.getByText('Contrôle carnet tontine')).toBeVisible({ timeout: 15_000 });

    const month = page.getByTestId('e2e-rm-tontine-month').first();
    await expect(month).toBeAttached({ timeout: 8_000 });
    await month.click();
    await expect(page.getByTestId('e2e-rm-tontine-sheet-status')).toContainText('CONFORME', { timeout: 8_000 });

    const notebook = month.locator('ion-input input').first();
    await notebook.fill('');
    await notebook.fill('888002');
    await notebook.blur();
    await expect(page.getByTestId('e2e-rm-tontine-sheet-status')).toContainText('ECART');

    await clickIonic(page.getByTestId('e2e-rm-tontine-control-confirm'));
    await expect(page.getByText(/Contrôle tontine (enregistré|hors ligne)/)).toBeVisible({ timeout: 20_000 });
    await expect.poll(() => posts.filter((s) => s >= 200 && s < 300).length, { timeout: 30_000 }).toBeGreaterThan(0);
    await expect(page.getByTestId('e2e-rm-tontine-badge').first()).toHaveText(/ECART/, { timeout: 15_000 });
  });
});
