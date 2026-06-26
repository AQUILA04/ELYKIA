import { Page } from '@playwright/test';
import {
  jsonResponse,
  MOCK_ARTICLES,
  MOCK_DASHBOARD,
  MOCK_ORDER_RESPONSE,
  MOCK_PURCHASE_DETAIL,
  MOCK_PURCHASE_ID,
  MOCK_PURCHASES,
  MOCK_RECOVERIES,
  MOCK_SESSION,
} from './mock-customer-api';

/** Remplit l'input natif d'un ion-input identifié par data-testid. */
export async function fillIonTestId(page: Page, testId: string, value: string): Promise<void> {
  const input = page.getByTestId(testId).locator('input.native-input:not(.cloned-input)');
  await input.fill(value);
  await input.blur();
}

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
        maskedName: 'Jean K.',
      }));
      return;
    }

    if (url.includes('/auth/login') && method === 'POST') {
      await route.fulfill(jsonResponse(MOCK_SESSION));
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
