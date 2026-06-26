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
