# Mapping maquettes → routes → fichiers

Pour chaque écran : consulter la **maquette PNG**, choisir l'**archétype** (voir [design-system.md](design-system.md)), composer les **composants shared/ui**.

| # | Maquette | Route | Composant | Type | Decor | Notes visuelles |
|---|----------|-------|-----------|------|-------|-----------------|
| S-01 | `01-splash.png` | (splash / redirect) | `app.component` | A | ribbons | Plein écran, logo centré |
| S-02 | `02-login.png` | `/auth` | `features/auth/auth.page.*` | A | ribbons | Overlap card, outlined fields, btn navy, footer hint |
| S-03 | `03-dashboard.png` | `/dashboard` | `features/dashboard/dashboard.page.*` | **C** | — | Header Type C + carte crédit navy + quick actions |
| S-04 | `04-historique-achats.png` | `/purchases` | `features/purchases/purchases.page.*` | **C** | — | Chips filtre + cartes avec icône/progression |
| S-05 | `05-detail-achat.png` | `/purchases/:id` | `features/purchase-detail/purchase-detail.page.*` | **C** | — | Détail + footer suivi mises |
| S-06 | `06-timeline-recouvrement*.png` | `/purchases/:id/timeline` | `recovery-timeline/` + `recovery-pills/` | **C** | — | Pastilles + footer payer |
| S-07 | `07-paiement-form.png` | `/payment/:id` | `features/payment/payment.page.*` | **C** | — | Outlined + `ion-footer` |
| S-08 | `08-paiement-confirme.png` | `/payment/:id` (confirmé) | `features/payment/payment.page.*` | **C** | — | État succès |
| S-09 | `09-nouvelle-commande.png` | `/catalog` | `features/catalog/catalog.page.*` | **C** | — | Search pill, grille, bouton Ajouter |
| S-10 | `10-panier.png` | `/cart` | `features/cart/cart.page.*` | **C** | — | Lignes, résumé, info crédit, footer commande |
| S-11 | `11-commande-confirmee.png` | `/order-confirmation` | `features/order-confirmation/` | **C** | — | Confirmation |
| — | (v2) | `/onboarding` | `features/onboarding/` | **C** | — | Outlined + `ion-footer` sur formulaires |
| — | (v2) | `/orders/:id` | `features/order-tracking/` | **C** | — | Placeholder suivi |
| — | (v2) | `/tontines` | `features/tontines/` | **C** | — | Liste + empty join |
| — | (v2) | `/tontines/join` | `features/tontine-join/` | **C** | — | Formulaire + `ion-footer` CTA |
| — | (v2) | `/tontines/:id` | `features/tontine-detail/` | **C** | — | Résumé + carnet |
| — | (v2) | `/tontines/:id/timeline` | `features/tontine-timeline/` | **C** | — | Historique mises |
| — | (v2) | `/tontines/:id/payment` | `features/tontine-payment/` | **C** | — | Outlined + `ion-footer` |
| — | (v2) | `/profile` | `features/profile/` | **C** | — | Profil + version |

\* S-07 : vérifier maquette — outlined + navy si formulaire de paiement.

## Desktop web (vues dédiées)

Quand `LayoutService.isDesktop()` est vrai, chaque page charge un composant `features/<page>/desktop/<page>-desktop.component.*` (présentation pure : `input()` / `output()`). Mapping :

| Route | Vue desktop |
|-------|-------------|
| `/auth` | `auth/desktop/auth-desktop` — split hero + formulaire |
| `/onboarding` | `onboarding/desktop/onboarding-desktop` |
| `/dashboard` | `dashboard/desktop/dashboard-desktop` — KPI + tableau |
| `/purchases` | `purchases/desktop/purchases-desktop` — tableau |
| `/purchases/:id` | `purchase-detail/desktop/…` — articles + aside |
| `/purchases/:id/timeline` | `recovery-timeline/desktop/…` |
| `/payment/:id` | `payment/desktop/…` |
| `/catalog` | `catalog/desktop/…` — filtres + grille + mini-panier |
| `/cart` | `cart/desktop/…` |
| `/order-confirmation` | `order-confirmation/desktop/…` |
| `/orders/:id` | `order-tracking/desktop/…` |
| `/tontines`… | `tontines|tontine-join|tontine-detail|tontine-timeline|tontine-payment/desktop/…` |
| `/profile` | `profile/desktop/…` (pas de CTA mise à jour in-app) |

Coque : `app.component` (`ion-split-pane`) + `shared/layout/desktop-sidebar/`.

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
