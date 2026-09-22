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

## 2. Configuration des numéros Mobile Money (`/configuration/mobile-money`)

Pour permettre aux clients finaux de régler leurs traites ou de cotiser à la tontine directement depuis l'Espace Client ELYKIA, l'application permet de configurer les numéros de réception Mobile Money (Mixx by YAS et Moov Money) attribués aux commerciaux.

<!-- CAPTURE À INSÉRER : Page de configuration Mobile Money avec numéros globaux, KPIs, tableau des commerciaux et colonne Effectif. -->

### A. Numéros globaux par défaut de l'entreprise
En haut de l'écran, deux cartes récapitulent les numéros institutionnels de la société :
* **Mixx by YAS (global)** : Numéro de compte entreprise par défaut.
* **Moov Money (global)** : Numéro de compte entreprise par défaut.
Ces numéros servent de filet de sécurité automatique lorsqu'un commercial ne possède pas de compte propre.

### B. Indicateurs de configuration
* **Commerciaux configurables** : Nombre total d'agents commerciaux enregistrés dans l'agence.
* **Configurations spécifiques** : Nombre d'agents disposant d'au moins un numéro personnel configuré.

### C. Tableau de paramétrage par commercial
Chaque ligne du tableau correspond à un commercial :
1. **Identité de l'agent** : Nom complet, identifiant de connexion et numéro de téléphone de contact.
2. **Mixx by YAS** : Champ de saisie pour renseigner le numéro Mixx spécifique de l'agent.
3. **Moov Money** : Champ de saisie pour renseigner le numéro Moov spécifique de l'agent.
4. **Colonne Effectif** : Présente en temps réel les numéros effectifs qui seront présentés aux clients du commercial sur l'application mobile et l'Espace Client :
   * Si un numéro spécifique est saisi, il devient immédiatement le numéro effectif.
   * Si le champ est laissé vide, le système applique automatiquement le numéro global de la société comme valeur de repli.
5. **Action Enregistrer** : Cliquez sur le bouton bleu **« Enregistrer »** situé à l'extrémité de la ligne pour sauvegarder instantanément les coordonnées de l'agent.

> **Accès au module** : Menu latéral **Configuration > Mobile Money**. Si ce sous-menu n'est pas visible, vous ne disposez pas des habilitations requises pour modifier les paramètres financiers de l'agence.
