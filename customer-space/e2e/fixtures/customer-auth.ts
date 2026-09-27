import { Page } from '@playwright/test';
import {
  E2E_MOCK_OTP_CODE,
  E2E_REGISTER_PHONE,
  jsonResponse,
  MOCK_ARTICLES,
  MOCK_DASHBOARD,
  MOCK_ORDER_RESPONSE,
  MOCK_PURCHASE_DETAIL,
  MOCK_PURCHASE_ID,
  MOCK_PURCHASES,
  MOCK_RECOVERIES,
  MOCK_REGISTER_SESSION,
  MOCK_SESSION,
  MOCK_TONTINE_DETAIL,
  MOCK_TONTINE_PAYMENTS,
  MOCK_TONTINES,
  MOCK_TOP_ARTICLE_TYPES,
} from './mock-customer-api';

export { E2E_MOCK_OTP_CODE, E2E_REGISTER_PHONE, MOCK_REGISTER_SESSION };

/** Remplit l'input natif d'un ion-input identifié par data-testid. */
export async function fillIonTestId(page: Page, testId: string, value: string): Promise<void> {
  const input = page.getByTestId(testId).locator('input.native-input:not(.cloned-input)');
  await input.fill(value);
  await input.blur();
}

/** PNG 1×1 minimal pour les uploads photo du wizard. */
export const E2E_TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/** Injecte le flag E2E et intercepte l'API customer. */
export async function mockCustomerApi(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as Window & { __E2E__?: boolean }).__E2E__ = true;
  });

  await page.route('**/api/customer/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/auth/check-phone') && method === 'POST') {
      await route.fulfill(jsonResponse({
        exists: true,
        pinConfigured: true,
        canRegister: false,
        maskedName: 'Jean K.',
        activationStatus: 'ACTIVE',
      }));
      return;
    }

    if (url.includes('/auth/register') && method === 'POST') {
      await route.fulfill(jsonResponse({
        ...MOCK_REGISTER_SESSION,
      }));
      return;
    }

    if (url.includes('/onboarding/status') && method === 'GET') {
      await route.fulfill(jsonResponse({
        clientId: MOCK_SESSION.clientId,
        fullName: MOCK_SESSION.fullName,
        phone: MOCK_SESSION.phone,
        activationStatus: 'ACTIVE',
        idDocumentUploaded: true,
        initialDepositStatus: 'NONE',
      }));
      return;
    }

    if (url.includes('/auth/login') && method === 'POST') {
      await route.fulfill(jsonResponse(MOCK_SESSION));
      return;
    }

    if (url.includes('/auth/send-otp') && method === 'POST') {
      // Contournement OTP : en mode __E2E__ l'app n'appelle pas cet endpoint,
      // mais on logue quand même un code fixe pour les parcours qui l'utilisent.
      console.log(`[E2E] send-otp mock — phone OTP code=${E2E_MOCK_OTP_CODE}`);
      await route.fulfill(jsonResponse({
        sessionId: '00000000-0000-0000-0000-000000000001',
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
        channel: 'SMS',
        // Champ informatif pour les tests / debug (non consommé par l'API réelle)
        debugOtpCode: E2E_MOCK_OTP_CODE,
      }, 202));
      return;
    }

    if (url.includes('/auth/verify-otp') && method === 'POST') {
      await route.fulfill(jsonResponse({
        verified: true,
        otpProofToken: 'e2e-mock-otp-proof',
      }));
      return;
    }

    if (url.includes('/auth/setup-pin') && method === 'POST') {
      await route.fulfill(jsonResponse(MOCK_SESSION));
      return;
    }

    if (url.includes('/dashboard') && method === 'GET') {
      await route.fulfill(jsonResponse(MOCK_DASHBOARD));
      return;
    }

    if (url.match(/\/purchases\/[^/]+\/mobile-money-recipients$/) && method === 'GET') {
      await route.fulfill(jsonResponse({
        collector: 'COM001',
        collectorName: 'Jean Commercial',
        mixxNumber: '90123456',
        moovNumber: '97654321',
        mixxUsesGlobalDefault: false,
        moovUsesGlobalDefault: true,
      }));
      return;
    }

    if (url.match(/\/purchases\/[^/]+\/recoveries$/) && method === 'GET') {
      await route.fulfill(jsonResponse(MOCK_RECOVERIES));
      return;
    }

    if (url.match(/\/purchases\/[^/]+$/) && method === 'GET') {
      await route.fulfill(jsonResponse(MOCK_PURCHASE_DETAIL));
      return;
    }

    if (url.endsWith('/purchases') && method === 'GET') {
      await route.fulfill(jsonResponse(MOCK_PURCHASES));
      return;
    }

    if (url.match(/\/tontine\/contributions\/[^/]+\/payments/) && method === 'GET') {
      await route.fulfill(jsonResponse(MOCK_TONTINE_PAYMENTS));
      return;
    }

    if (url.match(/\/tontine\/contributions\/[^/]+\/mobile-money-recipients$/) && method === 'GET') {
      await route.fulfill(jsonResponse({
        collector: 'COM_TONTINE',
        collectorName: 'Commercial Tontine',
        mixxNumber: '90001111',
        moovNumber: '90002222',
      }));
      return;
    }

    if (url.match(/\/tontine\/contributions\/[^/]+\/mobile-money$/) && method === 'POST') {
      await route.fulfill(jsonResponse({
        id: 'tp-mm-1',
        reference: 'TXN-TONTINE-1',
        amount: 500,
        collectionDate: '2026-09-17T10:00:00',
        deliveryCollection: false,
        societyShareAmount: 0,
        status: 'INITIE',
      }, 201));
      return;
    }

    if (url.match(/\/tontine\/contributions\/[^/]+$/) && method === 'GET') {
      await route.fulfill(jsonResponse(MOCK_TONTINE_DETAIL));
      return;
    }

    if (url.endsWith('/tontine/contributions') && method === 'GET') {
      await route.fulfill(jsonResponse(MOCK_TONTINES));
      return;
    }

    if (url.includes('/articles/top-types') && method === 'GET') {
      await route.fulfill(jsonResponse(MOCK_TOP_ARTICLE_TYPES));
      return;
    }

    if (url.includes('/articles') && method === 'GET') {
      await route.fulfill(jsonResponse(MOCK_ARTICLES));
      return;
    }

    if (url.endsWith('/orders') && method === 'POST') {
      await route.fulfill(jsonResponse(MOCK_ORDER_RESPONSE));
      return;
    }

    if (url.includes('/recoveries/mobile-money') && method === 'POST') {
      await route.fulfill(jsonResponse({
        id: 'mm-1',
        installmentNumber: 3,
        amount: 35_000,
        paymentDate: '2026-06-18',
        status: 'INITIE',
      }));
      return;
    }

    await route.fulfill(jsonResponse({ message: 'Not mocked' }, 404));
  });
}

