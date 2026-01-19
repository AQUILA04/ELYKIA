# Inventaires & Approvisionnements

Ce module est le cœur de l'activité logistique. Il permet de gérer les entrées de stock et d'effectuer les contrôles d'inventaire périodiques.

> [!NOTE]
> Certaines fonctionnalités de contrôle (Valorisation, Clôture) sont réservées au **Gestionnaire** et ne sont pas visibles pour le Magasinier.

## 1. Approvisionnement (Entrées de Stock)
![Formulaire entrées stock](../images/storekeeper_supply_entry.png)

Cette fonction permet d'ajouter des produits au stock suite à une réception fournisseur.

1.  Cliquez sur le bouton **+ Entrées**.
2.  Dans le formulaire **Entrée de stock** :
    *   **Articles à approvisionner** : Cliquez pour ouvrir la liste déroulante et cochez tous les produits reçus.
    *   Pour chaque article sélectionné, saisissez la **Quantité** physique reçue.
3.  Cliquez sur **Valider l'entrée** (Icône bleue).
    *   *Le stock est immédiatement mis à jour.*

## 2. Cycle d'Inventaire (Magasinier)
![Liste des inventaires](../images/storekeeper_inventory_list.png)

Le rôle du magasinier est de compter et de saisir les quantités réelles.

### a. Lancer un inventaire
Si aucun inventaire n'est en cours, cliquez sur le bouton **Créer un inventaire**.
*   Cela crée un "point de contrôle" figeant l'image du stock système à cet instant.

### b. Comptage Physique
![Saisie des quantités physiques](../images/storekeeper_inventory_count.png)

Une fois l'inventaire créé (Statut: *IN_PROGRESS*) :

1.  **Imprimer la fiche** : Cliquez sur **Télécharger PDF**.
    *   Ce document liste tous les articles pour faciliter le comptage manuel dans l'entrepôt.
2.  **Saisir les résultats** : Cliquez sur **Saisir quantités physiques**.
    *   Un tableau s'ouvre affichant la *Quantité Système*.
    *   Remplissez la colonne **Quantité Physique** avec vos comptages.
    *   **Code Couleur** :
        *   <span style="color:red">Rouge</span> : Manquant (Physique < Système).
        *   <span style="color:green">Vert</span> : Surplus (Physique > Système).
        *   Gris : Ok.
3.  Cliquez sur **Soumettre les quantités** pour sauvegarder votre saisie.

---

## 3. Contrôle & Clôture (Réservé au Gestionnaire)
![Détails réconciliation inventaire](../images/manager_inventory_reconcile.png)

Ces actions apparaissent uniquement pour les utilisateurs ayant des droits de validation financière.

### a. Valorisation du Stock
En haut de page, trois cartes résument la valeur financière du stock :
*   **Prix Total Achat** : Valeur de l'actif stock.
*   **Prix Total Vente** : Chiffre d'affaires potentiel.
*   **Total Écart** : Perte ou Gain financier détecté lors de l'inventaire.

### b. Réconciliation et Clôture
Une fois le comptage du magasinier terminé :
1.  **Réconcilier les écarts** : Permet d'ajuster le stock système pour qu'il corresponde à la réalité physique saisie.
2.  **Clôturer l'inventaire** : Valide définitivement la période. L'inventaire passe en statut terminé et ne peut plus être modifié.

### c. Reset Stock (Maintenance)
Le bouton **Reset Stock** (Cercle fléché) permet de remettre brutalement les stocks à zéro.
> [!CAUTION]
> Cette action est destructrice et irréversible. À utiliser uniquement en cas de redémarrage complet ou d'erreur système majeure.
