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
