# Guide Utilisateur - Profil Storekeeper

_Ce document est une compilation de la documentation pour impression._

\newpage

# Guide Magasinier

Bienvenue dans le guide utilisateur dédié au profil **Magasinier**.
Votre rôle est d'assurer la fiabilité du stock physique, de gérer les réceptions de marchandises et de servir les commerciaux.

## Dashboard (Tableau de Bord)
Dès votre connexion, le tableau de bord vous présente une vue synthétique de l'activité.

### 1. Indicateurs Clés
Les cartes en haut de page vous informent sur la base de données actuelle :
*   **Total Articles** : Nombre de références produits gérées.
*   (Autres indicateurs : Clients, Comptes, Localités).

### 2. Alertes Stock (Critique)
En tant que magasinier, cette section est votre priorité quotidienne. Elle affiche les produits nécessitant un réapprovisionnement immédiat.

*   **Liste des articles en rupture de stock** :
    *   Produits dont la quantité est strictement à **0**.
    *   *Action* : Priorité absolue pour approvisionnement.
*   **Article en rupture imminente** :
    *   Produits dont le stock a atteint le seuil d'alerte (Point de commande).
    *   Le code couleur vous aide à prioriser (Rouge = Critique, Orange = Faible).

![Dashboard Magasinier](../images/storekeeper_dashboard.png)


\newpage



---

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


\newpage



---

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


\newpage



---

# Gestion Stock Tontine

Le module **Stock Tontine** fonctionne exactement sur le même principe que le Stock Commercial, mais il concerne spécifiquement les produits destinés aux contrats de Tontine.

## Fonctionnalités

### 1. Demandes Sortie
![Demandes sortie Tontine](../images/storekeeper_tontine_requests.png)

*   Permet de livrer les articles Tontine aux commerciaux pour qu'ils les distribuent aux clients finaux.
*   **Visibilité** : Le magasinier ne voit et ne traite que les demandes **Validé** par un gestionnaire. Les demandes non validées sont invisibles.
*   Action : Cliquez sur l'icône **Livrer** (Camion) pour déstocker.

### 2. Retours
*   Permet de réintégrer au magasin central des articles Tontine non distribués ou retournés par un commercial.
*   Nécessite une création de retour puis une validation pour mise à jour du stock.


\newpage



---

# Gestion Stock Commercial

Ce menu permet de gérer les flux de marchandises entre le magasin central et les commerciaux (Agents).

## 1. Demandes Sortie (Livraisons)
![Liste des demandes de sortie](../images/storekeeper_stock_requests.png)

C'est ici que vous traitez les demandes de matériel validées par l'administration.

### Processus de Livraison
> [!IMPORTANT]
> **Règle de Visibilité** : En tant que magasinier, vous ne voyez apparaître dans votre liste **QUE** les demandes ayant déjà été validées par un Gestionnaire. Une demande en attente (`Créé`) est un brouillon invisible pour vous.

1.  Allez dans **Stock Commercial > Demandes Sortie**.
2.  Vous ne verrez que les demandes avec le statut <span style="background-color:#d4edda; color:#155724; padding:2px 5px; border-radius:3px;">Validé</span>.
    *   Cela confirme que le manager a donné son feu vert.
3.  Cliquez sur le bouton **Livrer** (Icône camion bleu foncé <i class="material-icons" style="font-size:1em; vertical-align:middle;">local_shipping</i>).
4.  La marchandise est déduite de votre stock principal et transférée sur le stock du commercial.

### Créer une demande (Cas exceptionnel)
![Formulaire création demande](../images/storekeeper_request_create.png)

Si nécessaire, vous pouvez initier une demande pour un commercial :
1.  Cliquez sur **Nouvelle Demande**.
2.  **Commercial** : Sélectionnez le bénéficiaire.
3.  **Articles** : Ajoutez les produits et quantités.
4.  Cliquez sur **Envoyer**. La demande devra ensuite être validée par un manager.

## 2. Retours Stock
![Liste des retours](../images/storekeeper_stock_returns.png)

Gère le matériel rapporté par les commerciaux au magasin (Ex: invendus, produits défectueux).

### Enregistrer un Retour
1.  Allez dans **Stock Commercial > Retours**.
2.  Cliquez sur **Nouveau Retour**.
3.  Remplissez le formulaire :
    *   **Commercial** : Sélectionnez l'agent qui rapporte le matériel.
    *   **Articles à retourner** : Sélectionnez les produits. Le système vérifie que l'agent possède bien ces articles en stock.
4.  Validez le retour.

### Réceptionner (Validation)
Une fois le retour créé (Statut *Créé*), vous devez confirmer la réception physique :
1.  Dans la liste, cliquez sur le bouton de validation (Coche verte <i class="material-icons" style="font-size:1em; vertical-align:middle;">check_circle</i>).
2.  Les articles réintègrent votre stock principal.


\newpage



---

