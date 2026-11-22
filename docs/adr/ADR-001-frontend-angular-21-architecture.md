# ADR-001 — Architecture Frontend Angular 21 (`src/app/`)

- **Statut :** Accepté
- **Date :** 2026-11-21
- **Périmètre :** `frontend/src/app/` (ELYKIA Admin Web, Angular 21 LTS `3.0.0+`)
- **Décideurs :** Équipe ELYKIA

---

## 1. Contexte

Suite à la migration vers **Angular 21 LTS (`21.2.26`)**, `@angular/build:application` (esbuild/Vite), Control Flow natif (`@if`/`@for`/`@switch`), Vitest et `ngx-sonner` + `@angular/cdk/dialog`, le dossier `frontend/src/app/` présente encore l'organisation historique héritée d'Angular 14 :

- **42 dossiers à plat** mélangeant infrastructure (`core/`, `interceptors/`, `shared/`, `bread/`, `layout/`), écrans d'authentification (`auth/`, `license/`) et 33 domaines métier.
- **Socle fragmenté :** `auth.interceptor.ts` dans `shared/`, `license-interceptor.service.ts` dans `interceptors/`, `breadcrumb` dans `bread/`, `core/` quasi vide.
- **Doublons de conventions :** `shared/pipe/` et `shared/pipes/` ; `service/` vs `services/` ; `models/` + `types/` coexistant dans un même domaine ; anciens dossiers plats (`accountlist`, `localityadd`) vs domaines récents (`orders/pages`, `expense/pages`).
- **Bootstrap `AppModule` :** `app.module.ts` + `app-routing.module.ts` et affichage conditionnel du shell (`showHeaderAndSidebar`) par comparaison d'URLs dans `AppComponent`.
- **Absence d'alias sémantiques et de frontières strictes** entre domaines métier (contrairement au backend Spring Modulith).

---

## 2. Décision

Adopter une architecture Angular 21 **Standalone-First en 4 couches** (`core/`, `layout/`, `shared/`, `features/`) avec bootstrap standalone (`bootstrapApplication`), path aliases TypeScript, et migration incrémentale en 4 lots.

### 2.1 Découpage en 4 couches

```text
frontend/src/app/
├── app.component.{ts,html,scss,spec.ts}   # Racine minimale (<router-outlet>, <ngx-sonner-toaster>)
├── app.config.ts                          # ApplicationConfig (providers globaux, intercepteurs, i18n, charts…)
├── app.routes.ts                          # Routes racines : publiques vs shell authentifié (MainLayoutComponent)
│
├── core/                                  # Singletons globaux (auth, config, http interceptors, services transverses, guards, models)
│   ├── http/                              # AuthInterceptor, LicenseInterceptorService
│   ├── auth/                              # Guards & état de session (à consolider)
│   ├── config/                            # FeatureFlags, UnitPriceVisibility, env runtime
│   ├── services/                          # AlertService, ErrorHandlerService, GoogleAnalyticsService…
│   └── models/                            # Contrats & types transverses
│
├── layout/                                # Coquille applicative (Shell)
│   ├── shell/                             # MainLayoutComponent (header + sidebar + breadcrumb + <router-outlet>)
│   ├── header/
│   ├── sidebar/
│   ├── breadcrumb/                        # Rapatriement de bread/
│   └── environment-ribbon/
│
├── shared/                                # Briques UI & utilitaires purs (sans état global ni logique métier)
│   ├── ui/                                # Composants standalone réutilisables (alert-dialog, report-ui, guided-tour…)
│   ├── directives/
│   ├── pipes/                             # Fusion de shared/pipe/ + shared/pipes/
│   ├── styles/                            # Tokens SCSS & mixins partagés
│   └── utils/                             # Fonctions pures testables sans TestBed
│
└── features/                              # Domaines métier 100 % lazy-loaded (standalone + *.routes.ts)
    └── <domaine>/
        ├── <domaine>.routes.ts            # Routes lazy (loadComponent), guards, permissions
        ├── index.ts                       # API publique du domaine (seul point d'import externe autorisé)
        ├── pages/                         # Smart components (1 dossier par écran)
        ├── components/                    # Dumb components & modales du domaine
        ├── data-access/                   # Services HTTP & état local (signals/RxJS)
        ├── models/                        # Interfaces, DTOs, enums (remplace models/ + types/)
        └── utils/                         # Fonctions pures métier
```

### 2.2 Path Aliases (`frontend/tsconfig.json`)

```json
"paths": {
  "@core/*": ["./src/app/core/*"],
  "@layout/*": ["./src/app/layout/*"],
  "@shared/*": ["./src/app/shared/*"],
  "@features/*": ["./src/app/features/*"],
  "@env/*": ["./src/environments/*"]
}
```

