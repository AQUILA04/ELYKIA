import { test, expect } from '@playwright/test';
import { loginAsGestionnaire, loginAsRecoveryManager } from '../fixtures/auth';
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

  test('un chef de recouvrement sans KPI financiers arrive sur l\'onglet Recouvrement', async ({ page }) => {
    await loginAsRecoveryManager(page);
    await page.goto('/report/daily');
    await expect(page).toHaveURL(/\/report\/daily\/classic/);
    await expect(page.getByTestId('e2e-daily-report-tab-recovery')).toBeVisible();
  });
});
