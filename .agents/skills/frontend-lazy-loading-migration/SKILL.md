---
name: frontend-lazy-loading-migration
description: >
  Règle OBLIGATOIRE d'architecture Angular 21 du frontend ELYKIA : lazy-loading par route
  et composants standalone. 100 % des domaines historiques sont désormais lazy-loaded (Frontend 3.0.0).
  Tout nouveau domaine ou écran doit utiliser des composants standalone + routes lazy
  ({domaine}.routes.ts avec loadChildren / loadComponent) et URLs /{domaine}/...
  sans jamais déclarer d'écran métier dans AppModule. Vérifié par CI et hook Cursor.
---

# Architecture Angular 21 — Lazy-Loading & Composants Standalone (Frontend ELYKIA)

## État depuis Frontend `3.0.0` (Angular 21)

**100 % des domaines métier historiques sont lazy-loaded** via `loadChildren` dans `app-routing.module.ts` :

`account`, `accounting-day`, `ai-chat`, `article`, `article-type`, `bi`, `carnet-ecart`, `cash-desk`, `client`, `client-registrations`, `commercial`, `credit`, `customer-activity-audit`, `customer-payments`, `dashboard` (URL `/home`), `debt`, `deposit`, `expense`, `gestion`, `history`, `inventory`, `locality`, `notifications`, `operation`, `orders`, `out`, `parameters`, `recruitment`, `report`, `security`, `stock`, `stock-tontine`, `tontine`, `user`.

Seuls les éléments transverses / socle restent chargés au démarrage : `shared/`, `layout/`, `interceptors/`, `guards/`, `auth/` (login), `license/`, `mobile-money-config/`, `billetage/` (sous-module partagé).

## Mécanismes de contrôle

| Mécanisme | Fichier | Rôle |
|-----------|---------|------|
| **Règle Cursor** | `.cursor/rules/frontend-lazy-loading-migration.mdc` | Standards Angular 21 (standalone, lazy routes, control flow, Vitest) |
| **Hook Cursor** | `.cursor/hooks/lazy-loading-reminder.py` | Rappel si un nouveau domaine sous `frontend/src/app/` n'a pas encore `{domaine}.routes.ts` ou `{domaine}.module.ts` |
| **CI** | `.github/scripts/check-frontend-lazy-loading.py` | Garde anti-régression acceptant `{domaine}.routes.ts` (standalone) et `{domaine}.module.ts` |

## Règles pour tout nouveau développement

### 1. Nouveau domaine métier → Standalone + `{domaine}.routes.ts` (recommandé)

Ne plus créer de nouveaux `NgModule` pour un nouveau domaine. En Angular 21, les composants sont **standalone par défaut** :

```
frontend/src/app/{domaine}/
  {domaine}.routes.ts
  pages/
    {domaine}-list/{domaine}-list.component.ts
    {domaine}-add/{domaine}-add.component.ts
```

Dans `frontend/src/app/{domaine}/{domaine}.routes.ts` :

```typescript
import { Routes } from '@angular/router';

export const MON_DOMAINE_ROUTES: Routes = [
  {
    path: 'list',
    loadComponent: () =>
      import('./pages/mon-domaine-list/mon-domaine-list.component').then(m => m.MonDomaineListComponent),
  },
  {
    path: 'add',
    loadComponent: () =>
      import('./pages/mon-domaine-add/mon-domaine-add.component').then(m => m.MonDomaineAddComponent),
  },
  { path: '', redirectTo: 'list', pathMatch: 'full' },
];
```

Dans `frontend/src/app/app-routing.module.ts` :

```typescript
{
  path: 'mon-domaine',
  loadChildren: () => import('./mon-domaine/mon-domaine.routes').then(m => m.MON_DOMAINE_ROUTES),
  canActivate: [AuthGuard],
}
```

### 2. Domaine existant basé sur NgModule

Deux options propres :
- Créer un **composant standalone** et le charger via `loadComponent` dans `{domaine}-routing.module.ts` (ou l'importer dans `imports: [...]` du module existant) ;
- Ou déclarer un composant classique (`standalone: false`) dans `{domaine}.module.ts`.

Ne **jamais** déclarer un composant métier dans `AppModule`.

### 3. Standards Angular 21 obligatoires

- **Control flow natif :** utiliser `@if`, `@for (...; track ...)`, `@switch` — ne plus introduire `*ngIf`, `*ngFor`, `*ngSwitch`.
- **DI & réactivité :** privilégier `inject()`, `signal()` / `computed()`.
- **Animations :** animations CSS natives (`@keyframes`, `transition`, `animate.enter`/`animate.leave`) — ne pas réintroduire `@angular/animations`.
- **HTTP & init :** `provideHttpClient(withInterceptorsFromDi())` et `provideAppInitializer(...)` — ne pas réintroduire `HttpClientModule` ou `APP_INITIALIZER`.
- **Tests unitaires :** suite **Vitest** via `@angular/build:unit-test` (`npm run test:ci` dans `frontend/`).
- **Conventions d'URLs :** préfixe unique `/{domaine}/{action}` (`list`, `add`, `add/:id`, `details/:id`), sans redirects d'anciennes URLs plates.

## Checklist de vérification

- [ ] Aucun composant métier ajouté à `AppModule.declarations`
- [ ] Route chargée en lazy (`loadChildren` / `loadComponent`) avec guards & `data.permissions` préservés
- [ ] `npm run build -- --configuration production` passe dans `frontend/`
- [ ] `npm run test:ci` (Vitest) passe dans `frontend/`
- [ ] `python .github/scripts/check-frontend-lazy-loading.py` passe
- [ ] `docs/CHANGELOG.md` mis à jour (skill `keep-changelog`)

## Anti-patterns

- Ajouter un composant métier dans `AppModule.declarations`
- Créer un nouveau `NgModule` pour un nouveau domaine alors que standalone + `{domaine}.routes.ts` suffit
- Importer un feature module dans `AppModule` (annule le lazy-loading)
- Réintroduire `@angular/animations`, `HttpClientModule`, `APP_INITIALIZER`, ou `*ngIf`/`*ngFor`
