# Plan de migration Mobile : Ionic 8 → Ionic 9.0.13 + Angular 21 LTS + Capacitor 8.6.2 (`3.0.0`)

## 1. Périmètre et décisions validées

- **Branche :** `migration/mobile-ionic-9` (tirée de `migration/sale-domain-refactoring`, avec synchronisation préalable de `mobile/` `2.49.1` et du cache/miroir Gradle Android PR #275 depuis `origin/main` en commit baseline `f0999df1`).
- **Version cible :** `2.49.1` → **`3.0.0`** synchronisée dans `mobile/package.json`, `mobile/src/environments/environment.ts` et `mobile/src/environments/environment.prod.ts`.
- **Décisions validées :**
  1. **Option 2B — Runtime Ionic 9 standalone complet (`provideIonicAngular()`)** dès la `3.0.0` : suppression intégrale de `IonicModule` (0 occurrence de `IonicModule`, 0 import `@ionic/angular/lazy`), déclaration explicite des composants standalone `Ion*` (`@ionic/angular`) dans tous les NgModules et composants standalone, registre centralisé d'icônes `src/app/core/icons/register-icons.ts` appelant `addIcons(...)` pour les **122 icônes** Ionicons utilisées dans `mobile/src/`, et suppression de la copie des SVG Ionicons dans `angular.json`, tout en conservant les 92 NgModules existants.
  2. **Angular 21 LTS + esbuild + Zone.js explicite :** montée `@angular/*` `20.0` → **`21.2.26`** (CLI/Build `21.2.30`), migration de `@angular-builders/custom-webpack` + polyfills Node (`webpack.config.js`) vers **`@angular/build:application`** (`outputPath: { base: "www", browser: "" }`), conservation explicite de `Zone.js` (`provideZoneChangeDetection({ eventCoalescing: true })`), `provideHttpClient(withInterceptorsFromDi())`, `provideAppInitializer(...)`, `tsconfig.json` en `moduleResolution: "bundler"`.
  3. **Capacitor 8.6.2 & plugins v8 unifiés :** `@capacitor/{core,android,cli}` `7.4.2` → **`8.6.2`**, `@capacitor-community/sqlite` `7.0.1` → **`8.1.1`**, harmonisation de tous les plugins natifs en v8, `sql.js` épinglé à **`1.11.0`** pour garantir la compatibilité WASM avec `jeep-sqlite@2.8.0`, migration Edge-to-Edge `android.adjustMarginsForEdgeToEdge` → `SystemBars: { insetsHandling: 'css', style: 'DARK' }`, variables CSS `--ion-safe-area-*` dans `global.scss`, attribut `|density` ajouté à `android:configChanges` dans les deux `AndroidManifest.xml`, garde défensive `try/catch` sur `StatusBar` pour Android 16 (API 36).
  4. **NgRx 21.1.1 & `npm ci` strict :** unification `@ngrx/*` en `^21.1.1` (fin du mélange `20.0.0-rc.0` / `21.0.1`), suppression de `mobile/.npmrc` (`legacy-peer-deps=true`), suppression des dépendances mortes (`@ionic-native/file-picker`, `@angular/animations`, `@angular/localize`, `@angular/platform-browser-dynamic`, `custom-webpack`, polyfills Node, Karma/Jasmine).
  5. **Tests unitaires Vitest (`@angular/build:unit-test`) :** migration complète Karma/Jasmine → **Vitest `4.1.12`** + `jsdom` + `src/test-providers.ts` sur l'ensemble des **103 fichiers `.spec.ts`** et exécution ajoutée en CI dans `.github/workflows/ci-mobile.yml`.
  6. **Préservation stricte du local-first :** aucune altération de la logique `DatabaseService`, `DataInitializationService`, `SynchronizationService`, SQLite/jeep-sqlite, ni du filtrage par `commercialUsername`.

## 2. Matrice des dépendances (`mobile/package.json`)

| Dépendance | Avant (`2.49.1`) | Après (`3.0.0`) | Notes |
|---|---|---|---|
| `@ionic/angular` | `^8.0.0` | **`^9.0.13`** | Standalone build (`provideIonicAngular()` + `Ion*`), 0 `IonicModule` |
| `@ionic/angular-toolkit` | `^12.0.0` | **`^13.0.0`** | Support Ionic 9 + Angular 21 |
| `ionicons` | `^7.0.0` | **`^8.1.1`** | Sanitization SVG + `addIcons()` centralisé (122 icônes) |
| `@angular/{common,compiler,core,forms,platform-browser,router,compiler-cli,language-service}` | `^20.0.0` | **`^21.2.26`** | Angular 21 LTS (aligné sur `frontend/`) |
| `@angular/cdk` | `^20.2.8` | **`^21.2.14`** | Alignement Angular 21 |
| `@angular/cli`, `@angular/build` | `^20.0.0` / `build-angular` | **`^21.2.30`** | Builder `@angular/build:application` + `unit-test` |
| `@ngrx/{store,effects,entity,store-devtools}` | `20.0.0-rc.0` / `21.0.1` | **`^21.1.1`** | Version stable unifiée |
| `angularx-qrcode` | `^20.0.0` | **`^21.0.5`** | PeerDep natif Angular 21 |
| `@capacitor/{core,android,cli}` | `7.4.2` | **`8.6.2`** | Aligné sur `customer-space/` + `SystemBars` |
| `@capacitor-community/sqlite` | `^7.0.1` | **`^8.1.1`** | Compatible Capacitor 8 (`CapacitorSQLitePlugin` inchangé) |
| `@capacitor/*` (plugins officiels) | `7.0.x–7.1.x` | **`^8.0.x–8.2.x`** | Tous les plugins harmonisés en v8 |
| `@capacitor-firebase/*`, `@capacitor-mlkit/face-detection`, `@capawesome/capacitor-file-picker` | `8.0–8.2` | **`^8.6.0` / `^8.2.2` / `^8.1.1`** | Dernières versions v8 |
| `@bcyesil/capacitor-plugin-printer` | `^0.0.5` | **`^0.0.6`** | Compatible Capacitor 8 |
| `sql.js` | `^1.11.0` | **`1.11.0`** (épinglé) | Compatibilité binaire WASM exacte avec `jeep-sqlite@2.8.0` |
| `firebase`, `@playwright/test` | `12.13` / `1.59.1` | **`^12.19.0`** / **`^1.60.0`** | Alignement monorepo |
| `typescript`, `zone.js`, `rxjs`, `tslib` | `5.8` / `0.15` / `7.8` / `2.3` | **`~5.9.3`**, **`~0.16.0`**, **`~7.8.2`**, **`^2.8.1`** | Prérequis Angular 21 + Ionic 9 |
| `vitest`, `@vitest/coverage-v8`, `jsdom` | *(absents)* | **`^4.1.12`**, **`^4.1.12`**, **`^26.1.0`** | Remplacement Karma/Jasmine |
| `.npmrc`, `webpack.config.js`, `karma.conf.js`, `src/test.ts`, `src/polyfills.ts` | présents | **Supprimés** | `npm ci` strict, esbuild natif, Vitest natif |

## 3. Phases exécutées

1. **Phase 0 — Branche & Sync :** création de `migration/mobile-ionic-9` depuis `migration/sale-domain-refactoring` et synchronisation propre de `mobile/` (`2.49.1`) + cache Gradle PR #275 depuis `origin/main` (`f0999df1`).
2. **Phase 1 — Dépendances & Config TS/Browserslist :** `package.json`, `tsconfig*.json` (`moduleResolution: "bundler"`), `.browserslistrc` (Chrome >=111 / iOS >=16.4), suppression `.npmrc`/`webpack.config.js`/`karma.conf.js`/`polyfills.ts`/`test.ts`, `npm install` strict (0 conflit peerDeps).
3. **Phases 2 & 3 — Ionic 9 Option 2B, Angular 21 & esbuild :** `angular.json` (`@angular/build:application`), `src/app/core/icons/register-icons.ts` (122 icônes), `main.ts` (`platformBrowser` + `provideZoneChangeDetection` + `LOCALE_ID: 'fr-FR'`), `app.module.ts` (`provideIonicAngular()`, `provideHttpClient(withInterceptorsFromDi())`, `provideAppInitializer`), migration de 73 fichiers (57 NgModules + 13 composants standalone + 3 fichiers `@ionic/angular/standalone`), correction du bug `NG6007` sur `ClientDetailPageModule`, vérification build prod et `build:e2e`.
4. **Phase 4 — Capacitor 8 & Android/CI :** `capacitor.config.ts` (`SystemBars`), `global.scss` (`--ion-safe-area-*`), `app.component.ts` (`try/catch` `StatusBar`), `|density` sur les 2 `AndroidManifest.xml`, `ci-mobile.yml` (Node 22, `npm ci`, `npm run test:ci`, script Firebase unifié), `.github/actions/build-mobile-apk/action.yml` (Node 22, `npm ci`), validation `.github/scripts/validate-mobile-pipeline.sh` + `npx cap add android && npx cap sync android`.
5. **Phase 5 — Vitest :** `src/test-providers.ts`, migration des 103 `.spec.ts` (schematic + `fakeAsync`/`waitForAsync` → `async/await` + `vi.useFakeTimers`, `vi.mock('@capacitor/preferences')` pour Proxy Capacitor 8, mise à jour de specs historiques obsolètes) → **103/103 fichiers (565/565 tests) verts**.
6. **Phase 6 — E2E Playwright & Validation finale :** épinglage `sql.js@1.11.0` détecté par les tests Playwright Chromium réels, exécution `CI=true npm run test:e2e:smoke`, vérification `npm ci` strict, `npx cap sync android`, et builds prod/dev.
7. **Phase 7 — Gouvernance :** version `3.0.0` sur les 3 fichiers, mise à jour `docs/CHANGELOG.md` (incluant `2.49.0`, `2.49.1` et `3.0.0`), `memory-bank/{activeContext,techContext,decisions}.md`, commit du présent plan.
