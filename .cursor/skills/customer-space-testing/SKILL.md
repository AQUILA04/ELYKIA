---
name: customer-space-testing
description: >
  Impose les tests automatiques obligatoires pour customer-space (Angular/Ionic) :
  tests unitaires Karma/Jasmine et tests E2E Playwright à chaque fonctionnalité.
  À appliquer systématiquement pour toute tâche touchant customer-space/.
---

# Tests automatiques — Espace Client ELYKIA

## Quand appliquer ce skill

- Nouvelle **feature**, **page**, **service**, **guard** ou **composant shared** dans `customer-space/`
- Correctif de bug sur une fonctionnalité visible
- Modification d'un parcours utilisateur (auth, dashboard, achats, etc.)

**Complémentaire à** [`customer-space-ui-style`](../customer-space-ui-style/SKILL.md) (UI) et [`keep-changelog`](../keep-changelog/SKILL.md).

## Definition of Done — obligatoire

Aucune fonctionnalité n'est livrée sans :

1. **Tests unitaires** (`npm run test:unit`)
2. **Test E2E fonctionnel** (`npm run test:e2e` ou spec ciblé)
3. **`data-testid`** sur les éléments testés (voir [e2e-conventions.md](e2e-conventions.md))
4. Entrée **CHANGELOG** sous préfixe `Customer-space —`

## Tests unitaires (Karma/Jasmine)

| Cible | Fichier | Outils |
|-------|---------|--------|
| Utilitaires purs | `*.spec.ts` à côté du fichier | Pas de `TestBed` |
| Services HTTP | `*.service.spec.ts` | `HttpClientTestingModule`, `HttpTestingController` |
| Guards | `*.guard.spec.ts` | `RouterTestingModule`, mock session |
| Pages / composants | `*.page.spec.ts`, `*.component.spec.ts` | `TestBed`, mocks API/session/Firebase |

**Firebase** : toujours mock via `jasmine.createSpyObj` — jamais d'appel réseau réel.

```bash
cd customer-space && npm run test:unit
```

## Tests E2E (Playwright)

| Élément | Convention |
|---------|------------|
| Dossier specs | `customer-space/e2e/specs/<feature>/` |
| Fixtures | `customer-space/e2e/fixtures/` |
| Viewport | `Pixel 5` (mobile) |
| Port dev | `8100` |
| API | Interception `page.route('**/api/customer/**')` — pas de backend requis en CI smoke |
| Auth | Fixture `loginAsCustomer(page)` — session JWT mock |
| Mode E2E app | `window.__E2E__` injecté via `addInitScript` (splash court, OTP court-circuité) |

```bash
cd customer-space && npm run test:e2e
cd customer-space && npm run test:e2e:smoke   # tag @smoke
```

## Matrice par feature (référence)

| Feature | Unit | E2E |
|---------|------|-----|
| Splash / boot | `app.component.spec.ts` | `smoke/app-boot.spec.ts` |
| Auth | guard, session, phone-normalizer, auth.page | `auth/login-pin.spec.ts` |
| Dashboard | dashboard.page, credit-progress-card | `dashboard/dashboard.spec.ts` |
| Achats | purchases, recovery-pills | `purchases/purchases-flow.spec.ts` |
| Paiement | payment.page | `payment/mobile-money.spec.ts` |
| Commande | cart.service, catalog, cart | `order/order-flow.spec.ts` |

## CI

Workflow découplé [`.github/workflows/ci-customer-space.yml`](../../.github/workflows/ci-customer-space.yml) — **n'intègre pas** `ci.yml` ; un échec customer-space ne bloque pas le CD.

## Checklist avant livraison

```
- [ ] Spec unitaire créée ou mise à jour pour la logique touchée
- [ ] Spec E2E couvre le happy path de la feature
- [ ] data-testid ajoutés sur éléments interactifs / assertions
- [ ] npm run test:unit OK
- [ ] npm run test:e2e OK (spec concerné au minimum)
- [ ] CHANGELOG mis à jour
```

## Anti-patterns

- Livrer une page sans `*.spec.ts` ni spec Playwright
- Sélecteurs CSS fragiles en E2E au lieu de `data-testid`
- Tests E2E dépendant d'un backend réel ou Firebase en CI
- Oublier le mock Firebase dans les tests unitaires de l'auth
