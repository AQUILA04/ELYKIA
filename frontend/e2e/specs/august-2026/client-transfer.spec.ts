import { expect, test } from '@playwright/test';
import { ApiClient } from '../../fixtures/api-client';
import { loginAsCommercial, loginAsGestionnaire } from '../../fixtures/auth';
import { TEST_COMMERCIAL_USERNAME } from '../../fixtures/test-data';
import { dismissSwalSuccess, selectNgSelectOption } from '../../fixtures/ui-helpers';

async function openClientListForCommercial(page: Page, collector: string): Promise<void> {
  await page.goto('/client/list');
  await expect(page.getByTestId('e2e-client-list')).toBeVisible();
  await selectNgSelectOption(page, 'e2e-commercial-selector', collector);
  await page.locator('.ngx-spinner-overlay').waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {});
}

test.describe('Transfert clients + champs commerciaux @p1 @web @august-2026 @regression', () => {
  test('W-P1-10 checkbox transfert INPROGRESS async + historique collector', async ({ page }) => {
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const inProgress = (await api.searchCredits(
      { commercial: TEST_COMMERCIAL_USERNAME, status: 'INPROGRESS' },
      0,
      50,
    )).filter((credit) => credit.status === 'INPROGRESS');
    test.skip(inProgress.length === 0, 'Aucun crédit INPROGRESS COM020 pour W-P1-10');
    if (inProgress.length === 0) {
      return;
    }

    const detail = await api.getCreditById(inProgress[0]!.id);
    const clientId = detail.client?.id;
    const originCollector = detail.collector ?? TEST_COMMERCIAL_USERNAME;
    test.skip(!clientId, 'Crédit INPROGRESS sans client.id');
    if (!clientId) {
      return;
    }

    await loginAsGestionnaire(page);
    await openClientListForCommercial(page, originCollector);

    const row = page.locator(`.desktop-table-wrap [data-testid="e2e-client-row"][data-client-id="${clientId}"]`);
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.locator('mat-checkbox').click();
    await page.getByTestId('e2e-client-bulk-assign-collector-btn').click();
    const modal = page.getByTestId('e2e-client-bulk-assign-modal');
    await expect(modal).toBeVisible();

    const transferBox = page.getByTestId('e2e-client-bulk-transfer-credits-checkbox');
    await expect(transferBox).toBeDisabled();

    const collectorSelect = page.getByTestId('e2e-client-bulk-credit-collector');
    const target = await collectorSelect.locator('option').evaluateAll((options, origin) => {
      return options
        .map((option) => (option as HTMLOptionElement).value)
        .find((value) => value && value !== origin) ?? '';
    }, originCollector);
    expect(target, 'un autre commercial doit être disponible').toBeTruthy();
    await collectorSelect.selectOption(target);
    await expect(transferBox).toBeEnabled();
    await transferBox.check();

    try {
      await page.getByTestId('e2e-client-bulk-validate').click();
      await dismissSwalSuccess(page);

      await expect.poll(async () => {
        const credit = await api.getCreditById(detail.id);
        return credit.collector ?? '';
      }, { timeout: 20_000 }).toBe(target);

      await expect.poll(async () => {
        const history = await api.getCollectorHistory(detail.id);
        return history.some((entry) => entry.newCollector === target);
      }, { timeout: 20_000 }).toBe(true);

      await page.locator('.ngx-spinner-overlay').waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
      if ((await row.count()) > 0) {
        await expect(row).toHaveAttribute('data-collector', target);
      } else {
        await openClientListForCommercial(page, target);
        await expect(row).toBeVisible({ timeout: 20_000 });
        await expect(row).toHaveAttribute('data-collector', target);
      }
    } finally {
      await api.bulkAssignCollectors({
        clientIds: [clientId],
        collector: originCollector,
        transferInProgressCredits: true,
      });
      await expect.poll(async () => {
        const credit = await api.getCreditById(detail.id);
        return credit.collector ?? '';
      }, { timeout: 20_000 }).toBe(originCollector);
    }
  });

  test('W-P1-11 édition : champs commerciaux gated ROLE_ASSIGN_CLIENT_COLLECTOR', async ({ page }) => {
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const credits = await api.getCreditsByCommercial(TEST_COMMERCIAL_USERNAME, 0, 20);
    test.skip(credits.length === 0, 'Aucun crédit COM020 pour résoudre un client');
    if (credits.length === 0) {
      return;
    }
    const detail = await api.getCreditById(credits[0]!.id);
    const clientId = detail.client?.id;
    test.skip(!clientId, 'Crédit sans client.id');
    if (!clientId) {
      return;
    }

    await loginAsGestionnaire(page);
    await page.goto(`/client/add/${clientId}`);
    await expect(page.getByTestId('e2e-client-form')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('e2e-client-collector')).not.toHaveClass(/ng-select-disabled/);
    await expect(page.getByTestId('e2e-client-tontine-collector')).not.toHaveClass(/ng-select-disabled/);

    await loginAsCommercial(page);
    await page.goto(`/client/add/${clientId}`);
    await expect(page.getByTestId('e2e-client-form')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('e2e-client-collector')).toHaveClass(/ng-select-disabled/);
    await expect(page.getByTestId('e2e-client-tontine-collector')).toHaveClass(/ng-select-disabled/);
  });
});
