import { expect, Page } from '@playwright/test';
import { confirmSwal, dismissSwalSuccess } from './ui-helpers';

function accountRowLocator(page: Page, clientLastName: string, status?: string) {
  let selector = `[data-testid="e2e-account-row"][data-client-lastname="${clientLastName}"]`;
  if (status) {
    selector += `[data-status="${status}"]`;
  }
  return page.locator(selector).first();
}

async function searchAccountByClient(page: Page, clientLastName: string): Promise<void> {
  await page.getByTestId('e2e-account-search').fill(clientLastName);
  await page.getByTestId('e2e-account-search').press('Enter');
  await page.locator('ngx-spinner').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
}

/** Active le compte client (statut CREATED → ACTIF) depuis la liste des comptes. */
export async function activateClientAccount(page: Page, clientLastName: string): Promise<void> {
  await page.getByTestId('e2e-sidebar-accounts').click();
  await expect(page.getByTestId('e2e-account-list')).toBeVisible({ timeout: 15_000 });
  await page.locator('ngx-spinner').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});

  await searchAccountByClient(page, clientLastName);

  const createdRow = accountRowLocator(page, clientLastName, 'CREATED');
  await expect(createdRow).toBeVisible({ timeout: 20_000 });
  await createdRow.getByTestId('e2e-account-toggle-status').click();
  await confirmSwal(page);
  await dismissSwalSuccess(page);

  await expect.poll(async () => {
    await searchAccountByClient(page, clientLastName);
    return accountRowLocator(page, clientLastName, 'ACTIF').isVisible().catch(() => false);
  }, { timeout: 20_000 }).toBe(true);
}
