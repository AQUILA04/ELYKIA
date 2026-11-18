# Complément livraison sans plafond + édition commande

## Demandes

1. Pas de plafond prévisionnel sur le complément à la livraison
2. Remise / Valider : proposer Compléter le solde ou Modifier (pas seulement hors ligne)
3. Fiche membre : Modifier la commande tant que non livré

## Changements

- Backend `assertDeliveryTopUp` : retire le check projected
- Backend `replaceItems` : retire le check available en CLOSED
- Mobile delivery-creation : `promptBalanceShortfall`
- Mobile member-detail : bouton + menu Modifier la commande ; save sans plafond available
