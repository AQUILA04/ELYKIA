# Tableaux de Bord

Cette section décrit les outils de pilotage mis à disposition du gestionnaire pour superviser l'activité de l'agence.

## 1. Dashboard Principal (Opérationnel)

Dès votre connexion, ce tableau de bord vous donne une vue immédiate sur les métriques clés et les urgences logistiques.

### a. Vue d'ensemble (Cartes)
Quatre indicateurs clés s'affichent en haut de page pour suivre la croissance :
*   **Total Clients** : Nombre de clients enregistrés (avec tendance, ex: "+10% depuis hier").
*   **Total Accounts** (Comptes) : Nombre de comptes actifs.
*   **Total Localities** : Zones couvertes.
*   **Total Articles** : Références produits au catalogue.

![Dashboard Principal](../images/manager/02_dashboard_summary.png)

### b. Alertes de Stock (Magasinier)
Pour les utilisateurs ayant le rôle *Magasinier*, deux tableaux critiques s'affichent pour la gestion des stocks :

1.  **Liste des articles en rupture de stock** : Affiche les produits dont la quantité est à 0. Action requise : Réapprovisionnement urgent.
2.  **Article en rupture imminente** : Affiche les produits dont le stock est faible (Code couleur : Rouge = 0, Orange <= 5, Vert > 5).

---

## 2. Dashboard BI (Décisionnel)

Le Dashboard BI offre une analyse financière et commerciale approfondie pour la prise de décision stratégique.

### a. Filtres Périodiques
Vous pouvez analyser les performances sur différentes plages de temps :
*   **Aujourd'hui** : Performance temps réel.
*   **Cette semaine** / **Ce mois** / **Cette année**.
*   **Personnalisé** : Permet de définir une date de début et de fin spécifique.

### b. KPIs Financiers
Quatre cartes synthétisent la santé économique sur la période choisie :
1.  **Chiffre d'Affaires** : Total des ventes (avec courbe d'évolution).
2.  **Marge Brute** : Profit réalisé (avec % de marge).
3.  **Encaissements** : Total recouvré (avec taux de recouvrement).
4.  **Stock Total** : Valeur financière du stock actuel.

### c. Centre d'Alertes et Notifications
Cette section met en avant les points d'attention critiques :
*   **Articles en rupture** : Nombre d'articles épuisés (Rouge).
*   **Stock faible** : Nombre d'articles à commander (Orange).
*   **Crédits en retard** : Montant total des impayés (Rouge).
*   **Taux de recouvrement** : Indicateur de performance de collecte (Vert > 75%, Orange > 50%, Rouge < 50%).

### d. Liens Rapides
Accédez directement aux, rapports détaillés via les boutons :
*   *Analyse des Ventes*
*   *Analyse des Recouvrements*
*   *Analyse du Stock*

![Dashboard BI](../images/manager/04_dashboard_bi.png)
