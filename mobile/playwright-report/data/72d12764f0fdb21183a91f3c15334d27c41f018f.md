# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: offline-smoke.spec.ts >> Offline Smoke @smoke >> dashboard shell is reachable after login
- Location: e2e\specs\offline-smoke.spec.ts:6:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8100/
Call log:
  - navigating to "http://localhost:8100/", waiting until "load"

```

# Test source

```ts
  1  | import { expect, Page } from '@playwright/test';
  2  | 
  3  | async function dismissBlockingAlerts(page: Page) {
  4  |   const alert = page.locator('ion-alert').first();
  5  |   if (!(await alert.isVisible({ timeout: 2000 }).catch(() => false))) {
  6  |     return;
  7  |   }
  8  | 
  9  |   const knownButtons = [
  10 |     'Continuer (données limitées)',
  11 |     'Continuer',
  12 |     'OK',
  13 |     'Fermer',
  14 |     'Confirmer',
  15 |   ];
  16 |   for (const label of knownButtons) {
  17 |     const button = page.locator('ion-alert button').filter({ hasText: label }).first();
  18 |     if (await button.isVisible().catch(() => false)) {
  19 |       await button.click();
  20 |       await alert.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  21 |       return;
  22 |     }
  23 |   }
  24 | 
  25 |   // Fallback: click the first visible button in case text changed.
  26 |   const anyButton = page.locator('ion-alert button').first();
  27 |   if (await anyButton.isVisible().catch(() => false)) {
  28 |     await anyButton.click();
  29 |     await alert.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  30 |   }
  31 | }
  32 | 
  33 | async function waitForTabsAfterInitialization(page: Page, timeoutMs: number) {
  34 |   const deadline = Date.now() + timeoutMs;
  35 | 
  36 |   while (Date.now() < deadline) {
  37 |     if (/\/tabs/.test(page.url())) {
  38 |       return;
  39 |     }
  40 | 
  41 |     await dismissBlockingAlerts(page);
  42 |     await page.waitForTimeout(500);
  43 |   }
  44 | 
  45 |   await expect(page).toHaveURL(/\/tabs/, { timeout: 0 });
  46 | }
  47 | 
  48 | async function fillIonInput(page: Page, placeholder: string, value: string) {
  49 |   const input = page.locator(`input.native-input[placeholder="${placeholder}"]`).first();
  50 |   await input.waitFor({ state: 'visible', timeout: 60_000 });
  51 |   await input.fill(value);
  52 |   await input.blur();
  53 | }
  54 | 
  55 | export async function loginAndWaitForTabs(page: Page, timeoutMs = 90_000) {
  56 |   // Static http-server needs SPA fallback; always boot from / then wait for login route.
> 57 |   await page.goto('/', { waitUntil: 'load', timeout: 60_000 });
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8100/
  58 |   await expect(page).toHaveURL(/\/login/, { timeout: 60_000 });
  59 |   await expect(
  60 |     page.locator('input.native-input[placeholder="Saisissez votre nom d\'utilisateur"]'),
  61 |   ).toBeVisible({ timeout: 60_000 });
  62 | 
  63 |   await fillIonInput(page, "Saisissez votre nom d'utilisateur", 'COM002');
  64 |   await fillIonInput(page, 'Saisissez votre mot de passe', 'password');
  65 |   await page.getByRole('button', { name: 'SE CONNECTER' }).click();
  66 | 
  67 |   // App now goes through /initial-loading before landing on /tabs.
  68 |   await expect(page).toHaveURL(/\/(initial-loading|tabs)/, { timeout: 15_000 });
  69 |   await waitForTabsAfterInitialization(page, timeoutMs);
  70 |   await dismissBlockingAlerts(page);
  71 | }
  72 | 
```