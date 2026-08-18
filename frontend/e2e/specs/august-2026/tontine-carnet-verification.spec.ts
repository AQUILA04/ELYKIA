import { expect, test } from '@playwright/test';
import { loginAsCommercial, loginAsGestionnaire, loginAsRecoveryManager } from '../../fixtures/auth';
import { ApiClient } from '../../fixtures/api-client';
import { confirmSwal, dismissSwalSuccess } from '../../fixtures/ui-helpers';

test.describe('Vérification carnet tontine @p1 @web @august-2026 @regression', () => {
  test('W-P1-17 recov001 a ROLE_TONTINE_CARNET_VERIFY, pas le commercial', async () => {
    const api = new ApiClient();
    const rm = await api.signInAsRecoveryManager();
    expect(rm.roles).toContain('ROLE_TONTINE_CARNET_VERIFY');

    const commercial = await api.signInAsCommercial();
    expect(commercial.roles).not.toContain('ROLE_TONTINE_CARNET_VERIFY');

    const gestionnaire = await api.signInAsGestionnaire();
    expect(gestionnaire.roles).not.toContain('ROLE_TONTINE_CARNET_VERIFY');
  });

  test('W-P1-18 sans droit : badge visible, pas d’actions de vérification', async ({ page }) => {
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const members = await api.listTontineMembers(undefined, 20);
    test.skip(members.length === 0, 'Aucun membre tontine en base locale');

    await loginAsGestionnaire(page);
    await page.goto('/tontine');
    await expect(page.getByTestId('e2e-tontine-dashboard')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('e2e-tontine-carnet-pdf-verified')).toHaveCount(0);
    await expect(page.getByTestId('e2e-tontine-carnet-pdf-pending')).toHaveCount(0);
    await expect(page.getByTestId('e2e-tontine-carnet-select-all')).toHaveCount(0);
    await expect(page.getByTestId('e2e-tontine-carnet-row-badge').first()).toBeVisible();

    await page.goto(`/tontine/member/${members[0]!.id}`);
    await expect(page.getByTestId('e2e-tontine-member-details')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('e2e-tontine-carnet-badge')).toBeVisible();
    await expect(page.getByTestId('e2e-tontine-carnet-verify-btn')).toHaveCount(0);
  });

  test('W-P1-18b commercial : JWT sans ROLE_TONTINE_CARNET_VERIFY', async ({ page }) => {
    await loginAsCommercial(page);
    await expect(page.getByTestId('e2e-app-shell')).toBeVisible();
    const api = new ApiClient();
    const commercial = await api.signInAsCommercial();
    expect(commercial.roles).not.toContain('ROLE_TONTINE_CARNET_VERIFY');
  });

  test('W-P1-19 chef de recouvrement : Vérifier sur fiche membre', async ({ page }) => {
    const api = new ApiClient();
    await api.signInAsRecoveryManager();
    const members = await api.listTontineMembers(undefined, 20);
    test.skip(members.length === 0, 'Aucun membre tontine en base locale');
    const memberId = members[0]!.id;
    const sessionStatus = await api.getCurrentTontineSessionStatus();

    await loginAsRecoveryManager(page);
    await page.goto(`/tontine/member/${memberId}`);
    await expect(page.getByTestId('e2e-tontine-member-details')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('e2e-tontine-carnet-badge')).toBeVisible();
    const verifyBtn = page.getByTestId('e2e-tontine-carnet-verify-btn');
    await expect(verifyBtn).toBeVisible();

    test.skip(sessionStatus !== 'ACTIVE', 'Session tontine non active — lecture seule');

    const before = (await page.getByTestId('e2e-tontine-carnet-badge').innerText()).trim();
    const wasUnverified = before.includes('non vérifié');
    await verifyBtn.click();
    await confirmSwal(page);
    await dismissSwalSuccess(page);
    await expect(page.getByTestId('e2e-tontine-carnet-badge')).toHaveText(
      wasUnverified ? 'Carnet vérifié' : 'Carnet non vérifié',
      { timeout: 15_000 },
    );
  });

  test('W-P1-20 chef de recouvrement : bulk liste + PDF', async ({ page }) => {
    const api = new ApiClient();
    await api.signInAsRecoveryManager();
    const members = await api.listTontineMembers(undefined, 20);
    test.skip(members.length === 0, 'Aucun membre tontine en base locale');
    const sessionStatus = await api.getCurrentTontineSessionStatus();

    await loginAsRecoveryManager(page);
    await page.goto('/tontine');
    await expect(page.getByTestId('e2e-tontine-dashboard')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('e2e-tontine-carnet-pdf-verified')).toBeVisible();
    await expect(page.getByTestId('e2e-tontine-carnet-pdf-pending')).toBeVisible();
    await expect(page.getByTestId('e2e-tontine-carnet-filter')).toBeVisible();

    test.skip(sessionStatus !== 'ACTIVE', 'Session tontine non active — lecture seule');

    await expect(page.getByTestId('e2e-tontine-carnet-select-all')).toBeVisible({ timeout: 20_000 });
    const firstRow = page.getByTestId('e2e-tontine-member-row').first();
    await expect(firstRow).toBeVisible();
    const memberId = await firstRow.getAttribute('data-member-id');
    expect(memberId).toBeTruthy();
    await page.getByTestId(`e2e-tontine-carnet-select-${memberId}`).click();
    await expect(page.getByTestId('e2e-tontine-carnet-bulk-verify')).toBeVisible();
    await page.getByTestId('e2e-tontine-carnet-bulk-verify').click();
    await confirmSwal(page);
    await dismissSwalSuccess(page);
    await expect(page.getByTestId('e2e-tontine-carnet-bulk-verify')).toHaveCount(0);
  });
});
