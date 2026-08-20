from pathlib import Path
from textwrap import dedent
import re

ROOT = Path('/home/ubuntu/ELYKIA/user-guide/docs')

files = {
'index.md': '''
# Guide utilisateur ELYKIA

Ce site décrit les parcours actuellement disponibles dans l’application ELYKIA. Il s’adresse aux équipes de gestion, de magasin, de terrain et de recouvrement. Les menus et les actions visibles dépendent du compte connecté, de ses permissions et, dans certains cas, des paramètres activés par l’organisation.

> **Principe de lecture.** Utilisez le guide correspondant à votre rôle. Une action qui n’apparaît pas dans votre interface ne constitue pas une anomalie : elle peut être protégée par une permission ou réservée à un autre profil.

<!-- CAPTURE À INSÉRER : Barre latérale de l’application web avec les sections Caisse, Stock Commercial, Ventes, Tontines, Configuration et Rapport Journalier. -->

## Les parcours disponibles

| Profil | Responsabilités principales | Guide |
|---|---|---|
| Gestionnaire, secrétaire ou administrateur | Pilotage, clients, trésorerie, contrôles, validation et configuration. | [Guide Gestionnaire](manager/index.md) |
| Magasinier | Catalogue, inventaire, réceptions, livraisons et retours de stock. | [Guide Magasinier](storekeeper/index.md) |
| Commercial | Portefeuille clients, demandes de stock, ventes, encaissements et tontine. | [Guide Commercial](commercial/index.md) |
| Chef de recouvrement | Retards, contrôles de carnet, clôtures terrain, plan de tournée et synchronisation mobile. | [Guide Chef de recouvrement](recovery-manager/index.md) |

## Repères essentiels

### Le cycle de travail

Les opérations monétaires sont rattachées à une **journée comptable** et à une **caisse**. Selon les droits du compte, la journée est ouverte puis fermée par les responsables, tandis que chaque agent concerné ouvre ou ferme sa propre caisse. Le menu **Caisse** donne accès à l’ouverture ou à la fermeture et à l’**Opération Journalière**.

### Les statuts font foi

Les crédits, demandes de stock, retours, livraisons tontine et réceptions ne sont pas seulement des listes : leurs actions changent selon leur statut. Avant d’agir, vérifiez systématiquement le badge de statut et la période affichée.

| Flux | Enchaînement courant |
|---|---|
| Demande de sortie stock | `CREATED` → `VALIDATED` → `DELIVERED` |
| Réception de stock | `PENDING` → `VALIDATED`, ou `REFUSED` / `CANCELLED` selon le rôle et l’étape |
| Vente à crédit | `CREATED` → `VALIDATED` → `INPROGRESS` → `SETTLED` |
| Livraison tontine | `PENDING` → `VALIDATED` → `DELIVERED` |

### Des données filtrées et protégées

Les tableaux récents conservent généralement la recherche, les filtres et la pagination pendant la navigation. Les KPI financiers, exports PDF, annulations, réaffectations et paramètres peuvent être masqués selon les permissions. Ne contournez jamais un contrôle d’accès en partageant un compte : demandez plutôt l’habilitation adaptée à votre responsable.

## Signaler un besoin d’assistance

Avant de signaler un problème, notez le nom de l’écran, la période sélectionnée, le statut de l’opération et, si elle existe, sa référence. Ces éléments permettent à l’équipe support de retrouver rapidement le dossier sans exposer de données sensibles.
''',
'manager/index.md': '''
# Guide Gestionnaire

Ce guide accompagne les gestionnaires, secrétaires et administrateurs dans les tâches de pilotage. Les responsabilités exactes restent déterminées par les permissions attribuées au compte : la présence d’un menu ou d’un bouton confirme qu’il est autorisé pour votre session.

<!-- CAPTURE À INSÉRER : Accueil web d’un gestionnaire avec le menu développé et les indicateurs du tableau de bord. -->

## Votre espace de pilotage

Le menu peut notamment donner accès au **Dashboard**, aux **Clients**, aux **Articles**, aux modules **Stock Commercial** et **Stock Tontine**, aux **Ventes**, aux **Tontines**, aux **Dépenses**, à la **Configuration**, au **Rapport Journalier**, aux **Inventaires**, aux **Utilisateurs** et à la **Sécurité**. Certains éléments, comme les rapports mensuels, le recrutement ou ELYKIA IA, ne s’affichent que si la permission et le paramétrage nécessaires sont actifs.

| Priorité | Où intervenir | Finalité |
|---|---|---|
| Démarrer et contrôler l’activité | Caisse, Clients, Ventes | Sécuriser les opérations du jour et les portefeuilles. |
| Garantir la disponibilité des articles | Articles, Inventaires, Stock Commercial | Suivre les réceptions, sorties, retours et écarts. |
| Contrôler l’argent et la performance | Rapport Journalier, Dépenses | Lire les indicateurs, les versements et les remises. |
| Gouverner l’application | Configuration, Utilisateurs, Sécurité | Maintenir les référentiels, paramètres et habilitations. |

## Règles de travail

La gestion d’une opération doit toujours suivre son statut. Une demande de sortie créée n’est pas encore livrable ; une réception de stock en attente n’a pas encore augmenté le stock ; une vente validée n’est pas encore démarrée. Les boutons disponibles sur une ligne correspondent à l’étape atteinte et à vos droits.

Consultez les pages suivantes selon la tâche à accomplir :

- [Tableaux de bord](dashboard.md) pour lire les KPI sans confondre les périodes.
- [Opérations quotidiennes](operations.md) pour les caisses, clients, comptes et versements.
- [Stocks, ventes et commandes](stock_sales.md) pour les flux de marchandises et de crédits.
- [Finances et tontines](finance.md) pour les dépenses, remises et contrôles tontine.
- [Rapports et configuration](reporting_config.md) pour l’analyse et les référentiels.
''',
'manager/dashboard.md': '''
# Tableaux de bord

Les tableaux de bord permettent de suivre une situation opérationnelle ou financière. Ils ne remplacent pas le contrôle des opérations détaillées : utilisez les cartes comme points d’entrée, puis ouvrez la liste ou le rapport concerné lorsque vous devez expliquer un montant, un stock ou un écart.

<!-- CAPTURE À INSÉRER : Tableau de bord gestionnaire avec cartes KPI et raccourcis vers les modules opérationnels. -->

## Lire un indicateur correctement

Vérifiez d’abord la période, le commercial sélectionné et le libellé de la carte. Une valeur peut représenter le jour, la semaine, le mois ou une période personnalisée. Les indicateurs financiers sont visibles uniquement si le compte possède la permission KPI de la page concernée.

| Indicateur fréquent | Vérification utile |
|---|---|
| Stock ou valeur de stock | Contrôler le mois, le commercial et la distinction entre stock restant, vendu ou retourné. |
| Vente ou recouvrement | Vérifier si l’indicateur porte sur les opérations enregistrées, les versements remis ou les soldes encore dus. |
| Retard | Ouvrir la liste **Ventes > Retards** pour identifier les crédits concernés. |
| Réception en attente | Ouvrir **Historique Entrée** afin de valider, refuser ou consulter la réception. |

## Accéder au détail

Utilisez les liens, cartes cliquables ou boutons **Voir** plutôt que de tirer une conclusion sur un total seul. Le tableau de bord de stock mensuel, par exemple, permet d’ouvrir le détail des ventes liées depuis la valeur du stock vendu. La fiche client et la fiche crédit permettent ensuite de suivre le dossier individuel.

> **Bon réflexe.** Actualisez l’écran après une validation, une livraison, une annulation ou un versement avant de communiquer un total.
''',
'manager/operations.md': '''
# Opérations quotidiennes

Cette page rassemble les gestes de contrôle du jour : journée comptable, caisse, clients, comptes et versements. Les libellés et boutons dépendent des permissions de la session.

## Journée comptable et caisse

La page **Gestion de la journée comptable** affiche la date comptable, en lecture seule, et l’action **Ouvrir** ou **Fermer** selon son état. Lorsqu’elle est ouverte, la liste **Caisses Ouvertes** identifie les collecteurs encore en service. Cette page peut être réservée aux comptes chargés de l’ouverture ou de la fermeture.

Le menu **Caisse > Ouverture / Fermeture** permet à l’agent autorisé d’ouvrir ou de fermer sa caisse. L’écran indique le nom de l’utilisateur concerné et ne demande pas de saisie supplémentaire.

<!-- CAPTURE À INSÉRER : Écran Gestion de la caisse avec le nom de l’utilisateur et le bouton Ouvrir Caisse. -->

| Action | Précondition | Résultat attendu |
|---|---|---|
| Ouvrir la journée | Permission d’ouverture et date comptable proposée. | Les opérations du jour peuvent être réalisées. |
| Ouvrir une caisse | Journée comptable ouverte et permission de caisse. | L’agent peut enregistrer ses opérations. |
| Fermer une caisse | Fin des opérations de l’agent. | La caisse ne doit plus recevoir de nouvelle opération. |
| Fermer la journée | Contrôle préalable des caisses encore ouvertes. | La journée est clôturée selon la procédure de l’organisation. |

Le **billetage** peut être accessible selon le déploiement. Il consiste à renseigner les quantités de billets et de pièces ; le total est calculé avant la validation. Comparez le total obtenu avec les opérations enregistrées, sans modifier artificiellement les montants pour faire disparaître un écart.

## Clients et comptes

Dans **Clients**, recherchez d’abord par nom, prénom, téléphone ou localité. Un filtre commercial peut être appliqué, et les KPI indiquent notamment les clients avec crédit actif ou membres tontine. La création exige les informations d’identité, la pièce, les coordonnées, la localité et les commerciaux associés. La géolocalisation peut être obtenue par GPS ou saisie manuellement.

La réaffectation d’un portefeuille par cases à cocher est réservée aux comptes habilités. Le responsable peut choisir séparément un commercial crédit et un commercial tontine ; la case de transfert automatique ne concerne que les ventes crédit en cours et n’est disponible qu’après sélection d’un commercial crédit.

## Suivre l’opération journalière et les versements

Le sous-menu **Caisse > Opération Journalière** affiche des crédits avec le client, la localité, la mise journalière et le reste à payer. Il fournit un accès aux détails et, selon l’habilitation, à des documents de suivi.

Les versements ne se lisent plus comme un total unique. Dans le **Rapport Journalier**, le segment **Versements** sépare les montants crédit, tontine, solde de nouveaux comptes, surplus et total. Les règles de création, d’annulation et de réception sont précisées dans le guide [Rapports et configuration](reporting_config.md).
''',
'manager/stock_sales.md': '''
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
''',
'manager/finance.md': '''
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
''',
'manager/reporting_config.md': '''
# Rapports et configuration

Le **Rapport Journalier** et le menu **Configuration** sont les deux points de contrôle les plus utiles pour un gestionnaire. Le premier explique ce qui s’est passé ; le second maîtrise les référentiels et règles appliqués aux futurs dossiers.

## Rapport Journalier

Ouvrez **Rapport Journalier**. La barre de filtres commune propose **Aujourd’hui**, **Cette semaine**, **Ce mois** ou **Personnalisé**, avec une plage de dates. Les comptes non commerciaux peuvent sélectionner un commercial. Ces filtres s’appliquent à tous les segments.

<!-- CAPTURE À INSÉRER : Rapport Journalier — barre de période, sélection de commercial et segments. -->

| Segment | Usage | Accès courant |
|---|---|---|
| Vue d’ensemble | Totaux de période, bilans annuels crédit et tontine, indicateurs globaux et par commercial. | Permission KPI financier du rapport. |
| Journal | Liste paginée des opérations, filtre par type et export PDF. | Permission KPI financier du rapport. |
| Recouvrement | Contrôle opérationnel du recouvrement terrain. | Chef de recouvrement ou gestionnaire. |
| Versements | Historique ventilé par crédit, tontine, solde de nouveaux comptes, surplus et total. | Permission KPI financier du rapport. |
| Remise | Préparation, réception et historique des remises de période. | Gestionnaire ou secrétaire avec les permissions requises. |

Le bilan annuel crédit s’affiche après sélection d’un commercial. Il distingue stock d’ouverture, ventes, créances reçues ou cédées, portefeuille confié, versements crédit, reste chez le commercial et reste chez le client. Le KPI **Reste chez le client** ouvre le détail des crédits encore dus et permet un export PDF. Ne confondez pas le portefeuille confié avec le solde live des clients.

## Référentiels et paramètres

| Sous-menu Configuration | Usage |
|---|---|
| Localités | Gérer les zones et quartiers proposés dans la fiche client. |
| Type d’Article | Gérer les catégories utilisées pour classer et rechercher les articles. |
| Types de Dépense | Définir les catégories proposées à la saisie des dépenses. |
| Paramètres | Gérer les clés fonctionnelles autorisées, leurs valeurs et descriptions. |
| Mobile Money | Définir les numéros Mixx by YAS et Moov Money par commercial. |

Les listes de localités et de types d’article proposent recherche, pagination, ajout, modification et suppression selon les permissions. Le type de dépense est un référentiel plus simple, centré sur son nom ; créez-le avant la première dépense de cette catégorie.

Les paramètres sont sensibles. Modifiez une valeur uniquement après validation de la procédure interne. En particulier, `TONTINE_SOCIETY_SHARE_VERSION` est proposé sous la forme d’un choix contrôlé **V1** ou **V2** ; le passage de version peut déclencher un recalcul des parts société et bloquer temporairement les écritures tontine pendant le traitement.

Dans **Mobile Money**, les numéros saisis par commercial prévalent sur les numéros globaux affichés en haut de page. Laissez un champ vide pour conserver le repli sur la configuration globale ; vérifiez la colonne **Effectif** avant d’enregistrer.
''',
'storekeeper/index.md': '''
# Guide Magasinier

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

Consultez les pages dédiées pour [les articles](articles.md), [les inventaires et entrées](inventory.md), [le stock commercial](stock_commercial.md) et [le stock tontine](stock_tontine.md).
''',
'storekeeper/articles.md': '''
# Gestion des articles

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
''',
'storekeeper/inventory.md': '''
# Inventaires et entrées de stock

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
''',
'storekeeper/stock_commercial.md': '''
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
''',
'storekeeper/stock_tontine.md': '''
# Stock tontine

Le **Stock Tontine** sépare les articles destinés au cycle tontine du stock commercial. Les gestes restent proches : demande, validation, livraison et retour, mais les stocks ainsi alimentés servent ensuite aux livraisons de fin d’année des membres.

## Demandes et livraisons

Dans **Stock Tontine > Demandes Sortie**, créez ou consultez les demandes de sortie, appliquez les filtres de période et de commercial, puis contrôlez le statut. Une demande créée doit être validée avant que le magasinier puisse la livrer. La sélection multiple et les exports PDF permettent d’éditer une fiche pour une ou plusieurs demandes.

<!-- CAPTURE À INSÉRER : Liste des demandes de stock tontine avec filtres de période, statut et action Livrer. -->

## Retours tontine

Le sous-menu **Retours** enregistre les articles retournés au stock tontine. Utilisez le détail de la demande pour vérifier les articles, les quantités, la date de demande et la date de réception. Les exports PDF sont disponibles par période, sélection ou ligne selon les droits du compte.

> **À distinguer.** La livraison de stock tontine à un commercial n’est pas la livraison finale au membre. La livraison finale est préparée et validée depuis la fiche du membre dans le module **Tontines**.

## Stock annuel

Le sous-menu **Stock** présente le stock tontine par commercial et par année, lorsque le profil y est autorisé. Le rapport PDF associé doit être lu avec l’année et le commercial affichés sur le panneau.
''',
'commercial/index.md': '''
# Guide Commercial

Ce guide présente les parcours de terrain disponibles sur le web et, dans sa dernière partie, sur l’application mobile. Votre interface montre uniquement les actions correspondant à vos droits : l’absence d’un bouton de validation, d’export ou de réaffectation est normale si l’habilitation n’est pas attribuée.

<!-- CAPTURE À INSÉRER : Menu d’un commercial avec Clients, Stock Commercial, Ventes, Tontines et Rapport Journalier. -->

## Votre cycle de travail

| Moment | Module | Objectif |
|---|---|---|
| Préparer le portefeuille | Clients | Créer et mettre à jour les informations client. |
| Obtenir les articles | Stock Commercial | Créer une demande de sortie et suivre sa livraison. |
| Distribuer et suivre | Ventes | Créer une vente, suivre son statut et encaisser les mises. |
| Collecter l’épargne | Tontines | Inscrire, collecter, suivre la progression et préparer la livraison. |
| Rendre compte | Caisse, Rapport Journalier | Contrôler les versements et les opérations de la période. |

Suivez les pages [Clients et comptes](clients_accounts.md), [Stock](stock.md), [Ventes et commandes](sales_orders.md), [Tontines](tontine.md) et [Application mobile](mobile_app.md).
''',
'commercial/clients_accounts.md': '''
# Clients et comptes

Le module **Clients** centralise les données nécessaires aux ventes et à la tontine. Recherchez toujours un dossier existant avant de créer un client afin d’éviter les doublons.

## Rechercher et consulter

La liste affiche des KPI de portefeuille, une recherche par nom, prénom, téléphone ou localité, un filtre commercial et une pagination. Cliquez sur le nom ou sur **Voir** pour ouvrir la fiche. La fiche peut montrer les badges de crédit actif, membre tontine ou commande en cours, les informations de contact, une photo et les historiques disponibles.

<!-- CAPTURE À INSÉRER : Liste des clients avec la recherche, le filtre Commercial, les KPI et le bouton Ajouter. -->

Si un commercial est sélectionné, le bouton **Fiche Client PDF** permet l’export du portefeuille correspondant. L’export ne remplace pas la vérification de la période ou du commercial choisi.

## Créer ou modifier un client

Cliquez sur **Ajouter** puis remplissez les sections du formulaire. Les champs obligatoires affichent un astérisque.

| Section | Informations principales |
|---|---|
| Identité | Nom, prénom, adresse, téléphone à huit chiffres et photo de profil facultative. |
| Pièce d’identité | Type de pièce, numéro et document facultatif au format autorisé. |
| Informations personnelles | Date de naissance, occupation et localité recherchable. |
| Contact | Personne à contacter, si nécessaire. |
| Géolocalisation | Position GPS obtenue depuis l’appareil ou latitude/longitude saisies manuellement. |
| Commerciaux associés | Commercial crédit, commercial tontine et commercial agence. |
| Type et compte | Type client ou commercial ; solde initial lorsque la section compte est affichée. |

Validez avec **Enregistrer**. En modification, les champs liés aux commerciaux peuvent être restreints : seul un compte autorisé à l’affectation peut changer les responsables crédit ou tontine.

## Réaffecter plusieurs clients

Les comptes ayant la permission d’affectation voient des cases à cocher et le bouton **Changer de commercial**. Sélectionnez les clients, puis choisissez le commercial crédit, le commercial tontine ou les deux. L’option **Transférer automatiquement les ventes du commercial** devient disponible après sélection d’un commercial crédit ; elle transfère les ventes crédit `INPROGRESS` du portefeuille vers le nouveau commercial.

> Vérifiez la sélection avant validation. L’historique conserve la traçabilité des changements de commercial.

## Comptes

Le menu **Comptes**, lorsqu’il est visible, est distinct de la fiche client. Utilisez-le pour consulter les comptes et leurs soldes avec les droits prévus. Ne créez pas un nouveau client uniquement pour corriger une information de compte : revenez à la fiche client ou suivez la procédure de gestion de compte de votre organisation.
''',
'commercial/stock.md': '''
# Stock commercial du commercial

Le stock commercial représente les articles effectivement attribués au commercial. Il est alimenté par des demandes de sortie validées et livrées, puis ajusté par les retours traités selon leur statut.

## Demander du stock

Ouvrez **Stock Commercial > Demandes Sortie**, puis sélectionnez **Nouvelle demande** si l’action est disponible. Choisissez le commercial concerné, ajoutez les articles et quantités depuis le sélecteur, puis envoyez la demande. En fin de mois, l’écran peut afficher des indications particulières pour orienter le choix de période.

<!-- CAPTURE À INSÉRER : Formulaire Nouvelle Demande de Sortie Stock avec sélection du commercial et sélecteur d’articles. -->

La liste utilise les états suivants :

| État | Ce qu’il faut faire |
|---|---|
| Créée | Attendre la validation, ou modifier/annuler si l’interface et votre rôle l’autorisent. |
| Validée | La demande est prête à être livrée par le magasinier. |
| Livrée | Les articles sont attribués au stock commercial ; vous pouvez ensuite les distribuer. |

Utilisez **Voir** pour vérifier les articles, la référence et les dates. Les filtres de période et commercial, ainsi que les exports PDF, permettent de retrouver un dossier sans modifier les données.

## Lire le stock mensuel

Dans **Stock Commercial > Stock**, les panneaux présentent les quantités prises, vendues, retournées et restantes. Les KPI complètent la lecture avec la valeur du stock restant, la valeur vendue, le montant recouvré, le reste à recouvrer et le taux de recouvrement. La valeur du stock vendu peut ouvrir le détail des ventes liées ; le bouton de rapport PDF porte sur le panneau commercial et mensuel affiché.

## Retourner des articles

Utilisez **Stock Commercial > Retours** lorsqu’un article doit revenir au stock. Créez le retour selon les articles disponibles, puis suivez la ligne jusqu’à sa réception. Un retour non réceptionné ne doit pas être présenté comme revenu en stock. Les statuts et actions proposés par la liste indiquent si vous pouvez encore modifier, annuler ou demander une réception.
''',
'commercial/sales_orders.md': '''
# Ventes, crédits et commandes

Le menu **Ventes** rassemble la liste des crédits, les retards, échéances, recouvrements, transferts de ventes et rattrapages selon les permissions. Une vente est une opération suivie par statut ; créez-la correctement avant de solliciter une validation ou une livraison.

## Créer une vente

Dans **Ventes > Liste**, cliquez sur **Nouvelle vente**. Le formulaire permet de choisir le type **Crédit** ou **Comptant**, puis le client et les articles. Pour une vente à crédit, sélectionnez également le commercial et renseignez une avance éventuelle. Si l’option de finalité est active, le crédit peut être déclaré personnel ou professionnel pour les clients habilités.

<!-- CAPTURE À INSÉRER : Formulaire Nouvelle vente avec le sélecteur Crédit / Comptant, Client et Articles. -->

| Type de vente | Données et résultat |
|---|---|
| Crédit | Client, commercial, articles, avance optionnelle ; une mise journalière et un solde sont ensuite suivis. |
| Comptant | Client et articles ; aucun suivi de mise journalière n’est affiché sur le reçu. |

Le sélecteur de client et le sélecteur d’articles utilisent une recherche et un chargement progressif. Saisissez quelques caractères et attendez les résultats plutôt que de conclure qu’un dossier n’existe pas.

## Suivre le cycle du crédit

| Statut | Signification et action courante |
|---|---|
| `CREATED` | Vente enregistrée ; un responsable habilité peut **Valider**. |
| `VALIDATED` | Vente validée ; le magasinier peut **Démarrer** après remise de la marchandise. |
| `INPROGRESS` | Crédit en cours ; l’action **Encaisser** permet la mise, selon les droits. |
| `SETTLED` | Crédit soldé ; il n’est plus sélectionnable pour une réaffectation en lot. |

La liste propose les filtres de période KPI et une **Recherche avancée**. La case de recherche par référence permet de cibler une référence, notamment une référence de rattrapage. La fiche crédit peut afficher le stock mensuel source, l’historique des transferts de commercial et, lorsque le rôle l’autorise, le contrôle terrain.

## Encaissements, retards et transfert

Utilisez **Retards** pour identifier les crédits en retard et **Échéances** pour suivre les périodes dues. Les encaissements apparaissent dans **Recouvrements** ; leur annulation est réservée à une permission spécifique. La liste principale permet de modifier la mise d’un crédit admissible et de réaffecter plusieurs ventes non soldées si le compte dispose de la permission correspondante.

Le menu **Transfert Ventes** est un rapport de passations. Il filtre les commerciaux sortant et entrant ainsi que la période, puis présente les agrégats et le détail paginé. Une vente est comptée une seule fois dans cette lecture, sur la dernière passation pertinente.

## Commandes

Le menu **Commandes** est un parcours distinct, présent uniquement pour les comptes autorisés. Créez, consultez ou mettez à jour une commande dans l’ordre permis par ses statuts. Ne confondez pas une commande avec une vente crédit déjà démarrée.
''',
'commercial/tontine.md': '''
# Tontines

Le module **Tontines** suit les membres, collectes, livraisons et archives de collectes. Les actions d’écriture concernent la session active ; une session historique est affichée en lecture seule.

## Tableau de bord de la session

Dans **Tontines > Liste**, choisissez la session puis utilisez les filtres pour limiter les membres par recherche, commercial, localité ou statut de carnet. Le tableau peut fournir les exports PDF par commercial et, pour les comptes habilités, les exports de carnets vérifiés ou à vérifier. Les boutons **Ajouter un Membre** et **Ajout Multiple** sont indisponibles en session historique ou pendant un recalcul de part société.

<!-- CAPTURE À INSÉRER : Gestion des Tontines avec sélecteur de session, filtres, Ajout Multiple et barre de vérification de carnet. -->

La vérification en masse s’effectue en sélectionnant les membres puis en choisissant **Vérifier la sélection**. Sur la fiche membre, le badge précise `Carnet vérifié` ou `Carnet non vérifié`, ainsi que la date et l’auteur lorsqu’une vérification existe. Cette action est réservée à la permission dédiée ; elle peut être annulée par les mêmes comptes habilités.

## Inscrire et modifier un membre

Utilisez **Ajouter un Membre** pour sélectionner un client et définir sa mise. L’ajout multiple permet de créer plusieurs inscriptions quand le rôle le permet. Ouvrez ensuite une ligne pour consulter la fiche : montant contribué, solde disponible, part société, collectes à la livraison, progression des mois et historique des montants de mise.

## Enregistrer une collecte

Sur la fiche membre active, choisissez **Enregistrer une Collecte** pour une collecte normale ou **Collecte de rattrapage** pour une date antérieure à aujourd’hui. Le rattrapage demande de vérifier le mois ciblé et la mise journalière applicable avant confirmation. Le récapitulatif mensuel et l’historique des collectes se mettent à jour après l’enregistrement.

| Écran de contrôle | Ce qu’il permet de vérifier |
|---|---|
| Cotisations par commercial | Répartition des collectes selon l’agent qui les a réellement enregistrées ; le commercial actuel est signalé. |
| Synthèse mensuelle | Nombre de collectes, montant et équivalent en jours de mise. |
| Historique des montants de mise | Montant journalier applicable par période. |
| Contrôle terrain | Comparaison système, carnet et écart, lorsque le chef de recouvrement a saisi un contrôle. |

L’annulation d’une collecte est réservée aux comptes autorisés et peut être limitée au profil administrateur. Ne corrigez pas une collecte par une nouvelle collecte inverse sans suivre la procédure interne.

## Préparer et finaliser une livraison

Lorsque la session est fermée et que le statut de livraison le permet, utilisez **Préparer la Livraison** pour choisir les articles. Le dossier passe alors en `PENDING`. Un gestionnaire ou administrateur autorisé utilise **Valider la Livraison** ; ensuite, un compte autorisé par le rôle rapport ou édition tontine peut **Marquer comme Livré**. La fiche affiche alors les articles, le montant, la date, le commercial et le solde non utilisé éventuel.

> La livraison n’est pas réservée au seul magasinier : l’action est disponible selon les permissions `ROLE_REPORT` ou `ROLE_EDIT_TONTINE` de l’application actuelle.
''',
'commercial/mobile_app.md': '''
# Application mobile de terrain

L’application mobile propose un parcours commercial et un parcours dédié au chef de recouvrement. Elle privilégie l’écriture en ligne lorsque le serveur est joignable, avec possibilité d’enregistrer hors ligne lorsque l’interface le propose. La synchronisation reste indispensable pour remonter les opérations locales.

## Parcours commercial

Après connexion, le chargement initial prépare les données nécessaires aux onglets de travail. Les parcours disponibles incluent les clients, distributions, recouvrements, stock, commandes, tontine, rapport et synchronisation, selon le compte connecté.

| Action | Comportement à retenir |
|---|---|
| Créer ou modifier un client | Tentative en ligne en priorité ; l’application peut proposer un enregistrement hors ligne en cas d’indisponibilité. |
| Distribution et encaissement | Tentative en ligne puis repli local proposé selon l’erreur rencontrée. |
| Tontine | Inscription, collecte et livraison suivent la même logique hybride ; les collectes locales sont synchronisées ultérieurement. |
| Synchroniser | Les pages de synchronisation manuelle, automatique et d’erreurs permettent de contrôler les opérations en attente. |

<!-- CAPTURE À INSÉRER : Onglet Plus de l’application mobile commerciale avec l’état de synchronisation et les actions disponibles. -->

Une collecte tontine hors ligne peut afficher une estimation. Après reconnexion, lancez la synchronisation et vérifiez que l’opération a bien quitté la file d’attente avant de la considérer comme définitive.

## Parcours chef de recouvrement

Le profil chef de recouvrement est dirigé vers le parcours `/rm`. Il commence par le **Plan du jour**, où l’utilisateur choisit de un à trois commerciaux et les localités, puis télécharge le pack terrain. L’application donne ensuite accès aux onglets **Retards**, **Terrain**, **Clients** et **Plus**.

| Onglet | Usage |
|---|---|
| Retards | Suivre les crédits en retard, effectuer un contrôle de carnet et clôturer un crédit de manière totale ou partielle. |
| Terrain | Contrôler les carnets crédit et tontine ; les résultats comparent le montant système, le carnet et l’écart. |
| Clients | Rechercher un client du plan, mettre à jour téléphone et géolocalisation ; le quartier reste en lecture seule. |
| Plus | Voir l’état en ligne/hors ligne, la file d’attente, lancer la synchronisation et demander une mise à jour de l’application. |

Les contrôles terrain, modifications de contact, clôtures et vérifications de carnet peuvent être placés en file hors ligne. Dans **Plus**, synchronisez dans l’ordre proposé par l’application et examinez les erreurs éventuelles. Ne réenregistrez pas une opération déjà en attente : l’application utilise des références de synchronisation pour éviter les doublons.

## Sécurité et mise à jour

Après une réinitialisation de mot de passe, le changement est obligatoire avant de poursuivre. Si la gestion d’appareils mobiles est activée par l’organisation, seuls les appareils autorisés peuvent se connecter. La page **Plus** peut afficher la version installée et le bouton **Mettre à jour l’application** ; installez uniquement les mises à jour proposées par l’application ou par la procédure officielle de l’organisation.
''',
}

