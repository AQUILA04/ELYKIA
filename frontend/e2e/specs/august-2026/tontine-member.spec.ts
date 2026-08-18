import { expect, test } from '@playwright/test';
import { ApiClient } from '../../fixtures/api-client';
import { loginAsGestionnaire } from '../../fixtures/auth';
import { TEST_COMMERCIAL_USERNAME } from '../../fixtures/test-data';

test.describe('Fiche membre tontine @p1 @web @august-2026 @regression', () => {
  test('W-P1-14 répartition cotisé par commercial + badge Actuel', async ({ page }) => {
    const api = new ApiClient();
    await api.signInAsGestionnaire();
    const members = [
      ...(await api.listTontineMembers(TEST_COMMERCIAL_USERNAME, 50)),
      ...(await api.listTontineMembers(undefined, 50)),
    ];
    test.skip(members.length === 0, 'Aucun membre tontine en base locale');
    if (members.length === 0) {
      return;
    }

    let memberId: number | null = null;
    let contributions: Array<{
      commercialUsername: string;
      collectionsCount: number;
      totalAmount: number;
      currentCollector: boolean;
    }> = [];
    const seen = new Set<number>();
    for (const member of members) {
      if (!member.id || seen.has(member.id)) {
        continue;
      }
      seen.add(member.id);
      const rows = await api.getTontineContributionsByCommercial(member.id);
      if (rows.length > 0) {
        memberId = member.id;
        contributions = rows;
        break;
      }
    }
    test.skip(!memberId, 'Aucun membre avec collectes pour W-P1-14');
    if (!memberId) {
      return;
    }

    const currentRows = contributions.filter((row) => row.currentCollector);
    expect(currentRows.length, 'un seul commercial Actuel').toBe(1);

    await loginAsGestionnaire(page);
    await page.goto(`/tontine/member/${memberId}`);
    await expect(page.getByTestId('e2e-tontine-member-details')).toBeVisible({ timeout: 20_000 });
    const section = page.getByTestId('e2e-member-contributions-by-commercial');
    await expect(section).toBeVisible();
    await expect(section).toContainText('Cotisations par commercial');

    const cards = page.getByTestId('e2e-member-contribution-card');
    await expect(cards).toHaveCount(contributions.length);

    for (const row of contributions) {
      const card = page.locator(
        `[data-testid="e2e-member-contribution-card"][data-commercial="${row.commercialUsername}"]`,
      );
      await expect(card).toBeVisible();
      await expect(card).toContainText(String(row.collectionsCount));
    }

    const actuel = page.getByTestId('e2e-member-contribution-actuel');
    await expect(actuel).toHaveCount(1);
    await expect(actuel).toHaveText('Actuel');
    const currentCard = page.locator(
      '[data-testid="e2e-member-contribution-card"][data-current="true"]',
    );
    await expect(currentCard).toHaveCount(1);
    await expect(currentCard).toContainText(currentRows[0]!.commercialUsername);
  });
});
