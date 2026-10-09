# Annulation de ventes

Cette page explique comment annuler une ou plusieurs ventes à crédit d’un commercial, par exemple après une erreur de saisie ou un doublon. L’annulation remet les articles dans le stock du commercial, corrige ses rapports de vente et produit des pièces d’audit PDF.

---

## 1. Accéder à l’écran

1. Dans le menu latéral, cliquez sur **Ventes**, puis sur **Annulation Ventes**.
2. L’écran **Rapports & Archives d'Annulations de Ventes** s’ouvre sur l’historique des annulations déjà effectuées.
3. Cliquez sur **Actualiser** pour recharger la liste.

<!-- CAPTURE À INSÉRER : écran Rapports & Archives d'Annulations de Ventes avec l'historique -->

---

## 2. Ventes qui peuvent être annulées

- Seules les ventes **du mois en cours** peuvent être annulées. La période choisie ne peut pas dépasser 31 jours.
- Seules les **ventes à crédit** sont concernées, aux statuts **CREATED**, **VALIDATED** ou **INPROGRESS**. Les ventes au comptant et les livraisons tontine ne le sont pas.
- Une vente sur laquelle un **recouvrement** a déjà été encaissé après la vente ne peut pas être annulée. Elle apparaît dans l’onglet **Ventes rejetées** avec le montant déjà recouvré.
- Une vente qui n’a reçu **que l’avance initiale** peut être annulée : l’avance est retirée des montants à verser du jour de la vente.

---

## 3. Simuler l’annulation

1. Cliquez sur **Nouvelle annulation**. La fenêtre **Nouvelle Annulation de Ventes (Mois en cours)** s’ouvre.
2. Choisissez le **Commercial**.
3. Renseignez la **Date Début** et la **Date Fin** (dans le mois en cours).
4. Si besoin, choisissez un **Statut de vente**. Par défaut, tous les statuts annulables sont pris en compte.
5. Cliquez sur **Simuler l'impact (Dry-Run)**. Rien n’est encore annulé à ce stade.

La simulation affiche trois cartes : **Total Ventes Détectées**, **Ventes Éligibles à l'Annulation** et **Ventes Rejetées (Recouvrements perçus)**, avec leurs montants.

<!-- CAPTURE À INSÉRER : résultat de la simulation avec les trois cartes et les onglets -->

---

## 4. Choisir les ventes à annuler

Vous pouvez annuler une seule vente, quelques ventes ou toutes les ventes éligibles de la période.

1. Ouvrez l’onglet **Ventes éligibles**. Chaque vente a une case à cocher, et toutes sont cochées au départ.
2. Pour annuler **une seule vente**, décochez **Tout sélectionner** (case de l’en-tête du tableau), puis cochez uniquement la vente voulue.
3. Pour retirer une vente du lot, décochez sa case : la ligne s’affiche en grisé et ne sera pas annulée.
4. Au-dessus du tableau, le bandeau indique le nombre de ventes sélectionnées et leur montant total.
5. L’onglet **Impact stock** affiche les quantités des ventes cochées qui seront remises dans le stock du commercial pour le mois en cours.
6. L’onglet **Ventes rejetées** liste les ventes qui ne peuvent pas être annulées, avec le motif.

Les ventes éligibles non cochées restent inchangées : vous pourrez les annuler plus tard avec une nouvelle simulation.

<!-- CAPTURE À INSÉRER : onglet Ventes éligibles avec les cases à cocher et le bandeau de sélection -->

---

## 5. Confirmer l’annulation

1. Saisissez le **Motif obligatoire de l'annulation**. Il est conservé dans les pièces d’audit.
2. Cliquez sur **Confirmer l'annulation (N vente(s))**. Le bouton reste inactif tant qu’aucune vente n’est cochée ou que le motif n’est pas saisi.
3. Vérifiez dans la fenêtre de confirmation le nombre de ventes et le montant total, puis cliquez sur **Oui, exécuter l'annulation**.
4. Un message récapitule le nombre de ventes annulées, de ventes rejetées et de pièces d’audit archivées.

Pour chaque vente annulée :

- les articles sont remis dans le stock du commercial pour le mois en cours ;
- le nombre de ventes, le montant vendu, la marge, l’avance éventuelle et le montant à verser sont corrigés sur le rapport du jour de la vente ;
- une écriture de contre-passation est ajoutée au journal des opérations, à la date de la vente.

Si une seule vente du lot ne peut pas être traitée (par exemple, rapport du jour de la vente introuvable), aucune vente n’est annulée et un message d’erreur explique la cause.

---

## 6. Consulter l’historique et les pièces d’audit

1. Dans l’historique, chaque ligne indique l’opération, le commercial, la période, le statut, le nombre de ventes annulées, le montant reversé, les ventes rejetées et la personne qui a lancé l’annulation.
2. Cliquez sur **Voir** pour ouvrir le détail : motif déclaré, chiffres de l’opération et **Pièces justificatives et rapports d'audit**.
3. Cliquez sur **Télécharger** pour récupérer :
   - le **bordereau d’annulation** de chaque vente (articles remis en stock, motif, signatures) ;
   - le **rapport de synthèse** de l’opération (totaux et ventes rejetées).