legacy = {
    'administration.md': ('Administration et paramétrage', 'manager/reporting_config.md', 'Rapports et Configuration'),
    'commercial.md': ('Gestion commerciale', 'commercial/index.md', 'Guide Commercial'),
    'daily-cycle.md': ('Cycle journalier', 'manager/operations.md', 'Opérations Quotidiennes'),
    'logistics.md': ('Logistique et stocks', 'storekeeper/index.md', 'Guide Magasinier'),
    'reporting.md': ('Reporting et synthèse', 'manager/reporting_config.md', 'Rapports et Configuration'),
    'tontine.md': ('Gestion de la tontine', 'commercial/tontine.md', 'Guide Tontines'),
    'commercial/mobile.md': ('Application mobile', 'mobile_app.md', 'Application mobile de terrain'),
    'commercial/reporting.md': ('Reporting commercial', '../manager/reporting_config.md', 'Rapports et Configuration'),
}

for relative, content in files.items():
    destination = ROOT / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(dedent(content).strip() + '\n', encoding='utf-8')

for relative, (title, target, label) in legacy.items():
    destination = ROOT / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(dedent(f'''\
        # {title}

        Cette ancienne adresse est conservée pour les favoris et les liens historiques. La procédure à jour se trouve dans [{label}]({target}).

        > **Document remplacé.** Utilisez la page cible pour les libellés, rôles, statuts et procédures de la version actuelle de l’application.
        ''').strip() + '\n', encoding='utf-8')

