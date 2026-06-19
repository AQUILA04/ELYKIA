# Mapping maquettes → routes → fichiers

| # | Maquette | Route | Composant |
|---|----------|-------|-----------|
| S-01 | `01-splash.png` | (splash / redirect) | `app.component` |
| S-02 | `02-login.png` | `/auth` | `features/auth/auth.page.*` |
| S-03 | `03-dashboard.png` | `/dashboard` | `features/dashboard/dashboard.page.*` |
| S-04 | `04-historique-achats.png` | `/purchases` | `features/purchases/purchases.page.*` |
| S-05 | `05-detail-achat.png` | `/purchases/:id` | `features/purchase-detail/purchase-detail.page.*` |
| S-06 | `06-timeline-recouvrement*.png` | `/purchases/:id/timeline` | `features/recovery-timeline/` + `shared/components/recovery-pills/` |
| S-07 | `07-paiement-form.png` | `/payment/:id` | `features/payment/payment.page.*` |
| S-08 | `08-paiement-confirme.png` | `/payment/:id` (état confirmé) | `features/payment/payment.page.*` |
| S-09 | `09-nouvelle-commande.png` | `/catalog` | `features/catalog/catalog.page.*` |
| S-10 | `10-panier.png` | `/cart` | `features/cart/cart.page.*` |
| S-11 | `11-commande-confirmee.png` | `/order-confirmation` | `features/order-confirmation/order-confirmation.page.*` |
