# ELYKIA — Espace Client

**Stack :** Angular 20 + Ionic 8 + Capacitor 8

## Démarrage

```bash
cd customer-space
npm install
ionic serve
```

## Tests

```bash
npm run test:unit
npm run test:e2e
npm run test:e2e:smoke
```

CI découplé : `.github/workflows/ci-customer-space.yml`

## Firebase

L'app utilise le SDK Web (`environment.firebase`, alimenté par `firebase.config.local.ts` gitignored). Le fichier `google-services.json` **ne se commit pas** — voir [`docs/FIREBASE_SETUP.md`](docs/FIREBASE_SETUP.md).

**Local :**

```bash
# Copier google-services.json à la racine customer-space/, puis :
npm run firebase:configure:dev   # environment.ts
npm run firebase:configure       # environment.prod.ts
```

**GitHub Actions (build prod)** — secret dédié (≠ `GOOGLE_SERVICES_JSON` du mobile) :

| Secret | Obligatoire |
|--------|-------------|
| `CUSTOMER_SPACE_GOOGLE_SERVICES_JSON` | Oui (contenu du fichier google-services.json) |
| `CUSTOMER_SPACE_FIREBASE_WEB_CONFIG` | Non (config Web SDK, recommandé pour Phone Auth navigateur) |

Les tests CI (unit + E2E) **n'utilisent pas** ces secrets (Firebase mocké).

**Backend** : `FIREBASE_CREDENTIALS` = compte de service Admin SDK sur le serveur (pas le google-services.json client).

## Écrans (S-01 à S-11)

| Écran | Route | Statut |
|-------|-------|--------|
| Splash | overlay app | OK |
| Auth | `/auth` | OK |
| Dashboard | `/dashboard` | OK |
| Achats | `/purchases` | OK |
| Détail achat | `/purchases/:id` | OK |
| Timeline mises | `/purchases/:id/timeline` | OK |
| Paiement MM | `/payment/:id` | OK |
| Catalogue | `/catalog` | OK |
| Panier | `/cart` | OK |
| Confirmation | `/order-confirmation` | OK |
| Profil | `/profile` | OK |

## Build Android

```bash
ionic build
npx cap sync android
npx cap open android
```

App ID Capacitor : `com.optimize.elykia.customer`
