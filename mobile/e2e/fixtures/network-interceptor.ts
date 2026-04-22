import { Page, Route } from '@playwright/test';
import { MockData } from './mock-data';

export class NetworkInterceptor {
  constructor(private page: Page) {}

  /**
   * Initializes network interception for all API calls
   */
  async setup() {
    await this.page.route('**/api/**', async (route: Route) => {
      const request = route.request();
      const url = new URL(request.url());
      const apiPath = url.pathname + url.search;

      // Find if we have a mock for this exact path
      if (MockData[apiPath]) {
        console.log(`[Mock] Intercepting ${request.method()} ${apiPath}`);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MockData[apiPath]),
        });
      } else if (request.method() === 'POST' && url.pathname.includes('/auth/signin')) {
        // Special case for login if the path doesn't match exactly
        console.log(`[Mock] Intercepting Login ${apiPath}`);
        const loginPath = Object.keys(MockData).find(k => k.includes('/auth/signin'));
        if (loginPath) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MockData[loginPath]),
          });
        } else {
          await route.continue();
        }
      } else {
        console.log(`[Mock-Warning] No mock found for ${apiPath}, intercepting with empty success to prevent failure.`);
        // For offline initialization, if we miss a mock, we should just return a generic success
        // based on the standard response structure of the backend
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'OK',
            statusCode: 200,
            message: 'default.message.success',
            service: 'MOCK-SERVICE',
            data: { content: [], page: { size: 10, number: 0, totalElements: 0, totalPages: 0 } }
          }),
        });
      }
    });
  }

  /**
   * Simulates a completely disconnected state
   */
  async goOffline() {
    await this.page.context().setOffline(true);
  }

  /**
   * Restores connectivity (but still intercepted)
   */
  async goOnline() {
    await this.page.context().setOffline(false);
  }
}
