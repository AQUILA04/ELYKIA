# Plan de migration Frontend : Angular 18.2 → Angular 21 LTS (`3.0.0`)

## 1. Périmètre et décisions validées

- **Branche :** `migration/frontend-angular-21` (tirée de `migration/architecture-refonte`).
- **Version cible :** `frontend/package.json` `2.62.0` → **`3.0.0`**.
- **Décisions validées :**
  1. Builder Angular : migration `@angular-devkit/build-angular:browser` (Webpack) → **`@angular/build:application` (esbuild/Vite)** avec `"outputPath": { "base": "dist/optimize-elykia-ui", "browser": "" }` pour conserver le Dockerfile Nginx inchangé.
  2. Lazy-loading : migration des **7 derniers domaines eager** (`locality`, `cash-desk`, `gestion`, `operation`, `deposit`, `history`, `out`) vers `/{domaine}/...`, puis modernisation de `.cursor/rules/frontend-lazy-loading-migration.mdc` et `.github/scripts/check-frontend-lazy-loading.py` vers le standard Angular 21 standalone (`*.routes.ts` / `loadComponent`).
  3. Modernisation étendue : **Control Flow natif (`@if`/`@for`/`@switch`)** sur tous les templates HTML + migration **Karma/Jasmine → Vitest (`@angular/build:unit-test`)** avec exécution dans `ci.yml` (`build-frontend`).
  4. Infrastructure : **Node 22 LTS** dans `frontend/Dockerfile` (`node:22-bookworm-slim`) et `.github/workflows/{ci,e2e}.yml`, et **`npm ci` strict** sans `--legacy-peer-deps`.

## 2. Matrice des dépendances (`frontend/package.json`)

| Dépendance | Avant | Après | Notes |
|---|---|---|---|
| `@angular/{common,compiler,core,forms,platform-browser,router,compiler-cli}` | `^18.2.14` | **`^21.2.26`** | Tag `v21-lts` |
| `@angular/cli`, `@angular/build` | `^18.2.21` / `build-angular` | **`^21.2.30`** | `@angular-devkit/build-angular` supprimé |
| `@angular/material`, `@angular/cdk` | `^18.2.14` | **`^21.2.14`** | `indigo-pink.css` conservé (parité visuelle 100 %) |
| `@angular/animations`, `@angular/platform-browser-dynamic` | `^18.2.14` | **Supprimés** | `platformBrowser()` + animation CSS pure sur `advanced-search` |
| `@angular/fire`, `@angular/pwa`, `ngx-pagination`, `@types/chart.js` | présents | **Supprimés** | 0 utilisation / types embarqués dans `chart.js@4` |
| `ngx-google-analytics` | `^14.0.1` | **Supprimé** | Remplacé par `GoogleAnalyticsService` (`gtag.js` natif) |
| `@ng-select/ng-select` | `^13.0.0` | **`^21.8.2`** | Peer deps natifs Angular 21 |
| `ngx-permissions` | `^16.0.1` | **`^19.0.0`** | Compatible Angular 21 |
| `ngx-spinner` | `^18.0.0` | **`^21.1.0`** | Sans `@angular/animations` |
| `ngx-toastr` | `^17.0.2` | **`^20.0.5`** | Sans `@angular/animations`, peer deps Angular 21 |
| `ng-apexcharts` + `apexcharts` | `1.7.1` + `^3.36.3` | **`^2.5.0`** + **`^5.10.3`** | Compatible Angular 21 |
| `ng2-charts` + `chart.js` | `^4.1.1` + `^4.5.1` | **`^10.0.0`** + **`^4.5.1`** | `BaseChartDirective` + `provideCharts(withDefaultRegisterables())` |
| `firebase` | `^10.14.1` | **`^12.19.0`** | Aligné sur `customer-space` |
| `rxjs`, `zone.js`, `typescript`, `@types/node` | `7.5`, `0.14`, `5.4`, `18` | **`~7.8.2`**, **`~0.16.0`**, **`~5.9.3`**, **`^22.20.5`** | Exigences Angular 21 / Node 22 |
| `sweetalert2` | `^11.12.3` | **Supprimé** | Remplacé par `ngx-sonner@^3.1.0` (toasts rapides) + `@angular/cdk/dialog` (`AlertDialogComponent` standalone), centralisés dans `AlertService` |
| `karma*`, `jasmine-core`, `@types/jasmine` | Karma 6 / Jasmine 4 | **Supprimés** | Remplacés par `vitest@4.1.12`, `@vitest/coverage-v8@4.1.12`, `jsdom@26.1.0` |

## 3. Phases exécutées et validations

1. **Phase 1 — Lazy-loading :** 7 feature modules (`locality`, `cash-desk`, `gestion`, `operation`, `deposit`, `out`, `history`), mise à jour `app.module.ts`, `app-routing.module.ts`, `sidebar`, liens internes et 4 specs E2E Playwright.
2. **Phases 2 & 3 — Angular 21 & esbuild :** `standalone: false` explicite sur 146 fichiers, `platformBrowser().bootstrapModule(AppModule)`, `provideZoneChangeDetection({ eventCoalescing: true })`, `provideBrowserGlobalErrorListeners()`, `provideHttpClient(withInterceptorsFromDi())`, `provideAppInitializer`, `provideCharts`, `GoogleAnalyticsService`, `DOCUMENT` depuis `@angular/core`, imports par défaut `moment`, suppression `polyfills.ts`, migration `angular.json` et `tsconfig*.json`.
3. **Phase 4 — Control Flow :** `ng generate @angular/core:control-flow` sur 212 fichiers + compilation AOT prod.
4. **Phase 5 — Vitest :** `ng generate @schematics/angular:refactor-jasmine-vitest`, `src/test-providers.ts` (Zone + HttpClientTesting + Router fallback + Toastr + NgxPermissions + `matchMedia` jsdom), migration `HttpClientTestingModule` → `provideHttpClientTesting()`, correction bug `ErrorEvent` dans `ErrorHandlerService`, correction `confirmPassword` dans `RegisterComponent`, remise au vert de la suite Vitest complète.
5. **Phase 6 — Infra & Docs :** `Dockerfile` Node 22 + `npm ci`, `ci.yml` Vitest, `e2e.yml` Node 22 + `npm ci`, règles/hook/skills standalone Angular 21, `CHANGELOG.md`, `memory-bank/`, build Docker + smoke test Nginx.
6. **Phase 7 — Remplacement SweetAlert2 (`ngx-sonner` + `@angular/cdk/dialog`) :** suppression totale de `sweetalert2`, création du composant standalone `AlertDialogComponent` (`confirm`, `action`, `prompt`), centralisation 100 % dans `AlertService` (migration des 4 derniers appels directs `Swal.fire`), montage `<ngx-sonner-toaster>` dans `AppComponent`, mise à jour des fixtures E2E Playwright et tests Vitest (`112/112` fichiers).
