# Finances et tontines

Ce guide couvre les dépenses, les versements et le contrôle de la tontine depuis le point de vue de gestion. Les montants présentés par l’application restent soumis aux permissions KPI financières de la page.

## Dépenses

Le menu **Dépenses** permet de créer, filtrer et consulter les dépenses par mois et type. Une dépense comporte un type, un montant, une date, une référence éventuelle et une description. Lorsqu’elle est indiquée comme **Comptabilisée**, les actions de modification et de suppression sont bloquées : elle est liée à une remise déjà reçue.

<!-- CAPTURE À INSÉRER : Liste des dépenses avec filtres Mois et Type, et badge Comptabilisée sur une ligne verrouillée. -->

## Remise au gestionnaire

La **Remise** est accessible depuis le Rapport Journalier aux profils autorisés. Elle travaille à l’intérieur d’un mois et peut être limitée par une plage **Du / Au**. Cette plage permet de remettre uniquement les versements non encore remis dans l’intervalle choisi.

| Étape | Secrétaire | Gestionnaire |
|---|---|---|
| Préparer | Choisit le mois et, si nécessaire, la plage de dates. Sélectionne les dépenses à déduire. | Peut initier une réception directe lorsque l’action est disponible. |
| Soumettre | Soumet la remise lorsque le montant net est valide. | Consulte la remise en attente. |
| Contrôler | Consulte l’historique. | Peut retirer des dépenses tant que la remise est en attente, puis **Accuser réception**. |
| Archiver | Consulte les lignes de versements incluses. | Après réception, dépenses et montant net sont figés. |

Le bandeau KPI distingue le total à remettre, crédit, tontine, solde des nouveaux comptes, dépenses et **montant net**. Les dépenses de type **Approvisionnement** ne sont pas proposées à la déduction. Si les dépenses dépassent le montant versé, l’action est bloquée jusqu’à correction.

## Pilotage tontine

Le Rapport Journalier affiche, pour le commercial sélectionné et si les KPI sont autorisés, un bilan annuel tontine : collectes enregistrées, versements tontine remis et reste chez le commercial. La fiche d’un membre complète ce contrôle avec la répartition des collectes par commercial, la synthèse mensuelle et les contrôles terrain.

La vérification de carnet est une action dédiée : elle ne modifie pas les montants. Elle ajoute ou retire le badge **Carnet vérifié** et conserve la date ainsi que l’auteur de la vérification. L’export PDF des membres ou d’un membre ne s’affiche qu’aux comptes autorisés.
