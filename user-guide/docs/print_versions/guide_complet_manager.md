# Guide Gestionnaire — édition imprimable

Cette édition regroupe les pages canoniques du guide utilisateur. Vérifiez la date de mise à jour du site avant toute impression ou diffusion.

## Guide Gestionnaire

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

- Tableaux de bord pour lire les KPI sans confondre les périodes.
- Opérations quotidiennes pour les caisses, clients, comptes et versements.
- Stocks, ventes et commandes pour les flux de marchandises et de crédits.
- Finances et tontines pour les dépenses, remises et contrôles tontine.
- Rapports et configuration pour l’analyse et les référentiels.

## Tableaux de bord

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

## Opérations quotidiennes

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

Les versements ne se lisent plus comme un total unique. Dans le **Rapport Journalier**, le segment **Versements** sépare les montants crédit, tontine, solde de nouveaux comptes, surplus et total. Les règles de création, d’annulation et de réception sont précisées dans le guide Rapports et configuration.

## Stocks, ventes et commandes

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

Après livraison, la vente apparaît dans **Ventes > Liste**. Pour une vente à crédit, le responsable valide l’enregistrement puis le magasinier démarre la vente validée. Seules les ventes `INPROGRESS` sont candidates à l’encaissement régulier. Consultez le parcours commercial pour le détail du crédit, des retards et des recouvrements.

## Stock tontine et commandes

Le stock tontine suit le même principe de demande, validation, livraison et retour, mais il est affecté aux livraisons de fin d’année. Ne confondez pas une demande de stock tontine avec la préparation de livraison sur la fiche du membre : la première alimente le stock concerné, la seconde choisit les articles destinés au membre.

Le menu **Commandes** est disponible selon les rôles. Utilisez les statuts et les détails de la commande pour traiter le dossier dans l’ordre prévu par l’interface ; n’enregistrez pas de vente ou de livraison avant que le statut n’y autorise l’action.

## Finances et tontines

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

## Rapports et configuration

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
