import { test, expect } from '@playwright/test';
import { E2E_TINY_PNG, mockCustomerApi } from '../../fixtures/customer-auth';

test.describe('Company dynamic branding', () => {
  test('@smoke applies custom company name, logo, colors, and localStorage cache on auth screen', async ({
    page,
  }) => {
    await mockCustomerApi(page);

    await page.route('**/api/public/company/logo*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: E2E_TINY_PNG,
      });
    });

    await page.route('**/api/public/company/branding', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { ETag: '"company-v9"' },
        body: JSON.stringify({
          companyName: 'SOLEIL MICROFINANCE',
          shortName: 'Soleil',
          tagline: 'Proximité & Confiance',
          address: 'Lomé, Togo',
          phone: '90112233',
          email: 'contact@soleil.tg',
          website: null,
          taxId: null,
          primaryColor: '#065f46',
          secondaryColor: '#0d9488',
          accentColor: '#f59e0b',
          sidebarBgColor: '#042f2e',
          sidebarTextColor: '#e2f1ed',
          backgroundColor: '#f1f7f5',
          hasLogo: true,
          logoFilename: 'soleil.png',
          logoUrl: '/api/public/company/logo?v=9',
          themeVersion: 9,
        }),
      });
    });

    await page.goto('/auth');
    await expect(page.getByTestId('e2e-brand-company')).toHaveText('SOLEIL MICROFINANCE', {
      timeout: 15_000,
    });
    await expect(page.getByTestId('e2e-brand-app')).toHaveText('Soleil');
    await expect(page.getByTestId('e2e-brand-logo')).toBeVisible();

    const appliedVars = await page.evaluate(() => ({
      navyMid: document.documentElement.style.getPropertyValue('--elyk-navy-mid').trim(),
      gold: document.documentElement.style.getPropertyValue('--elyk-gold').trim(),
      title: document.title,
      cached: localStorage.getItem('elykia_customer_company_branding_v1'),
    }));

    expect(appliedVars.navyMid).toBe('#065f46');
    expect(appliedVars.gold).toBe('#f59e0b');
    expect(appliedVars.title).toBe('Soleil — Espace Client');
    expect(appliedVars.cached).toBeTruthy();
    const cached = JSON.parse(appliedVars.cached!) as {
      etag: string;
      data: { companyName: string; themeVersion: number };
    };
    expect(cached.etag).toBe('"company-v9"');
    expect(cached.data.companyName).toBe('SOLEIL MICROFINANCE');
    expect(cached.data.themeVersion).toBe(9);
  });
});