print_sets = {
    'print_versions/guide_complet_manager.md': [
        ('Guide Gestionnaire', ['manager/index.md', 'manager/dashboard.md', 'manager/operations.md', 'manager/stock_sales.md', 'manager/finance.md', 'manager/reporting_config.md'])
    ],
    'print_versions/guide_complet_storekeeper.md': [
        ('Guide Magasinier', ['storekeeper/index.md', 'storekeeper/articles.md', 'storekeeper/inventory.md', 'storekeeper/stock_commercial.md', 'storekeeper/stock_tontine.md'])
    ],
    'print_versions/guide_complet_commercial.md': [
        ('Guide Commercial', ['commercial/index.md', 'commercial/clients_accounts.md', 'commercial/stock.md', 'commercial/sales_orders.md', 'commercial/tontine.md', 'commercial/mobile_app.md'])
    ],
    'print_versions/guide_complet_recovery_manager.md': [
        ('Guide Chef de recouvrement', ['recovery-manager/index.md', 'recovery-manager/web.md', 'recovery-manager/mobile.md'])
    ],
}

for relative, groups in print_sets.items():
    parts = ['# ' + groups[0][0] + ' — édition imprimable', '', 'Cette édition regroupe les pages canoniques du guide utilisateur. Vérifiez la date de mise à jour du site avant toute impression ou diffusion.', '']
    for _, pages in groups:
        for page in pages:
            content = (ROOT / page).read_text(encoding='utf-8').strip()
            content = re.sub(r'\[([^\]]+)\]\((?!https?://)[^)]+\)', r'\1', content)
            lines = content.splitlines()
            if lines and lines[0].startswith('# '):
                lines[0] = '## ' + lines[0][2:]
            parts.extend(lines)
            parts.append('')
    destination = ROOT / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text('\n'.join(parts).rstrip() + '\n', encoding='utf-8')

print(f'{len(files)} pages canoniques et {len(legacy)} raccourcis mis à jour.')