/**
 * Mock du parcours auto-inscription + onboarding pour {@link E2E_REGISTER_PHONE}.
 * État mutable : pièce / dépôt mis à jour au fil des POST.
 */
export async function mockRegistrationOnboardingFlow(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as Window & { __E2E__?: boolean }).__E2E__ = true;
  });

  const state = {
    idDocumentUploaded: false,
    initialDepositStatus: 'NONE' as 'NONE' | 'INITIE' | 'VALIDE',
    deposit: null as null | {
      id: number;
      status: string;
      mobileMoneyAmount: number;
      mobileMoneyPhone: string;
      mobileMoneyReference: string;
    },
    activated: false,
  };

  await page.route('**/api/customer/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/auth/check-phone') && method === 'POST') {
      await route.fulfill(jsonResponse({
        exists: false,
        pinConfigured: false,
        canRegister: true,
      }));
      return;
    }

    if (url.includes('/auth/send-otp') && method === 'POST') {
      console.log(`[E2E] OTP mock pour ${E2E_REGISTER_PHONE} → ${E2E_MOCK_OTP_CODE}`);
      await route.fulfill(jsonResponse({
        sessionId: '00000000-0000-0000-0000-000000000069',
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
        channel: 'SMS',
        debugOtpCode: E2E_MOCK_OTP_CODE,
      }, 202));
      return;
    }

    if (url.includes('/auth/verify-otp') && method === 'POST') {
      await route.fulfill(jsonResponse({
        verified: true,
        otpProofToken: 'e2e-mock-otp-proof',
      }));
      return;
    }

    if (url.includes('/auth/register') && method === 'POST') {
      await route.fulfill(jsonResponse({ ...MOCK_REGISTER_SESSION }));
      return;
    }

    if (url.includes('/dashboard') && method === 'GET') {
      await route.fulfill(jsonResponse({
        clientId: MOCK_REGISTER_SESSION.clientId,
        fullName: MOCK_REGISTER_SESSION.fullName,
        activeCreditCount: 0,
        totalCreditAmount: 0,
        totalPaidAmount: 0,
        totalRemainingAmount: 0,
        nextPaymentAmount: null,
        nextPaymentDate: null,
        nextPaymentCreditId: null,
        nextInstallmentNumber: null,
        progressPercent: 0,
        activationStatus: state.activated ? 'ACTIVE' : 'PENDING',
        idDocumentUploaded: state.idDocumentUploaded,
        initialDepositStatus: state.initialDepositStatus,
        recentActivities: [],
      }));
      return;
    }

    if (url.includes('/onboarding/status') && method === 'GET') {
      await route.fulfill(jsonResponse({
        clientId: MOCK_REGISTER_SESSION.clientId,
        fullName: MOCK_REGISTER_SESSION.fullName,
        phone: E2E_REGISTER_PHONE,
        activationStatus: state.activated ? 'ACTIVE' : 'PENDING',
        idDocumentUploaded: state.idDocumentUploaded,
        initialDepositStatus: state.initialDepositStatus,
        cardType: state.idDocumentUploaded ? 'CENI' : null,
        cardID: state.idDocumentUploaded ? 'E2E-CARD-70155169' : null,
      }));
      return;
    }

    if (url.includes('/onboarding/id-document') && method === 'POST') {
      state.idDocumentUploaded = true;
      await route.fulfill(jsonResponse({
        clientId: MOCK_REGISTER_SESSION.clientId,
        fullName: MOCK_REGISTER_SESSION.fullName,
        phone: E2E_REGISTER_PHONE,
        activationStatus: 'PENDING',
        idDocumentUploaded: true,
        initialDepositStatus: state.initialDepositStatus,
        cardType: 'CENI',
        cardID: 'E2E-CARD-70155169',
      }));
      return;
    }

    if (url.includes('/onboarding/mobile-money-recipients') && method === 'GET') {
      await route.fulfill(jsonResponse({
        collector: 'COM001',
        collectorName: 'Commercial E2E',
        mixxNumber: '90001111',
        moovNumber: '90002222',
      }));
      return;
    }

    if (url.includes('/onboarding/initial-deposit') && method === 'POST') {
      state.initialDepositStatus = 'INITIE';
      state.deposit = {
        id: 9,
        status: 'INITIE',
        mobileMoneyAmount: 50_000,
        mobileMoneyPhone: E2E_REGISTER_PHONE,
        mobileMoneyReference: 'TXN-E2E-70155169',
      };
      await route.fulfill(jsonResponse(state.deposit, 201));
      return;
    }

    if (url.includes('/onboarding/initial-deposit') && method === 'GET') {
      if (!state.deposit) {
        await route.fulfill(jsonResponse({ message: 'Aucun dépôt' }, 404));
        return;
      }
      await route.fulfill(jsonResponse(state.deposit));
      return;
    }

    await route.fulfill(jsonResponse({ message: `Not mocked: ${method} ${url}` }, 404));
  });
}

/** Session pré-chargée (parcours post-login). */
export async function loginAsCustomer(page: Page): Promise<void> {
  await mockCustomerApi(page);
  const session = { ...MOCK_SESSION, isAuthenticated: true };
  await page.addInitScript((s) => {
    localStorage.setItem('elykia_customer_session', JSON.stringify(s));
  }, session);
}

/** Parcours première connexion : téléphone sans PIN configuré. */
export async function mockNewCustomerAuth(page: Page): Promise<void> {
  await mockCustomerApi(page);
  await page.route('**/api/customer/auth/check-phone', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill(jsonResponse({
        exists: true,
        pinConfigured: false,
        maskedName: 'Marie A.',
      }));
    } else {
      await route.continue();
    }
  });
}

export { MOCK_PURCHASE_ID };
