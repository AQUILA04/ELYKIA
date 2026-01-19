# Rapports & Configuration

Cette section vous aide à clôturer vos journées et à gérer les paramètres fondamentaux de l'application.

## 1. Clôturer la Journée (Rapport Journalier)

Le **Rapport Journalier** est votre outil de contrôle quotidien. Il centralise toutes les opérations (Ventes, Recouvrements, Tontines) et permet de valider la caisse.

### a. Filtres et Recherche
En haut de page, utilisez la barre d'outils pour cibler les données :
*   **Périodes** : Cliquez sur *Aujourd'hui*, *Cette Semaine*, *Ce Mois* ou *Personnaliser* (pour choisir des dates précises).
*   **Sélection Commercial** : (Admin) Permet de filtrer tout le rapport pour un agent spécifique.
*   **Marges** : Un bouton œil permet d'afficher ou masquer les marges bénéficiaires (visible selon vos droits).

![Filtres Rapport](../images/manager/18a_daily_report_filters.png)

### b. Vue d'Ensemble (Onglet 1)
Cet onglet présente la synthèse financière globale et détaillée.

**Total Général (Panneau du haut)**
Un bloc récapitulatif affiche les performances cumulées de toute l'équipe :
*   **Sortie Stock** : Valeur des marchandises sorties du magasin.
*   **Ventes à Crédit** : Montant total des dettes créées.
*   **Nouveaux Clients** & **Solde Nx Comptes**.
*   **Recouvrements** : Montant total des dettes récupérées.
*   **Tontine** : Synthèse complète (Adhésions, Collectes, Livraisons).
*   **Caisse (A Verser / Versé / Reste)** : KPI critique.
    *   **A Verser** : L'argent théorique que les commerciaux ont encaissé.
    *   **Versé** : L'argent qu'ils vous ont déjà remis.
    *   **Reste** : L'écart à combler. Si positif (Rouge), l'argent est encore dehors.

![Vue d'Ensemble](../images/manager/18b_daily_report_overview.png)

**Détail par Commercial**
Une liste déroulante détaille la performance individuelle de chaque agent.
*   **Statut Caisse** : Le cadre de l'agent change de couleur.
    *   *Rouge* : Doit de l'argent.
    *   *Vert* : A jour (Tout versé).
    *   *Orange* : Situation intermédiaire.
*   **Action "FAIRE UN VERSEMENT"** : Si un agent a de l'argent à rendre, ce bouton apparaît dans son détail. Cliquez dessus pour enregistrer la remise d'espèces physique.

![Détail Commercial](../images/manager/18c_daily_report_commercial.png)

### c. Journal des Opérations (Onglet 2)
Ce tableau offre une traçabilité totale (Audit). Il liste chronologiquement chaque action :
*   **Heure** : Moment précis de l'action.
*   **Commercial** : L'auteur de l'opération.
*   **Type** : Nature de l'opération (Vente, Paiement, Collecte...).
*   **Montant** : Impact financier.

![Journal des Opérations](../images/manager/18d_daily_report_operations.png)

### d. Historique des Versements (Onglet 3)
Liste des remises d'espèces validées entre les commerciaux et le gestionnaire :
*   **Heure** et **Date**.
*   **Commercial** (Celui qui verse).
*   **Reçu par** (Le gestionnaire qui valide).
*   **Montant** encaissé.

![Historique Versements](../images/manager/18e_daily_report_deposits.png)

## 2. Gestion des Localités (Zones)

Pour géolocaliser vos clients, vous devez définir les zones géographiques (Villes, Quartiers).

### a. Ajouter une Localité
1.  Allez dans le menu **Configuration > Localités**.
2.  Cliquez sur le bouton **Ajouter** (+).
3.  Remplissez le formulaire :
    *   **Nom** : Le nom de la ville ou du quartier (ex: "Lomé - Adidogomé").
4.  Cliquez sur **Enregistrer**.

![Ajout Localité](../images/manager/17b_locality_add.png)

### b. Consulter la liste
La liste affiche toutes les zones configurées avec :
*   **#** : Numéro d'ordre.
*   **Nom** : Libellé de la localité.
*   **Action** : Boutons pour voir, modifier ou supprimer.

![Liste des Localités](../images/manager/17a_localities_list.png)

## 3. Gestion des Types d'Article (Catégories)

Organisez votre catalogue produit en familles (ex: "Moto", "Appareil Électroménager").

### a. Créer un Type
1.  Allez dans **Configuration > Type d'Article**.
2.  Cliquez sur **Ajouter** (+).
3.  Saisissez les informations :
    *   **Nom** (Requis) : Libellé de la catégorie.
    *   **Code** (Requis) : Abréviation unique (ex: "MOTO").
    *   **Description** : Détails optionnels.
4.  Validez par **Enregistrer**.

![Création Type Article](../images/manager/17d_article_type_add.png)

### b. Suivre les Catégories
Le tableau présente :
*   **ID** : Identifiant système.
*   **Nom** & **Code**.
*   **Description**.
*   **Actions** : Modifier (Crayon) ou Supprimer (Corbeille).

![Liste Types Article](../images/manager/17c_article_types_list.png)

## 4. Gestion des Types de Dépense

Catégorisez vos sorties de caisse pour une comptabilité précise.

### a. Définir une Catégorie de Dépense
1.  Accédez à **Configuration > Types de Dépense**.
2.  Cliquez sur **Nouveau Type**.
3.  Indiquez le **Nom** de la charge (ex: "Transport", "Loyer", "Électricité").
4.  Sauvegardez.

![Ajout Type Dépense](../images/manager/17f_expense_types_add.png)

### b. Liste des Charges
Visualisez les catégories disponibles :
*   **Nom** : Intitulé de la dépense.
*   **Actions** : Modifier, Supprimer.

![Liste Types Dépense](../images/manager/17e_expense_types_list.png)

## 5. Paramètres Globaux

Ce menu permet de modifier des constantes clés de l'application (ex: Taux de change, Activation de fonctionnalités).

### a. Ajouter/Modifier un Paramètre
1.  Menu **Configuration > Paramètres**.
2.  Cliquez sur **Ajouter un paramètre** ou sur l'icône **Éditer**.
3.  Configuration :
    *   **Clé** : Identifiant technique (ex: `APP_CURRENCY`).
    *   **Valeur Booléenne** : Cochez pour un choix OUI/NON.
    *   **Valeur** : La donnée (ex: "FCFA" ou "Select OUI").
    *   **Description** : Explication de l'impact de ce paramètre.

![Formulaire Paramètre](../images/manager/17h_parameter_edit.png)

*Attention : Ne modifiez ces valeurs que si vous maîtrisez leur impact.*

### b. Consulter la liste
La table des paramètres affiche :
*   **Clé** : Le nom technique du paramètre.
*   **Valeur** : La configuration actuelle.
*   **Description** : Information sur l'usage.
*   **Action** : Modifier (Crayon) ou Supprimer (Corbeille).

![Liste Paramètres](../images/manager/17g_parameters_list.png)
