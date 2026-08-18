import { test, expect } from '@playwright/test';
import { loginAsGestionnaire } from '../../fixtures/auth';

test.describe('Paramètre tontine V1/V2 @p0 @web @august-2026 @regression', () => {
  test('W-P0-11 : sélection V1/V2 uniquement, pas de saisie libre', async ({ page }) => {
    await loginAsGestionnaire(page);
    await page.goto('/parameters');

    const editButton = page.getByTestId('e2e-parameter-edit-TONTINE_SOCIETY_SHARE_VERSION');
    for (let pageIndex = 0; pageIndex < 8; pageIndex += 1) {
      if (await editButton.isVisible().catch(() => false)) {
        break;
      }
      const next = page.locator('button.mat-mdc-paginator-navigation-next');
      if (await next.isEnabled().catch(() => false)) {
        await next.click();
      } else {
        break;
      }
    }

    await expect(editButton).toBeVisible({ timeout: 15_000 });
    await editButton.click();

    const select = page.getByTestId('e2e-tontine-share-version-select');
    await expect(select).toBeVisible();
    const options = select.locator('option');
    await expect(options).toHaveCount(2);
    await expect(options.nth(0)).toHaveText('V1');
    await expect(options.nth(1)).toHaveText('V2');
    await expect(page.locator('input#value')).toHaveCount(0);

    await page.getByRole('button', { name: 'Annuler' }).click();
  });
});
