# Conventions E2E — customer-space

## Préfixe data-testid

Format : `e2e-<feature>-<element>`

Exemples :

| Écran | testid |
|-------|--------|
| Splash | `e2e-splash-screen` |
| Auth téléphone | `e2e-auth-phone-input`, `e2e-auth-phone-submit` |
| Auth PIN | `e2e-auth-pin-input`, `e2e-auth-pin-submit` |
| Dashboard | `e2e-dashboard-page`, `e2e-dashboard-credit-card` |
| Tabs | `e2e-customer-tabs`, `e2e-tab-dashboard` |

## Fixtures

- `e2e/fixtures/mock-customer-api.ts` — réponses JSON statiques
- `e2e/fixtures/customer-auth.ts` — `loginAsCustomer(page)`, `mockCustomerApi(page)`

## Tag smoke

Préfixer le titre du test : `test('@smoke boot redirects unauthenticated user to auth', ...)`
