# Administration & Paramétrage

Ce module permet de configurer les données de base nécessaires avant de commencer les ventes.

!!! warning "Accès restreint"
    Ces menus ne sont visibles que si vous disposez des droits d'administration ou de gestion.

---

## 📍 Gestion des Localités

Les localités permettent de segmenter votre clientèle par zone géographique (Quartier, Ville, Zone).

### 1. Accéder à la liste des localités
Dans le menu latéral gauche, cliquez sur **Localités**.
Vous êtes redirigé vers l'écran **Liste des localités**.

Vous y trouverez un tableau avec les colonnes suivantes :
*   **#** : Numéro d'ordre.
*   **Nom** : Le nom de la localité.
*   **Action** : Boutons pour gérer chaque ligne.

### 2. Ajouter une nouvelle localité
1.  Au-dessus du tableau, à droite, cliquez sur le bouton **+ Ajouter**.
2.  Le formulaire **Editer une Localité** s'affiche.
3.  Remplissez le champ :
    *   **Nom de la localité** (Requis) : Ex: *Adidogomé*, *Sanguéra*.
4.  Cliquez sur le bouton **Valider** pour enregistrer.
5.  Cliquez sur **Annuler** si vous souhaitez abandonner.

### 3. Modifier ou Supprimer
Dans la colonne **Action** du tableau :
*   Cliquez sur l'icône **Oeil** (`visibility`) pour voir les détails (Affiche la liste des clients liés à cette localité).
*   Cliquez sur l'icône **Crayon** (`edit`) pour corriger le nom.
*   Cliquez sur l'icône **Corbeille Rouge** (`delete`) pour supprimer la localité.

![Capture d'écran - Liste des Localités](images/admin-locality-list.png)

---

## 📦 Gestion des Articles

Le catalogue des articles définit tout ce que vous pouvez vendre ou livrer en tontine.

### 1. Accéder au catalogue
Dans le menu latéral gauche, cliquez sur **Articles**.
L'écran **Liste des articles** apparaît.

Le tableau présente les informations suivantes :
*   **Nom** : Désignation de l'article.
*   **Marque** : La marque du produit.
*   **Modèle** : La référence modèle.
*   **Type** : La catégorie (ex: Electroménager, Moto...).
*   **Action** : Outils de gestion.

### 2. Ajouter un Article
1.  Cliquez sur le bouton **+ Ajouter** situé en haut à droite.
2.  Vous accédez au formulaire **Editer un article**. Remplissez les champs étape par étape :

#### A. Identification
*   **Nom de l'article** : Ex: *Téléviseur 32 pouces*.
*   **Marque** : Ex: *Samsung*.
*   **Modèle** : Ex: *UE32T5300*.
*   **Type** : Choisissez une catégorie dans la liste déroulante.

#### B. Prix (Règles strictes)
Vous devez saisir trois prix. Le système vérifiera que : **Prix Achat ≤ Prix Vente ≤ Prix Crédit**.
*   **Prix d'achat** : Combien vous a coûté l'article.
*   **Prix de vente** : Prix pour un paiement comptant.
*   **Prix de vente à crédit** : Prix pour une vente payable en 30 jours.

#### C. Stock & Autres
*   **Point de commande** : Quantité minimum avant de commander (ex: 5).
*   **Niveau de stock optimal** : Quantité idéale à avoir (ex: 20).
*   **Saisonnier ?** : Sélectionnez **Oui** ou **Non**.

3.  Cliquez sur **Valider** pour créer l'article.

### 3. Actions sur un article
Depuis la liste :
*   **Détails** (Oeil) : Affiche la fiche complète.
*   **Modifier** (Crayon bleu) : Permet de changer un prix ou une info.
*   **Supprimer** (Corbeille rouge) : Retire l'article (impossible si déjà vendu).

![Capture d'écran - Formulaire Article](images/admin-article-form.png)
