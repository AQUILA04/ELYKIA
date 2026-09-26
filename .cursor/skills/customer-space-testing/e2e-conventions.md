# Conventions E2E — customer-space

## Préfixe data-testid

Format : `e2e-<feature>-<element>`

Exemples :

| Écran | testid |
|-------|--------|
| Splash | `e2e-splash-screen` |
| Auth téléphone | `e2e-auth-phone-input`, `e2e-auth-phone-submit` |
| Auth PIN | `e2e-auth-pin-input`, `e2e-auth-pin-submit` |
| Auth inscription | `e2e-auth-register-form`, `e2e-auth-register-photo`, `e2e-auth-register-submit` |
| Onboarding | `e2e-onboarding-page`, `e2e-onboarding-id-btn`, `e2e-onboarding-deposit-submit` |
| Dashboard | `e2e-dashboard-page`, `e2e-dashboard-credit-card` |
| Tabs | `e2e-customer-tabs`, `e2e-tab-dashboard` |

## OTP en E2E

Notification Hub n’est **pas** appelé. Playwright injecte `window.__E2E__` ; `AuthPage` court-circuite `sendOtp` / `verifyOtp` et accepte le code mock `123456` (`E2E_MOCK_OTP_CODE`). Les logs navigateur / test affichent `[E2E] OTP mock…`.

## Fixtures

- `e2e/fixtures/mock-customer-api.ts` — réponses JSON statiques
- `e2e/fixtures/customer-auth.ts` — `loginAsCustomer(page)`, `mockCustomerApi(page)`

## Tag smoke

Préfixer le titre du test : `test('@smoke boot redirects unauthenticated user to auth', ...)`
