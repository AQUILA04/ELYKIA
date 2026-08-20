# Stock commercial

Le stock commercial alimente les agents chargés de la vente. Les opérations sont centralisées dans **Stock Commercial > Demandes Sortie**, **Stock** et **Retours**.

## Livrer une demande de sortie

La liste des demandes affiche des KPI, les filtres de période et de commercial, les statuts, les détails et les exports PDF. Le flux standard est le suivant :

| Statut | Acteur et action habituels |
|---|---|
| `CREATED` | La demande est créée. Un gestionnaire peut la valider ; l’annulation ou le refus dépend du rôle. |
| `VALIDATED` | La demande est prête. Le magasinier peut utiliser **Livrer**. |
| `DELIVERED` | La sortie est effectuée et la date de livraison est renseignée. |

Sélectionnez une ligne puis utilisez **Voir** pour contrôler le commercial, les dates, le statut et les articles avant livraison. Le bouton **Fiche sortie PDF** peut exporter une période ; il est aussi possible de télécharger un lot sélectionné ou une demande unique.

<!-- CAPTURE À INSÉRER : Liste Demandes de sortie stock avec badges CREATED, VALIDATED et DELIVERED, et bouton Livrer. -->

## Gérer les retours

Dans **Stock Commercial > Retours**, créez un retour pour les articles autorisés, puis suivez son statut. La liste propose des KPI, des filtres de période et de commercial, des exports et, selon l’état de la ligne, les actions **Voir**, **Télécharger**, **Réceptionner**, **Annuler** ou **Refuser**. Une date de réception vide signifie que le retour n’a pas encore été réceptionné.

## Consulter le stock mensuel

Le sous-menu **Stock** est accessible aux profils qui ne sont pas magasinier uniquement. Il présente les quantités prises, vendues, retournées et restantes par article, avec les valeurs de stock et de recouvrement. Les panneaux mensuels peuvent fournir un rapport PDF et le KPI de valeur vendue ouvre le détail des ventes liées.
