# PR 4/7 — Livrer avec récapitulatif avant confirmation

Chantier « commande et livraison tontine » (plan général : `.cursor/plans/tontine_commande_livraison_7_pr.plan.md`). Construite sur la PR 3 (#262) : elle réutilise `computeTontineOrderBalance`.

## Besoin (point 2)

- « Marquer comme livré » devient **Livrer** sur la fiche membre.
- Au clic : récapitulatif de la commande, avec possibilité de compléter le solde ou de réduire la commande quand elle dépasse le solde.
- **Confirmer la livraison** activé seulement quand tout est OK.
- Le reçu de remise indique le total cotisé (net), le total utilisé et le total restant (ou 0).
- Web : la livraison présente l'aperçu avant confirmation.

## Livré

- Mobile 2.44.0 : `TontineDeliverRecapModalComponent` (+ module, spec), `stepTontineDeliveryItem` partagé, fiche membre (bouton et menu « Livrer », réouverture après complément, enregistrement de la réduction, bon de remise `TontineDeliveryReceiptModalComponent`), e2e S2.
- Frontend 2.59.0 : `TontineDeliverPreviewDialogComponent` (+ spec), fiche membre, e2e golden path étape 26.
- Guide web et mobile, index RAG, HTML.

## Limites

- Le complément de solde au moment de la remise reste sur le mobile ; le web propose la réduction.
- Réduire une commande encore locale (non synchronisée) reste impossible, comme « Modifier la commande ».
- Karma ne compile pas sur le dépôt (specs cassées ailleurs) : la spec web n'a été que typée.
