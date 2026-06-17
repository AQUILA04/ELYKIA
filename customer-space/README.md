# ELYKIA — Espace Client

**Auteur :** Francis AHONSU  
**Version :** 1.0.0  
**Stack :** Angular 20 + Ionic 8 + Capacitor 8  
**Cible :** Android (APK via Capacitor) + Web (PWA)

## Description

Application indépendante permettant aux clients ELYKIA d'accéder à leur espace personnel : suivi des achats à crédit, paiement des mises via Mobile Money, et passage de nouvelles commandes.

## Structure du projet

```
customer-space/
├── src/
│   ├── app/
│   │   ├── features/               # Pages routables (1 dossier = 1 écran)
│   │   │   ├── auth/               # S-01, S-02 — Connexion
│   │   │   ├── dashboard/          # S-03 — Tableau de bord
│   │   │   ├── purchases/          # S-04 — Historique achats
│   │   │   ├── purchase-detail/    # S-05 — Détail d'un achat
│   │   │   ├── recovery-timeline/  # S-06 — Timeline des mises
│   │   │   ├── payment/            # S-07, S-08 — Paiement Mobile Money
│   │   │   ├── catalog/            # S-09 — Catalogue produits
│   │   │   ├── cart/               # S-10 — Panier
│   │   │   ├── order-confirmation/ # S-11 — Confirmation commande
│   │   │   ├── order-tracking/     # Suivi commande
│   │   │   └── profile/            # Profil client
│   │   ├── shared/
│   │   │   ├── components/         # Composants réutilisables
│   │   │   │   ├── recovery-pills/ # Grille pastilles 1-31
│   │   │   │   └── credit-progress-card/
│   │   │   ├── models/             # Interfaces TypeScript
│   │   │   ├── services/           # API + Session
│   │   │   └── guards/             # CustomerAuthGuard
│   │   ├── core/
│   │   │   └── interceptors/       # CustomerAuthInterceptor
│   │   └── app.routes.ts           # Routing principal
│   └── environments/
├── docs/
│   └── wireflow/                   # Prototypes et spécifications
│       ├── wireflow.html           # Prototype interactif
│       └── screens/                # Maquettes UI (S-01 à S-11)
└── capacitor.config.ts
```

## Statuts Métier

| Statut | Couleur | Description |
|---|---|---|
| `INITIÉ` | Orange `#F97316` | Soumis par le client, en attente de validation agence |
| `VALIDÉ` | Vert `#22C55E` | Confirmé par un agent de l'agence |
| `LIVRÉ` | Bleu `#60A5FA` | Livré — le crédit démarre à partir de cette date |
| `RETARD` | Rouge `#EF4444` | Mise non payée à l'échéance |

## Démarrage rapide

```bash
cd customer-space
npm install
ionic serve
```

## Build Android

```bash
ionic build
npx cap add android
npx cap sync
npx cap open android
```

## Endpoints API requis

Tous les endpoints sont préfixés par `/api/customer/` et requièrent un JWT client.

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/customer/auth/login` | Connexion client |
| GET | `/api/customer/dashboard` | Tableau de bord |
| GET | `/api/customer/purchases` | Liste des achats |
| GET | `/api/customer/purchases/:id` | Détail d'un achat |
| GET | `/api/customer/purchases/:id/recoveries` | Mises d'un achat |
| POST | `/api/customer/recoveries/mobile-money` | Soumettre un paiement MM |
| GET | `/api/customer/articles` | Catalogue produits |
| POST | `/api/customer/orders` | Passer une commande |

## Prototypes

Les wireflows interactifs sont disponibles dans `docs/wireflow/wireflow.html`.
