import { Page } from '@playwright/test';
import { jsonResponse, MOCK_DASHBOARD, MOCK_SESSION } from './mock-customer-api';

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