L'alias historique `"src/*"` a été **intégralement supprimé** (0 import `src/app/` ou `src/environments/` résiduel, vérifié en CI).

### 2.3 Règles de dépendances (frontières)

| Couche | Peut importer | Interdit |
|---|---|---|
| `shared/` | Angular, librairies UI, `shared/` | `core/`, `layout/`, `features/` |
| `core/` | Angular, `shared/`, `core/` | `layout/`, `features/` |
| `layout/` | `core/`, `shared/`, `layout/` | `features/` (sauf types/façades publics si nécessaire) |
| `features/A` | `core/`, `shared/`, `features/A`, **`features/B/index.ts` uniquement** | Imports profonds dans `features/B/*` |

### 2.4 Bootstrap Standalone & Shell par routes imbriquées

- Remplacement de `AppModule` / `AppRoutingModule` par `app.config.ts` + `app.routes.ts` + `bootstrapApplication(AppComponent, appConfig)`.
- Séparation explicite dans `app.routes.ts` :
  - **Routes publiques (plein écran)** : `/login`, `/license` (sans header ni sidebar).
  - **Route shell authentifiée** (`path: ''`, `component: MainLayoutComponent`, `canActivate: [AuthGuard]`) regroupant tous les domaines métier en `children` lazy-loaded (`loadChildren` / `loadComponent`).
- Suppression de la logique fragile `showHeaderAndSidebar` par comparaison d'URLs dans `AppComponent`.

---

## 3. Stratégie de migration incrémentale

| Lot | Périmètre | Statut |
|---|---|---|
| **Lot 1 — Socle & Alias** | Alias `@core/*`, `@layout/*`, `@shared/*`, `@features/*`, `@env/*` dans `tsconfig.json` ; fusion `shared/pipe/` → `shared/pipes/` ; déplacement `bread/` → `layout/breadcrumb/` ; regroupement des intercepteurs HTTP dans `core/http/` (`auth.interceptor.ts`, `license-interceptor.service.ts`). | **Terminé** (`a8b66d6`) |
| **Lot 2 — Bootstrap Standalone** | Migration `AppModule` → `app.config.ts` + `app.routes.ts` + `bootstrapApplication` ; création `layout/shell/main-layout.component.*` ; conversion standalone des composants shell/socle (`AppComponent`, `HeaderComponent`, `SidebarComponent`, `BreadcrumbComponent`, `EnvironmentRibbonComponent`, `LoginComponent`, `RegisterComponent`, `ReactivateLicenseComponent`, `MobileMoneyConfig*`, `DashboardChartComponent`, `LicenseKeyFormatterPipe`). | **Terminé** (`8286d18`) |
| **Lot 3 — Garde CI d'architecture** | Script CI `.github/scripts/check-frontend-architecture.py` (câblé dans `ci.yml` et `npm run check:architecture`) imposant les 4 couches strictes, les barrels `index.ts`, l'interdiction des imports `src/*` et des paquets bannis (`sweetalert2`, `@angular/animations`), et les frontières de `core/`. | **Terminé** |
| **Lot 4 — Rapatriement dans `features/`** | Déplacement via `git mv` des **38 domaines métier** sous `frontend/src/app/features/`, réécriture complète de tous les imports TS/SCSS vers `@core/*`, `@layout/*`, `@shared/*`, `@features/*`, `@env/*`, suppression de l'alias legacy `"src/*"`, et création des 38 barrels `index.ts`. La conversion interne des `NgModule` historiques vers `*.routes.ts` standalone se poursuit opportunément au fil des évolutions produit. | **Terminé** |

---

## 4. Conséquences

- **Positives :** onboarding rapide, racine `src/app/` réduite de 42 dossiers à **4 couches strictes** (`core/`, `layout/`, `shared/`, `features/`), zéro import `src/*`, suppression définitive d'`AppModule`, lazy-loading fin (`loadComponent` / `loadChildren`), réduction du bundle initial (`-35,5 %`) et parité conceptuelle avec les modules DDD Spring Modulith du backend.
- **Compromis :** les domaines historiques déjà migrés dans `features/` conservent leurs `NgModule` lazy-loaded internes (convertibles écran par écran en standalone sans toucher au routage global).
- **Gouvernance :** vérifiée automatiquement en CI par `.github/scripts/check-frontend-architecture.py`, `.github/scripts/check-frontend-lazy-loading.py`, `.cursor/hooks/lazy-loading-reminder.py` et `.cursor/rules/frontend-lazy-loading-migration.mdc`.
