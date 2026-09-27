import { test, expect } from '@playwright/test';
import {
  E2E_MOCK_OTP_CODE,
  E2E_REGISTER_PHONE,
  E2E_TINY_PNG,
  fillIonTestId,
  mockRegistrationOnboardingFlow,
} from '../../fixtures/customer-auth';

/**
 * Parcours complet auto-inscription (numéro 70155169) + dossier onboarding.
 *
 * OTP : Notification Hub est court-circuité via `window.__E2E__` (injecté par la fixture).
 * Le code mock {@link E2E_MOCK_OTP_CODE} est saisi pour coller au parcours UI et apparaît
 * dans les logs navigateur (`[E2E] OTP mock…`). Il n'y a pas de SMS réel en CI.
 */
test.describe('Auth registration + onboarding', () => {
  test('full self-registration then ID + deposit for 70155169', async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.text().includes('[E2E]')) {
        console.log(msg.text());
      }
    });

    await mockRegistrationOnboardingFlow(page);
    await page.goto('/auth');
    await expect(page.getByTestId('e2e-auth-page')).toBeVisible();

    // 1. Téléphone inconnu → inscription
    await fillIonTestId(page, 'e2e-auth-phone-input', E2E_REGISTER_PHONE);
    const checkPhone = page.waitForResponse(
      (r) => r.url().includes('/auth/check-phone') && r.ok(),
    );
    await page.getByTestId('e2e-auth-phone-submit').click();
    await checkPhone;

    // 2. OTP mock (bypass __E2E__)
    await expect(page.getByTestId('e2e-auth-otp-input')).toBeVisible({ timeout: 10_000 });
    console.log(`[E2E] Contournement OTP — code mock à saisir: ${E2E_MOCK_OTP_CODE}`);
    await fillIonTestId(page, 'e2e-auth-otp-input', E2E_MOCK_OTP_CODE);
    await page.getByTestId('e2e-auth-otp-submit').click();

    // 3. Formulaire inscription
    await expect(page.getByTestId('e2e-auth-register-form')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('e2e-auth-register-photo').setInputFiles({
      name: 'profil.png',
      mimeType: 'image/png',
      buffer: E2E_TINY_PNG,
    });
    await fillIonTestId(page, 'e2e-auth-register-firstname', 'Awa');
    await fillIonTestId(page, 'e2e-auth-register-lastname', 'Mensah');
    await fillIonTestId(page, 'e2e-auth-register-address', 'Rue du Commerce');
    await fillIonTestId(page, 'e2e-auth-register-quarter', 'Tokoin');
    await fillIonTestId(page, 'e2e-auth-register-dob', '1995-06-15');
    await fillIonTestId(page, 'e2e-auth-register-occupation', 'Commerçante');

    await page.getByTestId('e2e-auth-register-card-type').click();
    await page.getByRole('radio', { name: "Carte d'électeur" }).click();

    await fillIonTestId(page, 'e2e-auth-register-card-id', 'E2E-CARD-70155169');
    await page.getByTestId('e2e-auth-register-continue').click();

    // 4. PIN inscription
    await expect(page.getByTestId('e2e-auth-register-pin')).toBeVisible({ timeout: 10_000 });
    await fillIonTestId(page, 'e2e-auth-register-pin', '2468');
    await fillIonTestId(page, 'e2e-auth-register-pin-confirm', '2468');
    const register = page.waitForResponse(
      (r) => r.url().includes('/auth/register') && r.ok(),
    );
    await page.getByTestId('e2e-auth-register-submit').click();
    await register;

    // 5. Dashboard limité PENDING
    await expect(page.getByTestId('e2e-dashboard-page')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('e2e-dashboard-pending')).toBeVisible();
    await page.getByTestId('e2e-dashboard-onboarding-link').click();

    // 6. Onboarding — pièce d'identité
    await expect(page.getByTestId('e2e-onboarding-page')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('e2e-onboarding-pending')).toBeVisible();
    await page.getByTestId('e2e-onboarding-id-btn').click();
    await page.getByTestId('e2e-onboarding-card-photo').setInputFiles({
      name: 'cni.png',
      mimeType: 'image/png',
      buffer: E2E_TINY_PNG,
    });
    const uploadId = page.waitForResponse(
      (r) => r.url().includes('/onboarding/id-document') && r.ok(),
    );
    await page.getByTestId('e2e-onboarding-id-submit').click();
    await uploadId;

    // 7. Dépôt initial déclaratif
    await expect(page.getByTestId('e2e-onboarding-deposit-btn')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('e2e-onboarding-deposit-btn').click();
    await expect(page.getByTestId('e2e-onboarding-deposit-form')).toBeVisible();
    await fillIonTestId(page, 'e2e-onboarding-deposit-phone', E2E_REGISTER_PHONE);
    await fillIonTestId(page, 'e2e-onboarding-deposit-amount', '50000');
    await fillIonTestId(page, 'e2e-onboarding-deposit-reference', 'TXN-E2E-70155169');
    const deposit = page.waitForResponse(
      (r) => r.url().includes('/onboarding/initial-deposit') && r.request().method() === 'POST' && r.ok(),
    );
    await page.getByTestId('e2e-onboarding-deposit-submit').click();
    await deposit;

    await expect(page.getByText('Déclaration de dépôt envoyée.')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Statut : INITIE')).toBeVisible();
  });
});
