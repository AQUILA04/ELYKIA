# PR 3/7 — Soldes sur les reçus et détails de commande tontine

Chantier « commande et livraison tontine » (plan général : `.cursor/plans/tontine_commande_livraison_7_pr.plan.md`).

## Besoin (point 1)

Tout reçu ou détail de commande tontine affiche le solde net cotisé, le reste à payer si la commande dépasse le solde, le reliquat à restituer si elle lui est inférieure.

## Règle

- Solde net = `availableContribution` du membre (cotisations − part société, compléments inclus) tant que la commande n'est pas livrée.
- Commande livrée : solde net = commande + `remainingBalance` (reliquat versé sur le compte à la remise).
- Reste à payer = max(0, commande − solde net) ; reliquat = max(0, solde net − commande).
- Libellés après remise : Total cotisé (net), Total utilisé, Total restant.

## Livré

- Backend 1.59.0 : `TontineOrderBalance`, champs `netContribution` / `amountDue` / `refundableBalance` de `TontineDeliveryDto`, bloc des totaux du reçu PDF `tontine-order-receipt.html`.
- Frontend 2.58.0 : bloc Livraison de Fin d'Année de la fiche membre.
- Mobile 2.43.0 : `computeTontineOrderBalance`, reçu de commande (aperçu + ticket), fiche membre, bon de remise (libellés + restant réel).

## Hors périmètre

- Espace client : pas de détail de commande tontine affiché.
- Fenêtre « Détails des livraisons » du stock tontine : vue par article, pas par commande.
- Flux « Livrer » avec récapitulatif : PR 4.
