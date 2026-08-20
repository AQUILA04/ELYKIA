# Guide Magasinier — édition imprimable

Cette édition regroupe les pages canoniques du guide utilisateur. Vérifiez la date de mise à jour du site avant toute impression ou diffusion.

## Guide Magasinier

Le magasinier sécurise la circulation physique de la marchandise : catalogue, réceptions, inventaires, sorties, retours et stock tontine. Il ne valide pas automatiquement chaque étape ; les boutons disponibles dans les listes indiquent les actions autorisées à son profil.

<!-- CAPTURE À INSÉRER : Menu d’un magasinier avec Articles, Stock Commercial, Stock Tontine, Inventaires et Historique Entrée. -->

## Vos priorités

| Priorité | Objectif |
|---|---|
| Préparer les articles | Vérifier la référence, le type, le stock et les informations de la fiche article. |
| Réceptionner correctement | Créer une entrée puis attendre sa validation lorsqu’elle est requise. |
| Servir les demandes validées | Livrer les demandes de stock commercial ou tontine au bon statut. |
| Traiter les retours | Réceptionner les retours autorisés et conserver leur traçabilité. |
| Contrôler le physique | Participer à l’inventaire, à la saisie et au traitement des écarts selon vos droits. |

Consultez les pages dédiées pour les articles, les inventaires et entrées, le stock commercial et le stock tontine.

## Gestion des articles

Le catalogue d’articles est la référence commune aux entrées, demandes de sortie, ventes et livraisons tontine. Créez ou modifiez une fiche avec rigueur : une erreur de prix ou de type se répercute dans plusieurs flux.

## Consulter et rechercher

Ouvrez **Articles**. La liste présente les désignations, marques, modèles, types, prix, quantités et statuts selon votre habilitation. Utilisez la recherche et la pagination plutôt que de parcourir les pages sans filtre. La fiche article donne accès à ses informations détaillées et à son historique de mouvements.

<!-- CAPTURE À INSÉRER : Liste Articles avec recherche, colonne de stock et bouton de consultation de la fiche. -->

## Créer ou modifier une fiche

Le formulaire demande l’identification de l’article, son type, ses prix et les valeurs de suivi stock. Renseignez les montants de manière cohérente avec la politique commerciale : prix d’achat, prix de vente comptant et prix de vente à crédit ne doivent pas être confondus. Si la gestion FIFO est active, des informations de lots et de prix d’achat peuvent apparaître dans la fiche.

| Information | Utilisation |
|---|---|
| Nom, marque, modèle, type | Identifier et filtrer l’article dans les listes. |
| Prix d’achat | Valoriser le stock et calculer les marges. |
| Prix vente / crédit | Alimenter les ventes selon le type choisi. |
| Seuil de réapprovisionnement | Signaler qu’une quantité devient faible. |
| Stock et historique | Suivre les mouvements sans modifier les quantités hors procédure. |

Ne supprimez pas une fiche qui a déjà été utilisée par une opération sans validation de la procédure interne. Préférez la consultation de l’historique pour comprendre une variation de stock.

## Inventaires et entrées de stock

Le menu **Inventaires** réunit la consultation du stock, l’inventaire physique et l’entrée de marchandises. Il ne faut pas confondre une **entrée** avec un **inventaire** : l’entrée enregistre une réception attendue ; l’inventaire compare le stock système au comptage physique.

## Enregistrer une entrée

Dans **Inventaires**, choisissez **Entrées stock**, sélectionnez les articles et saisissez les quantités. Après validation, l’application confirme que l’entrée est enregistrée en attente de validation et redirige vers l’historique des réceptions.

<!-- CAPTURE À INSÉRER : Formulaire Entrée de stock avec sélecteur d’articles et bouton Valider l’entrée. -->

Ouvrez ensuite **Historique Entrée** pour retrouver la référence. Les filtres portent sur la référence, la date et le statut. Le gestionnaire habilité peut valider ou refuser une réception ; l’abandon concerne une réception en attente et l’annulation d’une réception validée reste réservée à la procédure et aux droits concernés.

> **Règle importante.** Une entrée `PENDING` ou en attente ne doit pas être utilisée comme stock disponible. Attendez le statut validé avant de préparer une sortie ou une vente fondée sur cette quantité.

## Réaliser un inventaire physique

Quand aucune session d’inventaire n’est en cours, choisissez **Créer un inventaire**. Lors d’une session active, le panneau d’actions propose le téléchargement du support, la saisie des quantités physiques, la réconciliation des écarts et la clôture, selon le statut et les permissions.

| Étape | Action |
|---|---|
| Préparer | Créer l’inventaire puis télécharger le support si nécessaire. |
| Compter | Relever les quantités physiques article par article. |
| Saisir | Utiliser **Saisir quantités physiques** pour enregistrer le comptage. |
| Analyser | Ouvrir **Réconcilier les écarts** afin d’examiner les différences. |
| Terminer | Clôturer seulement après résolution ou justification des écarts. |

L’**Historique inventaires** et la trajectoire d’un article sont visibles uniquement aux comptes dotés de la permission de consultation correspondante.

## Stock commercial

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

## Stock tontine

Le **Stock Tontine** sépare les articles destinés au cycle tontine du stock commercial. Les gestes restent proches : demande, validation, livraison et retour, mais les stocks ainsi alimentés servent ensuite aux livraisons de fin d’année des membres.

## Demandes et livraisons

Dans **Stock Tontine > Demandes Sortie**, créez ou consultez les demandes de sortie, appliquez les filtres de période et de commercial, puis contrôlez le statut. Une demande créée doit être validée avant que le magasinier puisse la livrer. La sélection multiple et les exports PDF permettent d’éditer une fiche pour une ou plusieurs demandes.

<!-- CAPTURE À INSÉRER : Liste des demandes de stock tontine avec filtres de période, statut et action Livrer. -->

## Retours tontine

Le sous-menu **Retours** enregistre les articles retournés au stock tontine. Utilisez le détail de la demande pour vérifier les articles, les quantités, la date de demande et la date de réception. Les exports PDF sont disponibles par période, sélection ou ligne selon les droits du compte.

> **À distinguer.** La livraison de stock tontine à un commercial n’est pas la livraison finale au membre. La livraison finale est préparée et validée depuis la fiche du membre dans le module **Tontines**.

## Stock annuel

Le sous-menu **Stock** présente le stock tontine par commercial et par année, lorsque le profil y est autorisé. Le rapport PDF associé doit être lu avec l’année et le commercial affichés sur le panneau.
