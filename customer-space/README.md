# ELYKIA — Espace Client

**Auteur :** Francis AHONSU  
**Version :** 1.0.0  
**Stack :** Angular 20 + Ionic 8 + Capacitor 8  
**Cible :** Android (APK via Capacitor) + Web (PWA)

## Description

Application indépendante permettant aux clients ELYKIA d'accéder à leur espace personnel : suivi des achats à crédit, paiement des mises via Mobile Money, et passage de nouvelles commandes.

## Démarrage rapide

```bash
cd customer-space
npm install
ionic serve
```

## Tests automatiques

```bash
npm run test:unit          # Karma/Jasmine (headless)
npm run test:e2e           # Playwright (viewport mobile Pixel 5)
npm run test:e2e:smoke     # Smoke tests uniquement (@smoke)
```

Le CI découplé est dans [`.github/workflows/ci-customer-space.yml`](../.github/workflows/ci-customer-space.yml) — un échec n'impacte pas le pipeline backend/frontend.

Skills Cursor associés :
- `.cursor/skills/customer-space-ui-style` — maquettes wireflow
- `.cursor/skills/customer-space-testing` — tests unitaires + E2E obligatoires par feature

## Structure du projet

```
customer-space/
├── e2e/                    # Playwright (specs + fixtures mock API)
├── src/app/
│   ├── features/           # Pages S-01 à S-11
│   ├── shared/
│   │   ├── layout/customer-tab-bar/   # Navigation basse
│   │   ├── services/       # API, session, Firebase
│   │   └── guards/
│   └── app.routes.ts
└── docs/wireflow/          # Maquettes et specs
```

## Écrans livrés (phase 1)

| Écran | Route | Statut |
|-------|-------|--------|
| S-01 Splash | overlay `app.component` | OK |
| S-02 Auth wizard | `/auth` | OK |
| S-03 Dashboard | `/dashboard` | OK |

## Build Android

```bash
ionic build
npx cap sync android
npx cap open android
```

## API

Endpoints préfixés `/api/customer/` — voir le backend `CustomerApiController`.
