import { test, expect } from '@playwright/test';
import { loginAsGestionnaire, loginAsRecoveryManager, loginAsSecretaire } from '../fixtures/auth';
import { TEST_COMMERCIAL_USERNAME } from '../fixtures/test-data';

/**
 * Nouveau rapport commerciaux : cockpit équipe, fiche, bascule vers l'ancienne présentation, visite guidée.
 * La visite ne démarre jamais seule sous Playwright (navigator.webdriver) ; `?tour=1` la force.
 */
test.describe('Rapport commerciaux — cockpit', () => {
  test('le menu ouvre le cockpit avec les 4 chiffres, les alertes et le tableau équipe', async ({ page }) => {
    await loginAsGestionnaire(page);
    await page.getByTestId('e2e-sidebar-daily-report').click();
    await expect(page).toHaveURL(/\/report\/daily(\?|$)/);
    await expect(page.getByTestId('e2e-report-cockpit')).toBeVisible();
    await expect(page.getByTestId('e2e-report-cockpit-kpis')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('e2e-report-cockpit-cash-due')).toContainText('F');
    await expect(page.getByTestId('e2e-report-cockpit-alerts')).toBeVisible();
    await expect(page.getByTestId('e2e-report-cockpit-team')).toBeVisible();
    await expect(page.getByTestId('e2e-report-cockpit-cash')).toBeVisible();
    await expect(page.getByTestId('e2e-guided-tour')).toHaveCount(0);
  });

  test('les filtres de période sont gardés dans l\'URL', async ({ page }) => {
    await loginAsGestionnaire(page);
    await page.goto('/report/daily');
    await expect(page.getByTestId('e2e-report-cockpit-kpis')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('e2e-report-period-month').click();
    await expect(page).toHaveURL(/period=month/);
    await expect(page.getByTestId('e2e-report-period-month')).toHaveAttribute('aria-pressed', 'true');
  });

  test('bascule vers l\'ancienne présentation puis retour', async ({ page }) => {
    await loginAsGestionnaire(page);
    await page.goto('/report/daily');
    await page.getByTestId('e2e-report-cockpit-classic-link').click();
    await expect(page).toHaveURL(/\/report\/daily\/classic/);
    await expect(page.getByTestId('e2e-daily-report')).toBeVisible();
    await page.getByTestId('e2e-daily-report-new-ui-link').click();
    await expect(page.getByTestId('e2e-report-cockpit')).toBeVisible();
  });

  test('la fiche commercial affiche le rapprochement et revient au cockpit', async ({ page }) => {
    await loginAsGestionnaire(page);
    await page.goto(`/report/daily/commercials/${TEST_COMMERCIAL_USERNAME}?period=month`);
    await expect(page.getByTestId('e2e-commercial-sheet')).toBeVisible();
    await expect(page.getByTestId('e2e-commercial-sheet-equation')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('e2e-commercial-sheet-cash-due')).toBeVisible();
    await expect(page.getByTestId('e2e-commercial-sheet-status')).toBeVisible();
    await page.getByTestId('e2e-commercial-sheet-back').click();
    await expect(page).toHaveURL(/\/report\/daily\?.*period=month/);
  });

  test('la visite guidée se lance, avance et se ferme', async ({ page }) => {
    await loginAsGestionnaire(page);
    await page.goto('/report/daily?tour=1');
    const tour = page.getByTestId('e2e-guided-tour');
    await expect(tour).toBeVisible({ timeout: 20_000 });
    await expect(tour).toContainText('Étape 1 /');
    await page.getByTestId('e2e-guided-tour-next').click();
    await expect(tour).toContainText('Étape 2 /');
    await page.keyboard.press('Escape');
    await expect(tour).toHaveCount(0);
    await page.getByTestId('e2e-report-cockpit-tour').click();
    await expect(page.getByTestId('e2e-guided-tour')).toBeVisible();
    await page.getByTestId('e2e-guided-tour-skip').click();
    await expect(page.getByTestId('e2e-guided-tour')).toHaveCount(0);
  });

  test('Versements : totaux par compte, filtre surplus et retour au cockpit', async ({ page }) => {
    await loginAsGestionnaire(page);
    await page.goto('/report/daily?period=month');
    await page.getByTestId('e2e-report-cockpit-deposits-link').click();
    await expect(page).toHaveURL(/\/report\/daily\/deposits\?.*period=month/);
    await expect(page.getByTestId('e2e-report-deposits-totals')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('e2e-report-deposits-table')).toBeVisible();
    await page.getByTestId('e2e-report-deposits-surplus-only').click();
    await expect(page).toHaveURL(/surplus=1/);
    await page.getByTestId('e2e-report-deposits-remittance').click();
    await expect(page.getByTestId('e2e-report-deposits-remittance-panel')).toBeVisible();
    await page.getByTestId('e2e-report-deposits-back').click();
    await expect(page.getByTestId('e2e-report-cockpit')).toBeVisible();
  });

  test('Journal : liste des opérations et filtre par type', async ({ page }) => {
    await loginAsGestionnaire(page);
    await page.goto('/report/daily?period=month');
    await page.getByTestId('e2e-report-cockpit-journal-link').click();
    await expect(page.getByTestId('e2e-report-journal')).toBeVisible();
    await expect(page.getByTestId('e2e-report-journal-table')).toBeVisible({ timeout: 20_000 });
    const firstType = page.getByTestId('e2e-report-journal-types').locator('button').first();
    if (await firstType.count()) {
      await firstType.click();
      await expect(page).toHaveURL(/type=/);
      await expect(firstType).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('un chef de recouvrement sans KPI financiers arrive sur le recouvrement terrain', async ({ page }) => {
    await loginAsRecoveryManager(page);
    await page.goto('/report/daily');
    await expect(page).toHaveURL(/\/report\/daily\/recovery/);
    await expect(page.getByTestId('e2e-report-recovery-kpis')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('e2e-report-recovery-manager-select')).toHaveCount(0);
    // L'ancienne présentation reste accessible : onglet Recouvrement.
    await page.getByTestId('e2e-report-recovery-classic-link').click();
    await expect(page).toHaveURL(/\/report\/daily\/classic/);
    await expect(page.getByTestId('e2e-daily-report-tab-recovery')).toBeVisible();
  });

  test('Recouvrement terrain : le gestionnaire ouvre la page depuis le cockpit', async ({ page }) => {
    await loginAsGestionnaire(page);
    await page.goto('/report/daily?period=month');
    await page.getByTestId('e2e-report-cockpit-recovery-link').click();
    await expect(page).toHaveURL(/\/report\/daily\/recovery\?.*period=month/);
    await expect(page.getByTestId('e2e-report-recovery-kpis')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('e2e-report-recovery-manager-select')).toBeVisible();
  });

  test('Remise au gestionnaire : le cockpit ouvre la nouvelle page', async ({ page }) => {
    await loginAsGestionnaire(page);
    await page.goto('/report/daily');
    await page.getByTestId('e2e-report-cockpit-remittance-link').click();
    await expect(page).toHaveURL(/\/report\/daily\/remittance/);
    await expect(page.getByTestId('e2e-report-remittance-kpis')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('e2e-report-remittance-month')).not.toBeEmpty();
    await page.getByTestId('e2e-report-remittance-prev-month').click();
    await expect(page).toHaveURL(/month=/);
  });

  // Le secrétaire du seed a les KPI financiers : il voit le cockpit et ouvre la remise par le bouton.
  // Sans ces KPI, /report/daily le renvoie directement sur la remise (vérifié à la main).
  test('un secrétaire ouvre la remise au gestionnaire depuis le cockpit', async ({ page }) => {
    await loginAsSecretaire(page);
    await page.goto('/report/daily');
    await page.getByTestId('e2e-report-cockpit-remittance-link').click();
    await expect(page).toHaveURL(/\/report\/daily\/remittance/);
    await expect(page.getByTestId('e2e-report-remittance-kpis')).toBeVisible({ timeout: 20_000 });
  });
});
