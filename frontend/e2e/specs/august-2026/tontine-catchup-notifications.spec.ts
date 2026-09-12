import { expect, Page, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { activateClientAccount } from '../../fixtures/account-helpers';
import { ApiClient } from '../../fixtures/api-client';
import {
  loginAsCommercial,
  loginAsGestionnaire,
  loginAsSecretaire,
} from '../../fixtures/auth';
import { expectTontineMemberExists } from '../../fixtures/tontine-helpers';
import {
  E2E_TONTINE_CATCHUP_COLLECTION_AMOUNT,
  E2E_TONTINE_MEMBER_AMOUNT,
  E2E_TONTINE_NORMAL_COLLECTION_AMOUNT,
  TEST_COMMERCIAL_USERNAME,
  todayIsoDate,
  uniqueE2eLabel,
  uniqueE2ePhone,
} from '../../fixtures/test-data';
import {
  dismissSwalSuccess,
  selectMatSelectByText,
  selectNgSelectOption,
} from '../../fixtures/ui-helpers';

/**
 * Collecte tontine du jour + rattrapage mois précédent :
 * KPI rapport journalier, puis cloche notifications secrétaire → deep-link rapport.
 */
test.use({ video: 'on' });

test.describe.serial('Tontine catch-up + notifications @p1 @web @august-2026 @regression', () => {
  let localityName: string;
  let clientLastName: string;
  let clientFirstName: string;
  let clientPhone: string;
  let tontineMemberId: number;
  let catchupDateIso: string;

  test.beforeAll(async () => {
    localityName = uniqueE2eLabel('LOCATCH');
    clientLastName = uniqueE2eLabel('CATCHNOM');
    clientFirstName = 'Catchup';
    clientPhone = uniqueE2ePhone();

    const previousMonth = new Date();
    previousMonth.setDate(1);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const lastDayPrev = new Date(
      previousMonth.getFullYear(),
      previousMonth.getMonth() + 1,
      0,
    ).getDate();
    previousMonth.setDate(Math.min(15, lastDayPrev));
    catchupDateIso = [
      previousMonth.getFullYear(),
      String(previousMonth.getMonth() + 1).padStart(2, '0'),
      String(previousMonth.getDate()).padStart(2, '0'),
    ].join('-');

    const api = new ApiClient();
    await api.signInAsGestionnaire();
    await api.ensureAccountingDayOpen();
    await api.ensureTontineSessionActive();
  });

  test('arrange — localité, client, membre tontine (inscription antérieure)', async ({ page }) => {
    test.setTimeout(180_000);
    await loginAsGestionnaire(page);

    await page.getByTestId('e2e-sidebar-configuration').click();
    await page.getByTestId('e2e-sidebar-localities').click();
    await page.getByTestId('e2e-locality-add-btn').click();
    await page.getByTestId('e2e-locality-name').fill(localityName);
    await page.getByTestId('e2e-locality-submit').click();
    await expect(page).toHaveURL(/\/localitylist/, { timeout: 20_000 });
    await dismissSwalSuccess(page);

    await page.getByTestId('e2e-sidebar-clients').click();
    await page.getByTestId('e2e-client-add-btn').click();
    await expect(page.getByTestId('e2e-client-form')).toBeVisible();
    await page.getByTestId('e2e-client-lastname').fill(clientLastName);
    await page.getByTestId('e2e-client-firstname').fill(clientFirstName);
    await page.getByTestId('e2e-client-address').fill('Adresse E2E catchup');
    await page.getByTestId('e2e-client-phone').fill(clientPhone);
    await page.getByTestId('e2e-client-card-type').selectOption('ID Card');
    await page.getByTestId('e2e-client-card-id').fill(`CATCH${Date.now().toString().slice(-8)}`);
    await page.getByTestId('e2e-client-birthdate').fill('1991-04-12');
    await page.getByTestId('e2e-client-occupation').fill('Commerçant');
    await selectNgSelectOption(page, 'e2e-client-quarter', localityName);
    await selectNgSelectOption(page, 'e2e-client-collector', TEST_COMMERCIAL_USERNAME);
    await selectNgSelectOption(page, 'e2e-client-tontine-collector', TEST_COMMERCIAL_USERNAME);
    await page.getByTestId('e2e-client-type').selectOption('CLIENT');
    await page.getByTestId('e2e-client-account-balance').fill('1000');
    await page.getByTestId('e2e-client-submit').click();
    await expect(page).toHaveURL(/\/client\/list/, { timeout: 30_000 });
    await dismissSwalSuccess(page);
    await activateClientAccount(page, clientLastName);

    await page.goto('/tontine');
    await expect(page.getByTestId('e2e-tontine-dashboard')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('e2e-tontine-add-member-btn')).toBeEnabled({ timeout: 30_000 });
    await page.getByTestId('e2e-tontine-add-member-btn').click();
    await expect(page.getByTestId('e2e-tontine-add-member-modal')).toBeVisible();
    await selectMatSelectByText(page, 'e2e-tontine-member-client', clientLastName);
    await page.getByTestId('e2e-tontine-member-amount').fill(String(E2E_TONTINE_MEMBER_AMOUNT));
    await page.getByTestId('e2e-tontine-member-submit').click();
    await expect(page.getByTestId('e2e-tontine-add-member-modal')).toBeHidden({ timeout: 20_000 });

    tontineMemberId = await expectTontineMemberExists(clientLastName);
    // Autorise un rattrapage sur le mois précédent (param USE_MEMBER_REGISTRATION_DATE_FOR_SHARE).
    backdateTontineMemberRegistration(tontineMemberId, `${catchupDateIso} 08:00:00`);
  });

  test('commercial — collecte normale du jour', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsCommercial(page);
    await page.goto(`/tontine/member/${tontineMemberId}`);
    await expect(page.getByTestId('e2e-tontine-member-details')).toBeVisible({ timeout: 20_000 });

    await page.getByTestId('e2e-tontine-record-collection-btn').click();
    await expect(page.getByTestId('e2e-tontine-collection-modal')).toBeVisible();
    await page
      .getByTestId('e2e-tontine-collection-amount')
      .fill(String(E2E_TONTINE_NORMAL_COLLECTION_AMOUNT));
    await page.getByTestId('e2e-tontine-collection-submit').click();
    await expect(page.getByTestId('e2e-tontine-collection-modal')).toBeHidden({ timeout: 20_000 });
  });

  test('commercial — collecte de rattrapage mois précédent', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsCommercial(page);
    await page.goto(`/tontine/member/${tontineMemberId}`);
    await expect(page.getByTestId('e2e-tontine-member-details')).toBeVisible({ timeout: 20_000 });

    await page.getByTestId('e2e-tontine-record-catchup-btn').click();
    await expect(page.getByTestId('e2e-tontine-catchup-modal')).toBeVisible({ timeout: 15_000 });
    await pickMatDate(page, 'e2e-tontine-catchup-date', catchupDateIso);
    await page
      .getByTestId('e2e-tontine-catchup-daily-stake')
      .fill(String(E2E_TONTINE_MEMBER_AMOUNT));
    await page
      .getByTestId('e2e-tontine-catchup-amount')
      .fill(String(E2E_TONTINE_CATCHUP_COLLECTION_AMOUNT));
    // Le footer peut être clipé hors viewport (modal trop haut) — click DOM direct.
    const submit = page.getByTestId('e2e-tontine-catchup-submit');
    await expect(submit).toBeEnabled({ timeout: 10_000 });
    await submit.evaluate((el: HTMLButtonElement) => el.click());
    await expect(page.getByTestId('e2e-tontine-catchup-modal')).toBeHidden({ timeout: 30_000 });
  });

  test('rapport journalier — KPI jour + KPI rattrapage', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsGestionnaire(page);
    await page.getByTestId('e2e-sidebar-daily-report').click();
    await expect(page.getByTestId('e2e-daily-report')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('e2e-daily-report-filter-today').click();
    await selectNgSelectOption(page, 'e2e-daily-report-agent-select', TEST_COMMERCIAL_USERNAME);
    await page.locator('mat-spinner').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});

    const panel = page.getByTestId(`e2e-daily-report-panel-${TEST_COMMERCIAL_USERNAME}`);
    await expect(panel).toBeVisible({ timeout: 20_000 });

    const collectionsKpi = panel.getByTestId('e2e-daily-report-tontine-collections-kpi');
    await expect(collectionsKpi).toBeVisible();
    // Montants cumulés possibles si plusieurs runs le même jour — on vérifie la présence d'un montant.
    await expect(collectionsKpi).toContainText(/F\s*CFA|FCFA/i);

    const catchupKpi = panel.getByTestId('e2e-daily-report-tontine-catchup-kpi');
    await expect(catchupKpi).toBeVisible();
    await expect(catchupKpi).toContainText(/[1-9]/);
    await expect(catchupKpi).toContainText(/1[\s.,]?750|1750|3[\s.,]?500|3500/);

    const api = new ApiClient();
    await api.signInAsGestionnaire();
    await expect
      .poll(async () => {
        const reports = await api.getDailyReports(
          todayIsoDate(),
          todayIsoDate(),
          TEST_COMMERCIAL_USERNAME,
        );
        const report = reports[0];
        return {
          collectionsAmount: report?.tontineCollectionsAmount ?? 0,
          catchupCount: report?.tontineCatchupCount ?? 0,
          catchupAmount: report?.tontineCatchupAmount ?? 0,
        };
      }, { timeout: 30_000 })
      .toMatchObject({
        collectionsAmount: expect.any(Number),
        catchupCount: expect.any(Number),
        catchupAmount: expect.any(Number),
      });

    const reports = await api.getDailyReports(
      todayIsoDate(),
      todayIsoDate(),
      TEST_COMMERCIAL_USERNAME,
    );
    const report = reports[0]!;
    expect(report.tontineCollectionsAmount ?? 0).toBeGreaterThanOrEqual(
      E2E_TONTINE_NORMAL_COLLECTION_AMOUNT,
    );
    expect(report.tontineCatchupCount ?? 0).toBeGreaterThanOrEqual(1);
    expect(report.tontineCatchupAmount ?? 0).toBeGreaterThanOrEqual(
      E2E_TONTINE_CATCHUP_COLLECTION_AMOUNT,
    );
  });

  test('secrétaire — badge cloche, liste, deep-link rapport', async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsSecretaire(page);
    await expect(page.getByTestId('e2e-app-shell')).toBeVisible();

    const bell = page.getByTestId('e2e-catchup-notif-bell');
    await expect(bell).toBeVisible({ timeout: 20_000 });

    const badge = page.getByTestId('e2e-catchup-notif-badge');
    await expect
      .poll(async () => Number(await badge.getAttribute('data-unread-count')), {
        timeout: 30_000,
      })
      .toBeGreaterThanOrEqual(1);

    await bell.click();
    const notifPanel = page.getByTestId('e2e-catchup-notif-panel');
    await expect(notifPanel).toBeVisible({ timeout: 15_000 });
    await expect(notifPanel.getByTestId('e2e-catchup-notif-item').first()).toBeVisible({
      timeout: 15_000,
    });

    const targetItem = notifPanel
      .getByTestId('e2e-catchup-notif-item')
      .filter({ hasText: TEST_COMMERCIAL_USERNAME })
      .filter({ hasText: /1[\s.,]?750|1750/ })
      .first();
    await expect(targetItem).toBeVisible({ timeout: 15_000 });
    await expect(targetItem).toHaveAttribute('data-operation-date', catchupDateIso);

    await targetItem.click();
    await expect(page).toHaveURL(/\/report\/daily/, { timeout: 20_000 });
    await expect(page.getByTestId('e2e-daily-report')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('e2e-daily-report-agent-select')).toContainText(
      TEST_COMMERCIAL_USERNAME,
      { timeout: 20_000 },
    );

    const reportPanel = page.getByTestId(`e2e-daily-report-panel-${TEST_COMMERCIAL_USERNAME}`);
    await expect(reportPanel).toBeVisible({ timeout: 20_000 });
    // Date métier du rattrapage : la collecte apparaît dans les KPI d'activité tontine.
    await expect(reportPanel.getByTestId('e2e-daily-report-tontine-collections-kpi')).toContainText(
      /1[\s.,]?750|1750|F\s*CFA|FCFA/i,
      { timeout: 20_000 },
    );
  });
});

