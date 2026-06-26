# Mapping maquettes → routes → fichiers

Pour chaque écran : consulter la **maquette PNG**, choisir l'**archétype** (voir [design-system.md](design-system.md)), composer les **composants shared/ui**.

| # | Maquette | Route | Composant | Type | Decor | Notes visuelles |
|---|----------|-------|-----------|------|-------|-----------------|
| S-01 | `01-splash.png` | (splash / redirect) | `app.component` | A | ribbons | Plein écran, logo centré |
| S-02 | `02-login.png` | `/auth` | `features/auth/auth.page.*` | A | ribbons | Overlap card, outlined fields, btn navy, footer hint |
| S-03 | `03-dashboard.png` | `/dashboard` | `features/dashboard/dashboard.page.*` | A | grid | Profil header, overlap carte crédit, quick actions gold |
| S-04 | `04-historique-achats.png` | `/purchases` | `features/purchases/purchases.page.*` | B | — | Toolbar plain, liste `.elyk-card` |
| S-05 | `05-detail-achat.png` | `/purchases/:id` | `features/purchase-detail/purchase-detail.page.*` | B | — | Toolbar plain, cartes blanches |
| S-06 | `06-timeline-recouvrement*.png` | `/purchases/:id/timeline` | `recovery-timeline/` + `recovery-pills/` | B | — | Pastilles couleurs strictes |
| S-07 | `07-paiement-form.png` | `/payment/:id` | `features/payment/payment.page.*` | B* | ribbons? | Outlined fields, btn navy si maquette |
| S-08 | `08-paiement-confirme.png` | `/payment/:id` (confirmé) | `features/payment/payment.page.*` | B | — | État succès, btn gold |
| S-09 | `09-nouvelle-commande.png` | `/catalog` | `features/catalog/catalog.page.*` | B | — | Grille produits, toolbar plain |
| S-10 | `10-panier.png` | `/cart` | `features/cart/cart.page.*` | B | — | Liste articles, CTA gold |
| S-11 | `11-commande-confirmee.png` | `/order-confirmation` | `features/order-confirmation/` | B | — | Confirmation, btn gold |

\* S-07 : vérifier maquette — outlined + navy si formulaire de paiement.

## Imports type pour toute nouvelle page

```typescript
import {
  ElykDecorHeaderComponent,
  ElykOverlapCardComponent,
  ElykOutlinedFieldComponent,
} from '../../shared/ui';
```

## Fichiers de référence (ne pas copier-coller le SCSS)

| Rôle | Fichier |
|------|---------|
| Tokens | `customer-space/src/theme/variables.scss` |
| Boutons, layout, cartes | `customer-space/src/global.scss` |
| Header décoratif | `shared/ui/elyk-decor-header/` |
| Carte overlap | `shared/ui/elyk-overlap-card/` |
| Champ outlined | `shared/ui/elyk-outlined-field/` |
