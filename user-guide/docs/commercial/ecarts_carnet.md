# Écarts de carnet

Lorsqu’un contrôle terrain constate une disparité, le dossier apparaît dans **Écarts de carnet**. Vous décidez s’il faut enregistrer la mise manquante ou contester le constat.

## Ouvrir la file

1. Dans le menu latéral, cliquez sur **Écarts de carnet**.
2. L’onglet **En attente** liste les dossiers encore à traiter.
3. Choisissez le type **Tontine** ou **Vente**, ou laissez **Tous**.
4. Les onglets **Écart inverse**, **Acceptés** et **Rejetés** affichent les autres situations.

Chaque ligne indique le client, la référence, le montant du système, le montant du carnet, l’écart et la date du constat. Pour une tontine, les mois concernés sont rappelés sous la ligne.

## Accepter une disparité

1. Cochez une ou plusieurs lignes, puis cliquez sur **Accepter la sélection**. Vous pouvez aussi cliquer sur **Accepter** sur une seule ligne.
2. La fenêtre indique ce qui va être enregistré, et le manquant de caisse s’il y en a un.
3. Cliquez sur **Confirmer**.

Ce qui est enregistré :

- **Vente** : une mise du jour, dans la limite du reste dû, lorsque le carnet dépasse le système. Si le carnet dépasse ce reste, le surplus est ajouté au reliquat du client. Un manquant de caisse du même montant est ouvert.
- **Tontine** : le dossier est recalé sur le carnet, mois par mois.
  - Chaque mois où le carnet dépasse le système reçoit la mise manquante. Si le mois est déjà passé, la mise est datée du dernier jour de ce mois. Un manquant de caisse du même montant est ouvert.
  - Chaque mois présent dans le système mais absent du carnet est annulé, et retiré de la caisse de ce jour. Un mois seulement en partie trop élevé est réduit au montant du carnet. Ce mois n’est pas conservé en plus du carnet.
  - Si l’argent d’un mois annulé a déjà été versé, ce jour peut afficher un surplus.

Le manquant, s’il y en a un, est visible dans **Dettes**. Un versement du même jour, sur la vente ou sur la tontine selon le dossier, le règle.

Le récapitulatif indique les lignes traitées. Pour une vente, une ligne où le système dépasse le carnet n’est pas modifiée : vous pouvez la rejeter.

## Rejeter une disparité

1. Cliquez sur **Rejeter**, ou cochez plusieurs lignes puis **Rejeter la sélection**.
2. Indiquez le motif.
3. Confirmez.

Aucune mise et aucun manquant ne sont créés. Le dossier passe dans **Rejetés**. Un nouveau contrôle terrain peut le faire réapparaître dans **En attente**.

## Quand le système dépasse le carnet

Ouvrez **Écart inverse**.

- **Tontine** : **Accepter** annule les mois en trop pour coller au carnet et les retire de la caisse de ces jours. Si le carnet ne dépasse pas le système, aucun manquant n’est ouvert. Si l’argent de ce mois a déjà été versé, le jour concerné peut afficher un surplus.
- **Vente** : l’acceptation ne modifie pas la mise. Vous pouvez **Rejeter** le constat avec un motif, ou le laisser dans la file.
