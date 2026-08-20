# Stocks, ventes et commandes

Les marchandises suivent un circuit tracé : référentiel article, entrée de stock, demande de sortie, validation, livraison, retour éventuel, puis vente ou livraison tontine. Chaque étape comporte un statut ; ne passez pas directement à l’étape suivante.

## Catalogue et inventaire

Le menu **Articles** donne accès au catalogue. La fiche article regroupe les informations commerciales et l’historique de ses mouvements. Utilisez l’inventaire pour consulter les quantités, créer un inventaire physique, saisir les quantités constatées, réconcilier les écarts puis clôturer l’opération lorsque les contrôles sont terminés.

<!-- CAPTURE À INSÉRER : Page Inventaires — panneau Actions inventaire avec Créer, Saisir quantités physiques, Réconcilier et Clôturer. -->

## Entrées de stock : validation obligatoire

Depuis **Inventaires > Entrées stock**, sélectionnez les articles et les quantités reçues, puis validez l’entrée. L’application crée une réception en attente ; elle ne doit pas être présentée comme du stock immédiatement disponible.

Le menu **Historique Entrée** permet de rechercher une réception par référence, date ou statut. Le gestionnaire habilité y trouve les actions **Valider** et **Refuser** ; le créateur ou le gestionnaire peut, selon le statut, **Abandonner** une réception en attente, et l’annulation d’une réception validée est réservée aux droits appropriés.

| Statut de réception | Sens opérationnel |
|---|---|
| En attente | Saisie créée, à contrôler avant impact sur le stock. |
| Validée | Réception acceptée ; son impact est pris en compte. |
| Refusée ou abandonnée | Réception non retenue, sans disponibilité à utiliser. |
| Annulée | Réception validée annulée selon les droits et contrôles disponibles. |

## Stock commercial et ventes

Une demande de sortie suit le circuit **Créée → Validée → Livrée**. Depuis **Stock Commercial > Demandes Sortie**, les commerciaux ou gestionnaires habilités créent une demande en sélectionnant le commercial et les articles. Le gestionnaire valide une demande créée ; le magasinier livre une demande validée. Les listes proposent les filtres de période et commercial ainsi que des exports PDF par période, demande ou sélection.

Après livraison, la vente apparaît dans **Ventes > Liste**. Pour une vente à crédit, le responsable valide l’enregistrement puis le magasinier démarre la vente validée. Seules les ventes `INPROGRESS` sont candidates à l’encaissement régulier. Consultez [le parcours commercial](../commercial/sales_orders.md) pour le détail du crédit, des retards et des recouvrements.

## Stock tontine et commandes

Le stock tontine suit le même principe de demande, validation, livraison et retour, mais il est affecté aux livraisons de fin d’année. Ne confondez pas une demande de stock tontine avec la préparation de livraison sur la fiche du membre : la première alimente le stock concerné, la seconde choisit les articles destinés au membre.

Le menu **Commandes** est disponible selon les rôles. Utilisez les statuts et les détails de la commande pour traiter le dossier dans l’ordre prévu par l’interface ; n’enregistrez pas de vente ou de livraison avant que le statut n’y autorise l’action.
