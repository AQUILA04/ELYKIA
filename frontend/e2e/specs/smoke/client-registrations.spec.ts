import { Page, expect, test } from '@playwright/test';

/** Même numéro que le parcours customer-space `register-onboarding.spec.ts`. */
const E2E_REGISTER_PHONE = '70155169';
const E2E_CLIENT_ID = 701;

function buildFakeJwt(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: 'ges003',
    exp: Math.floor(Date.now() / 1000) + 86_400,
  })).toString('base64url');
  return `${header}.${payload}.e2e`;
}

async function seedGestionnaireSession(page: Page): Promise<void> {
  const token = buildFakeJwt();
  const user = {
    accessToken: token,
    refreshToken: 'e2e-refresh',
    id: 3,
    username: 'ges003',
    email: 'ges003@elykia.test',
    roles: [
      'ROLE_ADMIN',
      'ROLE_VALIDATE_CLIENT_REGISTRATION',
      'ROLE_CONSULT_CLIENT',
      'ROLE_EDIT_CLIENT',
    ],
    profil: 'GESTIONNAIRE',
    mustChangePassword: false,
    agencyId: 1,
  };

  await page.addInitScript(({ authToken, currentUser }) => {
    sessionStorage.setItem('elykia.skipRemoteConfig', '1');
    localStorage.setItem('auth-token', authToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('agencyId', '1');
  }, { authToken: token, currentUser: user });
}

async function mockClientRegistrationsApi(page: Page): Promise<void> {
  let activated = false;

  const pendingRow = {
    clientId: E2E_CLIENT_ID,
    firstname: 'Awa',
    lastname: 'Mensah',
    fullName: 'Awa Mensah',
    phone: E2E_REGISTER_PHONE,
    address: 'Rue du Commerce',
    quarter: 'Tokoin',
    dateOfBirth: '1995-06-15',
    occupation: 'Commerçante',
    cardType: 'CENI',
    cardID: 'E2E-CARD-70155169',
    profilPhotoUrl: null,
    cardPhotoUrl: 'data:image/png;base64,aaa',
    activationStatus: 'PENDING',
    collector: null,
    tontineCollector: null,
    registeredAt: new Date().toISOString(),
    hasInitialDeposit: true,
    initialDepositId: 9,
    initialDepositStatus: 'INITIE',
    initialDepositAmount: 50_000,
    initialDepositPhone: E2E_REGISTER_PHONE,
    initialDepositReference: 'TXN-E2E-70155169',
  };

  await page.route('**/api/v1/promoters/all**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { username: 'COM001', firstname: 'Jean', lastname: 'Commercial' },
          { username: 'COM_TONTINE', firstname: 'Toni', lastname: 'Tontine' },
        ],
      }),
    });
  });

  await page.route('**/api/v1/client-registrations**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === 'GET' && !/\/\d+(\/|$)/.test(url.split('client-registrations')[1] || '')) {
      const content = activated ? [] : [pendingRow];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { content, totalElements: content.length },
        }),
      });
      return;
    }

    if (method === 'POST' && url.includes(`/${E2E_CLIENT_ID}/activate`)) {
      activated = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            ...pendingRow,
            activationStatus: 'ACTIVE',
            collector: 'COM001',
            initialDepositStatus: 'VALIDE',
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: pendingRow }),
    });
  });

  // Évite que le shell casse sur d'autres appels API (notifications, etc.)
  await page.route('**/api/**', async (route) => {
    if (route.request().url().includes('client-registrations')
      || route.request().url().includes('promoters/all')) {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });
}

test.describe('Inscriptions clients — validation BO', () => {
  test('valide l\'inscription PENDING 70155169 avec commercial et dépôt', async ({ page }) => {
    await seedGestionnaireSession(page);
    await mockClientRegistrationsApi(page);

    await page.goto('/client-registrations');
    await expect(page.getByTestId('e2e-client-registrations-page')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('e2e-client-registration-row')).toContainText(E2E_REGISTER_PHONE);

    await page.getByTestId('e2e-client-registration-open').click();
    await expect(page.getByTestId('e2e-client-registration-detail')).toBeVisible();
    await expect(page.getByTestId('e2e-client-registration-detail')).toContainText('Awa Mensah');
    await expect(page.getByTestId('e2e-client-registration-detail')).toContainText('50');

    await page.getByTestId('e2e-client-registration-collector').selectOption('COM001');

    const activate = page.waitForResponse(
      (r) => r.url().includes(`/client-registrations/${E2E_CLIENT_ID}/activate`) && r.ok(),
    );
    await page.getByTestId('e2e-client-registration-activate').click();
    await activate;

    await expect(page.getByTestId('e2e-client-registration-row')).toHaveCount(0, { timeout: 10_000 });
  });
});