function backdateTontineMemberRegistration(memberId: number, registrationTimestamp: string): void {
  execFileSync(
    'psql',
    [
      '-h',
      'localhost',
      '-U',
      'oec',
      '-d',
      'oec',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      `UPDATE tontine_member SET registration_date = TIMESTAMP '${registrationTimestamp}' WHERE id = ${memberId};`,
    ],
    {
      env: { ...process.env, PGPASSWORD: 'APP2024' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
}

/** Sélectionne une date ISO (yyyy-MM-dd) dans un mat-datepicker lié à un input testid. */
async function pickMatDate(page: Page, inputTestId: string, isoDate: string): Promise<void> {
  const [year, month, day] = isoDate.split('-').map(Number);
  const target = new Date(year!, month! - 1, day!);
  const input = page.getByTestId(inputTestId);

  // Ouvre via le toggle du même mat-form-field (cliquer l'input seul n'ouvre pas toujours le popup).
  await page
    .locator('mat-form-field')
    .filter({ has: page.getByTestId(inputTestId) })
    .locator('mat-datepicker-toggle button')
    .click();

  const calendar = page.locator('mat-calendar').last();
  await expect(calendar).toBeVisible({ timeout: 10_000 });

  // Navigue mois par mois jusqu'à la période cible (locale fr-FR).
  for (let i = 0; i < 24; i++) {
    const periodText = (await calendar.locator('.mat-calendar-period-button').innerText()).trim();
    const periodDate = parseFrenchCalendarPeriod(periodText);
    if (
      periodDate &&
      periodDate.getFullYear() === target.getFullYear() &&
      periodDate.getMonth() === target.getMonth()
    ) {
      break;
    }
    if (!periodDate || periodDate > target) {
      await calendar.locator('.mat-calendar-previous-button').click();
    } else {
      await calendar.locator('.mat-calendar-next-button').click();
    }
  }

  await calendar
    .locator('.mat-calendar-body-cell:not(.mat-calendar-body-disabled)')
    .filter({ hasText: new RegExp(`^\\s*${day}\\s*$`) })
    .first()
    .click();

  await expect(calendar).toBeHidden({ timeout: 5_000 });
  await expect(input).not.toHaveValue('', { timeout: 5_000 });
}

/** Parse « août 2026 » / « August 2026 » from the Material calendar period button. */
function parseFrenchCalendarPeriod(label: string): Date | null {
  const normalized = label.toLowerCase().replace(/\s+/g, ' ').trim();
  const months: Record<string, number> = {
    janvier: 0,
    february: 1,
    février: 1,
    fevrier: 1,
    march: 2,
    mars: 2,
    april: 3,
    avril: 3,
    may: 4,
    mai: 4,
    june: 5,
    juin: 5,
    july: 6,
    juillet: 6,
    august: 7,
    août: 7,
    aout: 7,
    september: 8,
    septembre: 8,
    october: 9,
    octobre: 9,
    november: 10,
    novembre: 10,
    december: 11,
    décembre: 11,
    decembre: 11,
  };
  const match = normalized.match(/^([a-zàâäéèêëïîôùûüÿç]+)\s+(\d{4})$/i);
  if (!match) {
    return null;
  }
  const monthIndex = months[match[1]!];
  if (monthIndex === undefined) {
    return null;
  }
  return new Date(Number(match[2]), monthIndex, 1);
}
