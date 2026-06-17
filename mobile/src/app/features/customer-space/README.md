# Module Espace Client ELYKIA

**Auteur :** Francis AHONSU  
**Version :** 1.0.0  
**Branche :** `feature/espace-client-v1`

## Description

Module Angular/Ionic intégré à l'application ELYKIA permettant aux clients finaux d'accéder à leur espace personnel depuis Android (Capacitor) et Web (même code base).

## Parcours Utilisateurs

| Écran | Route | Description |
|---|---|---|
| S-01/02 | `/customer/auth` | Connexion (tél. + PIN) |
| S-03 | `/customer/dashboard` | Tableau de bord crédit |
| S-04 | `/customer/purchases` | Historique des achats |
| S-05 | `/customer/purchases/:id` | Détail d'un achat |
| S-06 | `/customer/purchases/:id/timeline` | Timeline des recouvrements |
| S-07/08 | `/customer/payment/:id` | Paiement Mobile Money |
| S-09 | `/customer/catalog` | Catalogue produits |
| S-10 | `/customer/cart` | Panier |
| S-11 | `/customer/order-confirmation` | Confirmation commande |

## Statuts Métier

| Statut | Couleur | Signification |
|---|---|---|
| `INITIÉ` | Orange `#F97316` | Créé par le client, en attente de validation agence |
| `VALIDÉ` | Vert `#22C55E` | Confirmé par un agent |
| `LIVRÉ` | Bleu `#60A5FA` | Livré — le crédit démarre |
| `RETARD` | Rouge `#EF4444` | Mise non payée à l'échéance |

## Structure

```
customer-space/
├── components/
│   ├── recovery-pills/          # Grille pastilles 1-31 (vert/orange/rouge/gris)
│   ├── credit-progress-card/    # Carte barre de progression du crédit
│   ├── bottom-nav/              # Navigation bottom (5 onglets)
│   ├── payment-status-badge/    # Badge statut recouvrement
│   ├── order-status-badge/      # Badge statut commande
│   ├── timeline-item/           # Item de timeline verticale
│   └── product-card/            # Carte produit catalogue
├── pages/
│   ├── auth/                    # S-01, S-02
│   ├── dashboard/               # S-03
│   ├── purchases/               # S-04
│   ├── purchase-detail/         # S-05
│   ├── recovery-timeline/       # S-06
│   ├── payment/                 # S-07, S-08
│   ├── catalog/                 # S-09
│   ├── cart/                    # S-10
│   ├── order-confirmation/      # S-11
│   ├── order-tracking/
│   └── profile/
├── services/
│   ├── customer-api.service.ts  # Appels API /api/customer/*
│   └── customer-session.service.ts
├── models/
│   ├── customer-auth.model.ts
│   └── customer-dashboard.model.ts
├── guards/
│   └── customer-auth.guard.ts
└── customer-space-routing.module.ts
```

## Wireflows & Prototypes

Les prototypes visuels se trouvent dans :
```
mobile/global-docs/wireflow/customer-space/
├── wireflow.html          # Prototype interactif complet
├── SPECIFICATIONS.md      # Spécifications techniques
└── screens/               # Maquettes UI (S-01 à S-11)
```

## Intégration dans le Routing Principal

Ajouter dans `app-routing.module.ts` :
```typescript
{
  path: 'customer',
  loadChildren: () =>
    import('./features/customer-space/customer-space-routing.module')
      .then(m => m.CustomerSpaceRoutingModule),
}
```
