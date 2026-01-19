# Gestion Financière & Tontines

Ce module couvre la gestion de la trésorerie (Dépenses) et le suivi complet des Tontines (Épargne).

## 1. Gestion des Dépenses

Le module Dépenses permet de tracer toutes les sorties de caisse pour assurer une comptabilité juste.

### a. Tableau de Bord
À l'ouverture du module, le tableau de bord présente une vue synthétique.

**Indicateurs Clés (KPIs) :**
*   **Total Semaine** : Montant cumulé des dépenses de la semaine en cours.
*   **Total Mois** : Montant cumulé des dépenses du mois en cours.

**Actions Principales :**
*   **Liste** : Accéder à l'historique détaillé.
*   **Ajouter** : Enregistrer une nouvelle sortie de caisse.

![Tableau de Bord Dépenses](../images/manager/expense_dashboard.png)

### b. Créer une Dépense
Pour justifier une sortie d'argent :
1.  Cliquez sur le bouton **Ajouter**.
2.  Remplissez le formulaire :
    *   **Type de Dépense** : Sélectionnez la catégorie (ex: Loyer, Electricité). *Configurable dans les paramètres.*
    *   **Montant** : La somme exacte en XOF.
    *   **Date** : Date de la dépense (par défaut aujourd'hui).
    *   **Description** : Détails explicatifs.
    *   **Référence** : Numéro de reçu ou de facture justificative.
3.  Cliquez sur **Enregistrer**.

![Formulaire Dépense](../images/manager/expense_form.png)

### c. Suivi des Dépenses (Liste)
L'écran **Liste** affiche l'historique complet.

**Colonnes du tableau :**
*   **Date** : Jour de la dépense.
*   **Type** : Catégorie.
*   **Montant** : Valeur en XOF.
*   **Description** : Libellé court.
*   **Actions** :
    *   **Modifier** (Crayon) : Pour corriger une erreur.
    *   **Supprimer** (Corbeille) : Pour annuler une écriture.

![Liste des Dépenses](../images/manager/expense_list.png)

---

## 2. Gestion des Tontines

Le module Tontines est le cœur de l'activité d'épargne. Le tableau de bord supervise les sessions de collecte.

### a. Tableau de Bord Tontine
L'écran principal offre une vue d'ensemble de la session en cours.

**En-tête & Actions :**
*   **Sélecteur de Session** : Permet de naviguer entre les sessions (actives ou passées).
*   **Comparer les Sessions** : Analyser l'évolution des performances.
*   **Paramètres de Session** : Configurer la session active.
*   **Ajouter un Membre** : Inscription individuelle.
*   **Ajout Multiple** : Inscription en masse par commercial.

**Indicateurs de Performance (KPIs) :**
Des cartes colorées résument l'état de la tontine :
*   **Membres Actifs** : Nombre total d'inscrits.
*   **Montant Total Collecté** : Épargne cumulée (Vert).
*   **Revenu Total** : Part société générée (Accentué).
*   **En Attente de Livraison** : Livraisons non effectuées (Orange).
*   **Contribution Moyenne** : Panier moyen par membre.

![Tableau de Bord Tontine](../images/manager/tontine_dashboard.png)

### b. Ajouter un Membre (Individuel)
Pour inscrire un nouveau client à la tontine :
1.  Cliquez sur **Ajouter un Membre**.
2.  Dans la fenêtre modale :
    *   **Rechercher un client** : Saisissez le nom ou code.
    *   **Sélectionner un client** : Choisissez le client dans la liste.
    *   **Fréquence de cotisation** : Journalier, Hebdomadaire ou Mensuel.
    *   **Montant souhaité** : Mise définie par le client.
    *   **Notes** : Observations éventuelles.
3.  Cliquez sur **Ajouter**.

![Ajout Membre](../images/manager/tontine_add_member.png)

### c. Ajout Multiple (Par Commercial)
Pour configurer rapidement une liste de clients gérés par un commercial :
1.  Cliquez sur **Ajout Multiple**.
2.  **Choisir le commercial** : Sélectionnez l'agent responsable.
3.  **Configuration Globale** :
    *   Définissez un *Montant global* et une *Fréquence globale* par défaut pour ce groupe.
4.  **Sélection des Clients** :
    *   Cochez les clients à intégrer.
    *   *Ajustement* : Vous pouvez modifier le montant ou la fréquence individuellement pour chaque client dans le tableau.
5.  Cliquez sur **Valider**.

![Ajout Multiple](../images/manager/tontine_add_multiple.png)

### d. Liste des Membres
Le tableau principal permet de gérer les adhérents au quotidien.

**Filtres disponibles :**
*   **Barre de recherche** : Par nom ou numéro.
*   **Filtres** : Par statut de livraison ou par commercial.

Le tableau permet de cliquer sur un membre pour voir ses détails (Historique, Versements).
