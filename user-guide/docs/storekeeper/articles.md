# Gestion des Articles

Le menu **Articles** permet au magasinier de gérer le catalogue des produits disponibles à la vente.

## 1. Liste des Articles
![Liste des articles](../images/storekeeper_articles_list.png)

L'écran principal affiche la liste de tous les produits enregistrés :
*   **#** : Index.
*   **Nom** : Désignation commerciale.
*   **Marque** & **Modèle**.
*   **Type** : Catégorie du produit (ex: MOTO, ELECTRO).
*   **Quantité** : Stock système actuel.
*   **Prix** : Prix de vente standard.

### Recherche
Utilisez la barre de recherche en haut pour filtrer rapidement par nom ou référence.

## 2. Ajouter un Article
![Formulaire ajout article](../images/storekeeper_article_add.png)

Pour référencer un nouveau produit :

1.  Cliquez sur le bouton **Ajouter**.
2.  Remplissez le formulaire de création :
    *   **Nom** (Requis) : Le nom du produit.
    *   **Marque** & **Modèle** (Requis) : Informations fabricant.
    *   **Type** : Sélectionnez une catégorie existante.
    *   **Prix d'achat** : Coût d'acquisition fournisseur.
    *   **Prix de vente** : Prix public standard.
    *   **Prix de vente à crédit** : Prix majoré pour les ventes à crédit.
        > [!WARNING]
        > Règle de prix obligatoire : **Prix d'achat <= Prix de vente <= Prix de vente à crédit**.
    *   **Point de commande** : Niveau de stock minimum avant alerte (Stock Critique).
    *   **Niveau de stock optimal** : Quantité idéale à maintenir.
    *   **Saisonnier ?** : Oui/Non.
3.  Cliquez sur **Valider** pour enregistrer.

## 3. Modifier ou Supprimer
Dans la colonne **Actions** du tableau :
*   **Modifier (Crayon rouge)** : Ouvre le formulaire pour corriger des informations.
*   **Détails (Œil vert)** : Affiche la fiche complète de l'article.
*   **Supprimer (Corbeille)** : Retire l'article du catalogue (Action irréversible).
