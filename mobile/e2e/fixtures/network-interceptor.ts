import { Page, Route } from '@playwright/test';
import { resolveMockResponse } from './mock-resolver';

export class NetworkInterceptor {
  constructor(private page: Page) {}

  /**
   * Initializes network interception for all API calls
   */
  async setup() {
    // Mock health check to simulate online backend
    await this.page.route('**/actuator/health', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'UP' }),
      });
    });

    await this.page.route('**/api/**', async (route: Route) => {
      const request = route.request();
      const url = new URL(request.url());
      const apiPath = url.pathname + url.search;
      const resolvedMock = resolveMockResponse(apiPath, request.method());

      if (resolvedMock) {
        console.log(`[Mock] Intercepting ${request.method()} ${apiPath}`);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(resolvedMock),
        });
      } else if (request.method() === 'GET' && url.pathname.includes('/api/commercial-stocks/available/')) {
        console.log(`[Mock] Intercepting ${request.method()} ${apiPath} with empty stock array`);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
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
