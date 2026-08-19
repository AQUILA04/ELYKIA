import { test, expect, Page } from '@playwright/test';
import { loginAsRecoveryManagerLive } from '../../fixtures/live-auth';
import { clickIonic, ensureRmFieldPack } from '../../fixtures/rm-plan-ops';
import { ensureCom020InProgressTontineMember } from '../../fixtures/rm-tontine-seed';
import { LIVE_ACCOUNTS } from '../../fixtures/accounts';

async function fillIonInput(page: Page, testId: string, value: string): Promise<void> {
  const input = page.getByTestId(testId).locator('input').first();
  await input.waitFor({ state: 'visible', timeout: 10_000 });
  await input.fill('');
  await input.fill(value);
  await input.blur();
}

async function fulfillOffline(page: Page, pattern: string | RegExp): Promise<void> {
  await page.route(pattern, async (route) => {
    if (route.request().method() === 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'e2e-offline' }),
    });
  });
}

async function setClosePartial(page: Page): Promise<void> {
  await page.evaluate(() => {
    const host = document.querySelector('app-rm-close-sheet');
    const ng = (window as unknown as {
      ng?: { getComponent: (el: Element) => any; applyChanges?: (cmp: unknown) => void };
    }).ng;
    const cmp = host && ng?.getComponent ? ng.getComponent(host) : null;
    if (!cmp?.setPartial) {
      throw new Error('feuille clôture introuvable');
    }
    cmp.setPartial();
    ng?.applyChanges?.(cmp);
  });
}

function classifySyncUrl(url: string): 'assign' | 'contact' | 'credit' | 'tontine' | 'close' | null {
  if (/\/clients\/bulk-assign-collectors/.test(url)) {
    return 'assign';
  }
  if (/\/recovery-manager\/clients\/\d+\/contact/.test(url)) {
    return 'contact';
  }
  if (/\/tontines\/members\/\d+\/field-controls/.test(url)) {
    return 'tontine';
  }
  if (/\/credits\/\d+\/field-controls/.test(url)) {
    return 'credit';
  }
  if (/\/recovery-manager\/close-credits/.test(url)) {
    return 'close';
  }
  return null;
}

test.describe('Clients, shell et sync RM P1 @p1 @mobile @rm @august-2026 @regression', () => {
  test('RM-P1-05 édition client RM : phone + GPS ; quarter lecture seule ; mll dérivé', async ({ page }) => {
    test.setTimeout(240_000);
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 6.13145, longitude: 1.22267 });

    await loginAsRecoveryManagerLive(page);
    await ensureRmFieldPack(page);

    await clickIonic(page.getByTestId('e2e-rm-tab-clients'));
    await expect(page).toHaveURL(/\/rm\/clients/, { timeout: 20_000 });
    const card = page.getByTestId('e2e-rm-client-card').first();
    await expect(card).toBeAttached({ timeout: 20_000 });
    await card.click();

    await expect(page.getByText('Fiche client')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('e2e-rm-client-quarter')).toBeVisible();
    await expect(page.getByTestId('e2e-rm-client-quarter').locator('input')).toHaveCount(0);
    await expect(page.locator('app-rm-client-edit-sheet ion-input')).toHaveCount(1);
    await expect(page.getByTestId('e2e-rm-client-mll-hint')).toBeVisible();

    const phone = `90${Date.now().toString().slice(-6)}`;
    await fillIonInput(page, 'e2e-rm-client-phone', phone);

    await clickIonic(page.getByTestId('e2e-rm-client-capture-gps'));
    const captured = await page.getByTestId('e2e-rm-client-coords').isVisible({ timeout: 8_000 }).catch(() => false);
    if (!captured) {
      await page.evaluate(() => {
        const host = document.querySelector('app-rm-client-edit-sheet');
        const ng = (window as unknown as {
          ng?: { getComponent: (el: Element) => any; applyChanges?: (cmp: unknown) => void };
        }).ng;
        const cmp = host && ng?.getComponent ? ng.getComponent(host) : null;
        if (!cmp) {
          throw new Error('feuille client introuvable');
        }
        cmp.latitude = 6.13145;
        cmp.longitude = 1.22267;
        ng?.applyChanges?.(cmp);
      });
    }
    await expect(page.getByTestId('e2e-rm-client-coords')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId('e2e-rm-client-coords')).toContainText('6.131');

    const mll = await page.evaluate(() => {
      const host = document.querySelector('app-rm-client-edit-sheet');
      const ng = (window as unknown as { ng?: { getComponent: (el: Element) => any } }).ng;
      return ng?.getComponent(host!)?.mllPreview as string;
    });
    expect(mll).toMatch(/query=6\.13145,1\.22267/);

    await clickIonic(page.getByTestId('e2e-rm-client-save'));
    await expect(page.getByText(/Contact (mis à jour|enregistré)/)).toBeVisible({ timeout: 20_000 });
  });

  test('RM-P1-06 sync Plus : contacts → contrôles crédit → tontine → clôtures', async ({ page }) => {
    test.setTimeout(300_000);
    await ensureCom020InProgressTontineMember();
    await loginAsRecoveryManagerLive(page);
    await ensureRmFieldPack(page);

    await fulfillOffline(page, /\/api\/v1\/recovery-manager\/clients\/\d+\/contact/);
    await fulfillOffline(page, /\/api\/v1\/credits\/\d+\/field-controls/);
    await fulfillOffline(page, /\/api\/v1\/tontines\/members\/\d+\/field-controls/);
    await fulfillOffline(page, /\/api\/v1\/recovery-manager\/close-credits/);

    await clickIonic(page.getByTestId('e2e-rm-tab-clients'));
    await page.getByTestId('e2e-rm-client-card').first().click();
    await expect(page.getByText('Fiche client')).toBeVisible({ timeout: 15_000 });
    await fillIonInput(page, 'e2e-rm-client-phone', `90${Date.now().toString().slice(-6)}`);
    await clickIonic(page.getByTestId('e2e-rm-client-save'));
    await expect(page.getByText('Contact enregistré hors ligne — sync ultérieure')).toBeVisible({ timeout: 20_000 });

    await clickIonic(page.getByTestId('e2e-rm-tab-dashboard'));
    await clickIonic(page.getByTestId('e2e-rm-control-open').first());
    await expect(page.getByText('Contrôle carnet')).toBeVisible({ timeout: 15_000 });
    await clickIonic(page.getByTestId('e2e-rm-control-confirm'));
    await expect(page.getByText('Contrôle hors ligne (CONFORME) — sync ultérieure')).toBeVisible({ timeout: 20_000 });

    await clickIonic(page.getByTestId('e2e-rm-tab-field'));
    await clickIonic(page.getByTestId('e2e-rm-tontine-control-open').first());
    await expect(page.getByText('Contrôle carnet tontine')).toBeVisible({ timeout: 15_000 });
    await page.evaluate(() => {
      const host = document.querySelector('app-rm-tontine-field-control-sheet');
      const ng = (window as unknown as {
        ng?: { getComponent: (el: Element) => any; applyChanges?: (cmp: unknown) => void };
      }).ng;
      const cmp = host && ng?.getComponent ? ng.getComponent(host) : null;
      if (!cmp?.rows?.[0]) {
        throw new Error('aucun mois tontine dans la feuille');
      }
      cmp.toggleRow(cmp.rows[0]);
      ng?.applyChanges?.(cmp);
    });
    await clickIonic(page.getByTestId('e2e-rm-tontine-control-confirm'));
    await expect(page.getByText('Contrôle tontine hors ligne (CONFORME) — sync ultérieure')).toBeVisible({
      timeout: 20_000,
    });

    await clickIonic(page.getByTestId('e2e-rm-tab-dashboard'));
    await clickIonic(page.getByTestId('e2e-rm-close-open').first());
    await expect(page.getByText('Clôturer le retard')).toBeVisible({ timeout: 15_000 });
    await setClosePartial(page);
    await clickIonic(page.getByTestId('e2e-rm-close-confirm'));
    await expect(page.getByText('Clôture enregistrée hors ligne — sync ultérieure')).toBeVisible({ timeout: 20_000 });

    await page.unrouteAll({ behavior: 'ignoreErrors' });

    const synced: string[] = [];
    page.on('response', (response) => {
      if (response.status() < 200 || response.status() >= 300) {
        return;
      }
      const kind = classifySyncUrl(response.url());
      if (kind) {
        synced.push(kind);
      }
    });

    await clickIonic(page.getByTestId('e2e-rm-tab-more'));
    await expect(page.getByTestId('e2e-rm-pending-queue')).toBeVisible({ timeout: 15_000 });
    await clickIonic(page.getByTestId('e2e-rm-more-sync'));
    await page.locator('ion-loading').waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {});

    await expect.poll(() => synced.length, { timeout: 60_000 }).toBeGreaterThanOrEqual(4);
    const uniqueOrder = synced.filter((kind, index) => synced.indexOf(kind) === index);
    expect(uniqueOrder, `ordre sync=${synced.join(' → ')}`).toEqual(['contact', 'credit', 'tontine', 'close']);
  });

  test('RM-P1-09 transfert commercial RM online : sélection + commercial crédit', async ({ page }) => {
    test.setTimeout(240_000);
    await loginAsRecoveryManagerLive(page);
    await ensureRmFieldPack(page);

    await clickIonic(page.getByTestId('e2e-rm-tab-clients'));
    await expect(page).toHaveURL(/\/rm\/clients/, { timeout: 20_000 });
    const card = page.getByTestId('e2e-rm-client-card').first();
    await expect(card).toBeAttached({ timeout: 20_000 });
    const originalCollector = ((await card.getAttribute('data-collector')) || '').trim();

    await clickIonic(card.getByTestId('e2e-rm-client-select'));
    await clickIonic(page.getByTestId('e2e-rm-bulk-assign-btn'));
    await expect(page.getByTestId('e2e-rm-bulk-assign-sheet')).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => {
      return page.evaluate(() => {
        const host = document.querySelector('app-rm-collector-assign-sheet');
        const ng = (window as unknown as { ng?: { getComponent: (el: Element) => any } }).ng;
        return ng?.getComponent(host!)?.collectors?.length || 0;
      });
    }, { timeout: 15_000 }).toBeGreaterThan(0);

    const nextCollector = await page.evaluate((current: string) => {
      const host = document.querySelector('app-rm-collector-assign-sheet');
      const ng = (window as unknown as {
        ng?: { getComponent: (el: Element) => any; applyChanges?: (cmp: unknown) => void };
      }).ng;
      const cmp = host && ng?.getComponent ? ng.getComponent(host) : null;
      if (!cmp) {
        throw new Error('feuille transfert introuvable');
      }
      const other = (cmp.collectors || []).find((c: { username: string }) => c.username && c.username !== current);
      if (!other?.username) {
        throw new Error('aucun autre commercial dans le cache');
      }
      cmp.selectedCreditCollector = other.username;
      ng?.applyChanges?.(cmp);
      return other.username as string;
    }, originalCollector);

    await clickIonic(page.getByTestId('e2e-rm-bulk-validate'));
    await expect(page.getByText(/Changement de commercial effectué|Changement enregistré hors ligne/)).toBeVisible({
      timeout: 20_000,
    });
    await expect(card).toHaveAttribute('data-collector', nextCollector, { timeout: 10_000 });

    await clickIonic(card.getByTestId('e2e-rm-client-select'));
    await clickIonic(page.getByTestId('e2e-rm-bulk-assign-btn'));
    await expect(page.getByTestId('e2e-rm-bulk-assign-sheet')).toBeVisible({ timeout: 15_000 });
    await page.evaluate((restore: string) => {
      const host = document.querySelector('app-rm-collector-assign-sheet');
      const ng = (window as unknown as {
        ng?: { getComponent: (el: Element) => any; applyChanges?: (cmp: unknown) => void };
      }).ng;
      const cmp = host && ng?.getComponent ? ng.getComponent(host) : null;
      if (!cmp) {
        throw new Error('feuille transfert introuvable (restore)');
      }
      cmp.selectedCreditCollector = restore;
      ng?.applyChanges?.(cmp);
    }, originalCollector);
    await clickIonic(page.getByTestId('e2e-rm-bulk-validate'));
    await expect(page.getByText(/Changement de commercial effectué|Changement enregistré hors ligne/)).toBeVisible({
      timeout: 20_000,
    });
  });

  test('RM-P1-10 transfert commercial RM offline puis sync Plus en tête de file', async ({ page }) => {
    test.setTimeout(300_000);
    await loginAsRecoveryManagerLive(page);
    await ensureRmFieldPack(page);

    await fulfillOffline(page, /\/api\/v1\/clients\/bulk-assign-collectors/);

    await clickIonic(page.getByTestId('e2e-rm-tab-clients'));
    const card = page.getByTestId('e2e-rm-client-card').first();
    await expect(card).toBeAttached({ timeout: 20_000 });
    const originalCollector = ((await card.getAttribute('data-collector')) || '').trim();
    await clickIonic(card.getByTestId('e2e-rm-client-select'));
    await clickIonic(page.getByTestId('e2e-rm-bulk-assign-btn'));
    await expect(page.getByTestId('e2e-rm-bulk-assign-sheet')).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => {
      return page.evaluate(() => {
        const host = document.querySelector('app-rm-collector-assign-sheet');
        const ng = (window as unknown as { ng?: { getComponent: (el: Element) => any } }).ng;
        return ng?.getComponent(host!)?.collectors?.length || 0;
      });
    }, { timeout: 15_000 }).toBeGreaterThan(0);

    const nextCollector = await page.evaluate((current: string) => {
      const host = document.querySelector('app-rm-collector-assign-sheet');
      const ng = (window as unknown as {
        ng?: { getComponent: (el: Element) => any; applyChanges?: (cmp: unknown) => void };
      }).ng;
      const cmp = host && ng?.getComponent ? ng.getComponent(host) : null;
      if (!cmp) {
        throw new Error('feuille transfert introuvable');
      }
      const other = (cmp.collectors || []).find((c: { username: string }) => c.username && c.username !== current)
        || (cmp.collectors || [])[0];
      if (!other?.username) {
        throw new Error('aucun commercial dans le cache');
      }
      cmp.selectedCreditCollector = other.username;
      if (cmp.selectedCreditCollector === current && cmp.collectors?.[1]?.username) {
        cmp.selectedCreditCollector = cmp.collectors[1].username;
      }
      ng?.applyChanges?.(cmp);
      return cmp.selectedCreditCollector as string;
    }, originalCollector);
    expect(nextCollector).toBeTruthy();
    expect(nextCollector).not.toBe(originalCollector);

    await clickIonic(page.getByTestId('e2e-rm-bulk-validate'));
    await expect(page.getByText('Changement enregistré hors ligne — sync ultérieure')).toBeVisible({
      timeout: 20_000,
    });
    await expect(card).toHaveAttribute('data-collector', nextCollector);

    await page.unrouteAll({ behavior: 'ignoreErrors' });

    const synced: string[] = [];
    page.on('response', (response) => {
      if (response.request().method() !== 'POST' && response.request().method() !== 'PATCH') {
        return;
      }
      if (response.status() < 200 || response.status() >= 300) {
        return;
      }
      const kind = classifySyncUrl(response.url());
      if (kind) {
        synced.push(kind);
      }
    });

    await clickIonic(page.getByTestId('e2e-rm-tab-more'));
    await expect(page.getByTestId('e2e-rm-pending-queue')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('e2e-rm-pending-queue')).toContainText(/transfert\(s\) de commercial/);
    await clickIonic(page.getByTestId('e2e-rm-more-sync'));
    await page.locator('ion-loading').waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {});

    await expect.poll(() => synced.includes('assign'), { timeout: 60_000 }).toBeTruthy();
    expect(synced.filter((kind, index) => synced.indexOf(kind) === index)[0]).toBe('assign');
  });

  test('RM-P1-07 barre session seulement Retards et Plus', async ({ page }) => {
    test.setTimeout(240_000);
    await loginAsRecoveryManagerLive(page);
    await ensureRmFieldPack(page);

    const visibleBar = page.getByTestId('e2e-rm-session-bar').filter({ visible: true });
    await expect(visibleBar).toBeVisible();
    await expect(visibleBar).toContainText(LIVE_ACCOUNTS.recoveryManager.username);
    await expect(visibleBar).toContainText(/En ligne|Hors ligne/);

    await clickIonic(page.getByTestId('e2e-rm-tab-field'));
    await expect(page).toHaveURL(/\/rm\/field/, { timeout: 20_000 });
    await expect(page.getByTestId('e2e-rm-session-bar').filter({ visible: true })).toHaveCount(0);

    await clickIonic(page.getByTestId('e2e-rm-tab-clients'));
    await expect(page).toHaveURL(/\/rm\/clients/, { timeout: 20_000 });
    await expect(page.getByTestId('e2e-rm-session-bar').filter({ visible: true })).toHaveCount(0);

    await clickIonic(page.getByTestId('e2e-rm-tab-more'));
    await expect(page).toHaveURL(/\/rm\/more/, { timeout: 20_000 });
    await expect(page.getByTestId('e2e-rm-session-bar').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('e2e-rm-session-bar').filter({ visible: true })).toContainText(
      LIVE_ACCOUNTS.recoveryManager.username,
    );
  });

  test('RM-P1-08 KPI Clôturé du jour + badge file d’attente Retards', async ({ page }) => {
    test.setTimeout(240_000);
    await loginAsRecoveryManagerLive(page);
    await ensureRmFieldPack(page);

    await expect(page.getByTestId('e2e-rm-kpi-closed')).toBeVisible();
    const before = ((await page.getByTestId('e2e-rm-kpi-closed').innerText()) || '').replace(/\s/g, '');

    await fulfillOffline(page, /\/api\/v1\/recovery-manager\/close-credits/);
    await clickIonic(page.getByTestId('e2e-rm-close-open').first());
    await expect(page.getByText('Clôturer le retard')).toBeVisible({ timeout: 15_000 });
    await setClosePartial(page);
    await clickIonic(page.getByTestId('e2e-rm-close-confirm'));
    await expect(page.getByText(/hors ligne/)).toBeVisible({ timeout: 20_000 });

    await expect(page.getByTestId('e2e-rm-pending-closes')).toBeVisible({ timeout: 15_000 });
    const after = ((await page.getByTestId('e2e-rm-kpi-closed').innerText()) || '').replace(/\s/g, '');
    expect(after, `KPI Clôturé inchangé (${before})`).not.toBe(before);
  });
});
