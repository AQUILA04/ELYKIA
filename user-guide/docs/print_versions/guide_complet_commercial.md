# Guide Utilisateur - Profil Commercial

_Ce document est une compilation de la documentation pour impression._

\newpage

# Guide Commercial

Bienvenue dans le guide utilisateur dédié au profil **Commercial**.
Votre rôle est central : vous faites le lien entre l'entreprise et les clients. Vos missions principales sont la prospection, la vente (Crédit/Tontine/Comptant) et la gestion de votre propre stock.

## Tableau de Bord (Dashboard)
À votre connexion, vous accédez à une vue d'ensemble de votre activité.

![Dashboard Commercial](../images/commercial_dashboard.png)

### Indicateurs Clés (KPI)
*   **Total Clients** : La taille de votre portefeuille.
*   **Total Accounts** : Nombre de comptes actifs gérés.
*   **Total Articles** : Aperçu du catalogue ou de votre stock.

### Menu de Navigation
*   **Clients / Comptes** : CRM et gestion financière clients.
*   **Stock (Commercial & Tontine)** : Gestion de votre "magasin mobile".
*   **Ventes / Commandes** : Enregistrement des contrats.
*   **Tontines** : Gestion des épargnes produits.

## Application Mobile
Pour les opérations sur le terrain (hors ligne), consultez le [Guide de l'Application Mobile](./mobile_app.md).


\newpage



---

# Gestion Clients & Comptes

Le cœur de votre métier est la gestion de votre portefeuille clients. Ce menu vous permet d'enregistrer de nouveaux prospects et de gérer leurs comptes.

## 1. Gestion des Clients (« Clients »)
L'écran affiche la liste alphabétique de vos clients et prospects.

### a. Liste des Clients
![Liste des clients](../images/commercial_client_list.png)

Chaque ligne présente :
*   **Nom/Prénom** du client.
*   **Téléphone**.
*   **Localité** (Quartier).
*   **Actions** : Modifier ou Voir Détails.

### b. Créer un Nouveau Client
![Formulaire nouveau client](../images/commercial_client_add.png)

Pour inscrire un client, cliquez sur le bouton **+ Nouveau** et remplissez les sections :

1.  **Profil** : Photo (Optionnel), Nom, Prénom.
2.  **Contact** : Adresse physique, Téléphone (8 chiffres).
3.  **Géolocalisation** :
    *   **Auto** : Cliquez sur "Obtenir la position GPS" (recommandé sur mobile).
    *   **Manuel** : Activez l'interrupteur pour saisir Latitude/Longitude si le GPS échoue.
4.  **Identité** : Type de pièce (Carte électeur, Passeport...), Numéro, et **Photo du document** (Obligatoire).
5.  **Détails** : Date de naissance (Min 16 ans), Occupation (Métier), Localité (Liste déroulante).
6.  **Référents** : Personne à contacter (Nom, Adresse, Tel).
7.  **Associations (Commerciaux)** :
    *   Sélectionnez-vous vous-même (ou le commercial responsable) pour les champs *Commercial Crédit*, *Commercial Tontine*, et *Agence*.
8.  **Type** : Choisissez "Client".
9.  **Compte Initial** :
    *   Le système crée automatiquement un compte. Saisissez le **Solde Initial** (Min 500 FCFA).

Cliquez sur **Enregistrer**.

## 2. Gestion des Comptes (« Comptes »)
Cet écran centralise la situation financière de tous vos clients. Il permet de voir qui peut acheter à crédit et qui doit régulariser sa situation.

### a. Liste des Comptes
![Liste des comptes](../images/commercial_account_list.png)
L'écran présente un tableau avec :
*   **Nom du Client** : Le titulaire.
*   **Numéro de Compte** : Identifiant unique.
*   **Solde** : Montant disponible ou dû.
*   **Statut** :
    *   *Créé/Actif* : Le compte est opérationnel.
    *   *Fermé/Bloqué* : Aucune opération possible.

**Fonctionnalités :**
*   **Recherche** : Filtrez par nom ou numéro de compte via la barre en haut.
*   **Créer** : Si un client n'a pas de compte, cliquez sur **Ajouter**.

### b. Créer/Associer un Compte
Si vous devez créer un compte manuellement :
1.  Cliquez sur **Ajouter**.
2.  **Client** : Recherchez le client dans la liste.
3.  **Numéro** : Attribuez un numéro de compte unique.
4.  **Solde Initial** : Définissez le montant de départ (Minimum 500 FCFA, Maximum 100 000 FCFA).
5.  **Enregistrer**.

### c. Actions sur les Comptes
Au bout de chaque ligne, des icônes vous permettent d'agir :
*   **(De)Activer** (Icône Power/Blocage) : Change le statut du compte (Active ou Désactive).
*   **Détails** (Œil) : Affiche la fiche complète.
*   **Modifier** (Crayon) : Permet de corriger le solde ou le numéro.
*   **Supprimer** (Corbeille) : Supprime définitivement le compte (Action irréversible).


\newpage



---

# Gestion de votre Stock

En tant que commercial, vous êtes responsable d'un stock "ambulant" ou personnel que vous distribuez aux clients. Ce module vous permet de gérer ce stock.

## 1. Mon Stock (Consultation)
Allez dans **Stock Commercial > Stock**.
![Dashboard mon stock](../images/commercial_my_stock.png)

Ce tableau de bord vous montre l'état de votre stock par mois.
En haut, trois cartes résument la situation financière :
*   **Valeur Stock Restant** : Ce que vous avez en main.
*   **Valeur Stock Vendu** : Ce que vous avez déjà écoulé.
*   **Valeur Total Dû** : Ce que vous devez reverser.

Le tableau détaille ensuite par article :
*   **Article** : Nom du produit.
*   **Pris (Magasin)** : Quantité totale récupérée chez le magasinier.
*   **Vendu (Clients)** : Quantité vendue.
*   **Retourné** : Quantité que vous avez ramenée au stock central.
*   **Restant** : Ce qu'il vous reste physiquement.
*   **Valeur Restante** : Valorisation de ce stock restant.

## 2. Se Réapprovisionner (Demandes)
Lorsque votre stock baisse, vous devez demander du matériel au magasin central.

1.  Allez dans **Stock Commercial > Demandes Sortie**.
2.  Cliquez sur **Nouvelle Demande**.
    ![Formulaire demande stock](../images/commercial_request_create.png)
3.  **Articles** : Sélectionnez les produits et les quantités souhaitées.
4.  **Envoyer** : La demande part chez le Gestionnaire pour validation.
    *   *Statut Créé* : En attente de validation manager.
    *   *Statut Validé* : Validé, en attente que le Magasinier vous livre.
    *   *Statut Livré* : Le magasinier a validé la sortie, votre stock personnel est augmenté.

## 3. Retourner du Matériel
Si vous avez des invendus ou des produits défectueux :
1.  Allez dans **Stock Commercial > Retours**.
2.  Créez un retour en sélectionnant les articles.
3.  Rapportez physiquement le matériel au magasinier.
4.  Le magasinier validera le retour, ce qui déduira ces articles de votre responsabilité.

## 4. Stock Tontine
Le menu **Stock Tontine** fonctionne exactement de la même manière, mais concerne uniquement les produits réservés aux contrats Tontine. Veillez à ne pas mélanger les deux stocks.


\newpage



---

# Ventes & Commandes

Ce module vous permet de réaliser les actes de vente et de passer des commandes pour vos clients.

## 1. Réaliser une Vente (« Ventes »)
Ce menu gère principalement les **Ventes à Crédit** (Contrats).

### a. Liste des Ventes
![Liste des ventes](../images/commercial_sales_list.png)
Vous y retrouvez l'historique de vos contrats :
*   **Référence** du contrat.
*   **Client** bénéficiaire.
*   **Montant Total**.
*   **Reste à Payer**.
*   **Statut** (En cours, Soldé, En retard).

### b. Nouvelle Vente (Contrat)
![Formulaire nouvelle vente](../images/commercial_sale_add.png)
1.  Cliquez sur **Ajouter**.
2.  **Type de Vente** : Sélectionnez "Crédit" ou "Comptant" (Par défaut Crédit).
3.  **Commercial** : Sélectionnez le commercial responsable (Obligatoire pour une vente à Crédit).
4.  **Client** : Recherchez le client par nom.
5.  **Articles** :
    *   Sélectionnez les produits dans la liste.
    *   Le prix affiché dépend du type de vente (Prix Crédit vs Prix Comptant).
    *   *Note : Le système vérifie que vous avez ces articles dans votre Stock Personnel.*
6.  **Avance** : Saisissez le montant versé immédiatement par le client (Optionnel).
7.  Cliquez sur **Valider**.
    *   Cela génère le contrat et édite l'échéancier de paiement.

## 2. Commandes (« Commandes »)
Utilisez ce menu pour enregistrer une intention d'achat ou une réservation.

### a. Tableau de Bord Commandes
![Dashboard commandes](../images/commercial_orders_dashboard.png)
L'interface vous présente :
*   **KPIs** : Indicateurs de performance en haut de page.
*   **Onglets Statuts** : Naviguez entre "En attente", "Validé", "Annulé" pour filtrer vos commandes.
*   **Actions** : Boutonne **+ Créer une Commande** et accès aux rapports.

### b. Créer une Commande
![Formulaire commande](../images/commercial_order_create.png)
1.  Cliquez sur **Créer une Commande**.
2.  **Client** :
    *   Recherchez votre client par nom ou code.
    *   Si sélectionné, il apparaît sous forme de "puce" (Chip).
3.  **Articles** :
    *   Recherchez un article (Nom/Code).
    *   Saisissez la **Quantité**.
    *   Cliquez sur **Ajouter un article**. Répétez pour chaque produit.
5.  Cliquez sur **Valider**.
    *   Un message de succès **"Commande créée avec succès"** apparaît.
    *   Vous êtes automatiquement redirigé vers la liste des commandes où votre nouvelle commande s'affiche avec le statut *Créé*.

### c. Traitement (Transformer en Vente)
Une fois la commande créée, vous pouvez la visualiser en détail.
1.  Cliquez sur une commande pour voir les **Détails** (Infos, Articles, Historique).
2.  **Transformer en Vente** :
    *   Utilisez le menu d'actions pour convertir la commande en contrat de vente effectif.
    *   Un message de confirmation vous avertira que cette action est définitive et génère un crédit.


\newpage



---

# Gestion des Tontines

Le module Tontine permet de gérer les programmes d'épargne produits pour vos clients. Il offre une vue complète sur les cotisations et les livraisons.

## 1. Tableau de Bord Tontine
![Dashboard tontine](../images/commercial_tontine_list.png)

### a. En-tête et Sessions
*   **Sélecteur de Session** : Permet de basculer entre la session en cours et les sessions passées (Historique).
*   **Comparer les Sessions** : Outil pour analyser la performance par rapport aux cycles précédents.
*   **Paramètres de Session** : Configuration du cycle actuel.

### b. Indicateurs Clés (KPIs)
Des cartes en haut de page résument la santé de la tontine :
*   **Membres Actifs** : Nombre de souscripteurs.
*   **Montant Total Collecté** : Somme des cotisations perçues.
*   **Revenu Total** : Part revenant à la société.
*   **En Attente de Livraison** : Nombre de membres ayant terminé leur cycle et attendant leur lot.

### c. Actions Principales
Trois boutons d'action sont disponibles en haut à droite :
1.  **Ajouter un Membre** : Inscription individuelle classique.
2.  **Ajout Multiple** : Inscription en masse (utile pour initialiser un groupe).
3.  **Comparer** : Accès aux statistiques comparatives.

## 2. Gestion des Membres

### a. Liste et Filtres
Le tableau central liste tous les souscripteurs. Vous pouvez filtrer cette liste via la barre d'outils :
*   **Recherche** : Par nom de client.
*   **Statut de Livraison** : Filtrer pour voir uniquement les "Validés" ou "En attente".
*   **Commercial** : Filtrer par agent responsable.

### b. Créer une Souscription (Ajout Membre)
![Formulaire ajout membre tontine](../images/commercial_tontine_add.png)
1.  Cliquez sur **Ajouter un Membre**.
2.  **Client** : Sélectionnez le souscripteur.
3.  **Fréquence** : Journalier, Hebdomadaire, etc.
4.  **Montant de la mise** : Somme à verser périodiquement.
5.  **Nombre de Mises** : Durée du cycle (ex: 30 mises).
6.  Cliquez sur **Enregistrer**.

### c. Ajout Multiple (Bulk)
![Ajout multiple membres](../images/commercial_tontine_bulk_add.png)
Pour aller plus vite :
1.  Cliquez sur **Ajout Multiple**.
2.  Définissez des paramètres globaux (Mise par défaut, Fréquence).
3.  Sélectionnez une liste de clients à inscrire en une seule fois.
4.  Ajustez si nécessaire pour chaque ligne avant de valider.

4.  Ajustez si nécessaire pour chaque ligne avant de valider.

### d. Suivi Détaillé (Fiche Membre)
En cliquant sur un membre dans la liste, vous accédez à sa fiche détaillée. Elle est divisée en plusieurs zones :

1.  **Résumé Financier** (Carte du haut) :
    *   *Total Contribué* : Ce que le client a versé à ce jour.
    *   *Solde Disponible* : Le montant utilisable pour la livraison.
    *   *Part Société* : La retenue pour frais de gestion.
    *   *Statut* : Indique si le cycle est en cours ou terminé.
2.  **Progression** :
    *   Une grille visuelle montre les mois validés (Vert) et le mois en cours (Barre de progression).
    *   Cela permet de voir instantanément si le membre est à jour de ses cotisations.
3.  **Historique des Collectes** :
    *   Liste de tous les versements effectués avec la date et le nom du percepteur.
4.  **Actions Rapides** (Haut de page) :
    *   **Enregistrer une Collecte** : Pour ajouter manuellement un paiement hors tournée.

## 3. Livraison Tontine (Fin de Cycle)
Lorsque la session est clôturée et que le membre est éligible (statut *En attente*) :

![Détails membre tontine](../images/commercial_tontine_member_details.png)

1.  Allez sur la fiche du membre (**Détails**).
2.  Cliquez sur le bouton **Préparer la Livraison**.
    *   *Note : Ce bouton n'apparaît que si la session est terminée.*
3.  Une fenêtre s'ouvre : sélectionnez les **Articles** correspondant au montant cotisé.
4.  Validez.
5.  La demande passe en statut *En attente de validation*. Le gestionnaire validera la demande, puis le magasinier effectuera la sortie de stock.


\newpage



---

# Guide de l'Application Mobile (Commercial)

Ce guide détaille l'utilisation de l'application mobile destinée aux commerciaux. Le serveur étant hébergé localement (intranet), l'application est conçue pour fonctionner de manière autonome sur le terrain.

*   **Mode Connecté (au bureau)** : Lorsque vous êtes connecté au même réseau Wi-Fi que le serveur, vous pouvez synchroniser vos données.
*   **Mode Terrain (Hors ligne)** : En dehors du bureau, vous travaillez avec les données stockées dans le téléphone.

## 1. Connexion et Initialisation

### 1.1 Connexion
Au lancement, assurez-vous d'être connecté au **réseau local de l'entreprise** pour la première connexion.
![Écran de connexion](../images/mobile/login.png)

### 1.2 Chargement Initial
Une fois connecté au réseau local, l'application lance une **synchronisation complète** pour récupérer toutes les données (Clients, Stock, etc.).

> [!IMPORTANT]
> Ne fermez pas l'application pendant cette étape. Laissez le chargement aller jusqu'à 100%.

Les étapes de chargement s'affichent à l'écran :
1.  Récupération des articles
2.  Récupération des commerciaux et localités
3.  Récupération des clients et comptes
4.  Finalisation du stock

![Chargement Initial](../images/mobile/initial_loading.png)

## 2. Tableau de Bord (Dashboard)

Dès votre connexion, vous accédez directement au **Tableau de Bord**. C'est le centre de contrôle de votre activité.

### 2.1 En-tête et Statut
En haut de l'écran, vous trouverez :
*   **Informations Utilisateur** : Votre nom et votre statut de connexion (**En ligne** ou **Hors ligne**).
*   **Bouton de Synchronisation** : C'est l'icône <ion-icon name="sync-outline"></ion-icon> qui permet de lancer manuellement la synchronisation (voir section 6).

### 2.2 Indicateurs de Performance (KPIs)
Le tableau de bord présente vos chiffres clés, filtrables par période (**Jour**, **Semaine**, **Mois**, **Année**) :

*   **Ventes** : Montant total des distributions effectuées.
*   **Recouvrements** : Montant total des paiements perçus.
*   **Sorties Stock** : Valeur totale du stock sorti du magasin pour la vente.
*   **Restant à Recouvrer** : Somme qu'il vous reste à percevoir sur les crédits en cours.
*   **Non distribué** : Valeur du stock que vous avez en votre possession mais pas encore vendu.
*   **Tontine** : Montant total collecté pour la tontine.

### 2.3 Actions Rapides
Un accès direct aux fonctionnalités les plus utilisées :
*   **Nouvelle Distribution** : Créer une vente à crédit.
*   **Recouvrement** : Enregistrer un paiement client.
*   **Nouveau Client** : Créer une fiche client.
*   **Rapport** : Générer un rapport d'activité.
*   **Tontine** : Accéder au module de gestion de la tontine.

![Tableau de Bord](../images/mobile/dashboard_overview.png)

## 3. Gestion des Clients
L'onglet **Clients** (dans la barre de navigation du bas) vous permet de gérer votre portefeuille.

### 3.1 Liste des Clients
La liste affiche tous vos clients.
*   **Filtres rapides** : Tous, Crédit en cours, Nouveau, Par Quartier.
*   **Recherche** : Par nom ou numéro de téléphone.

### 3.2 Ajouter un Client
1.  Dans l'onglet **Clients**, appuyez sur le bouton **"+"** ou "Ajouter".
2.  Remplissez le formulaire (Nom, Prénom, Téléphone, Photo, Localité).
3.  Validez. Le client est sauvegardé localement en attendant la synchronisation.

## 4. Gestion des Distributions (Vente à Crédit)

L'onglet **Distributions** ou l'action rapide **Nouvelle Distribution** lance le processus de vente.

### 4.1 Nouvelle Distribution
Le processus se déroule en étapes fluides sur une seule page :

1.  **Client Sélectionné** :
    *   Si aucun client n'est sélectionné, cliquez sur **"Sélectionner un Client"**.
    *   Recherchez et choisissez le client dans la liste.

2.  **Articles Disponibles** :
    *   Parcourez la liste ou utilisez la barre de recherche (nom ou référence).
    *   Utilisez les boutons **"+"** et **"-"** pour ajuster la quantité de chaque article.
    *   Le stock disponible est affiché pour chaque article.

3.  **Résumé de la Distribution** :
    *   Le système calcule automatiquement le **Total à payer**.
    *   **Avance** : Saisissez le montant de l'avance versée par le client.
    *   **Mise journalière** : Le système calcule automatiquement la mise journalière suggérée.
    *   **Période** : Le nombre de jours pour solder le crédit est affiché.

4.  **Validation et Reçu** :
    *   Cliquez sur le bouton **"CONFIRMER LA DISTRIBUTION"** en bas de page.
    *   Une fenêtre de confirmation récapitule les montants.
    *   Après validation, un **Reçu de Distribution** est généré automatiquement. Vous pouvez l'imprimer pour le client via l'imprimante Bluetooth.

![Nouvelle Distribution](../images/mobile/distribution_new.png)


## 5. Gestion des Recouvrements

L'action rapide **Recouvrement** permet d'enregistrer les paiements des clients sur leurs crédits en cours.

1.  **Sélection du Client** :
    *   Cliquez sur "Sélectionner un Client" si aucun n'est actif.
    *   Utilisez la recherche pour valider le client payeur.

2.  **Choix du Crédit** :
    *   La liste des "Crédits Actifs" du client s'affiche.
    *   **Sélection obligatoire** : Vous devez toucher la carte du crédit concerné par le paiement pour le sélectionner.

3.  **Saisie du Montant** :
    *   Entrez le "Montant à Collecter".

4.  **Confirmation** :
    *   Validez en appuyant sur **"CONFIRMER LE RECOUVREMENT"**.
    *   Un message de confirmation s'affiche en haut de l'écran.
    *   Une fenêtre récapitulative **Reçu de Recouvrement** apparaît automatiquement, vous permettant d'imprimer le ticket pour le client.

![Nouveau Recouvrement](../images/mobile/recovery_new.png)

## 6. Gestion de la Tontine

Accédez à ce module via l'action rapide **Tontine** sur le Dashboard.

### 6.1 Tableau de bord Tontine
Cet écran affiche l'état de santé de votre tontine :
*   **Statistiques** : Membres Actifs, Total Collecté, Session en cours (Année), En attente livraison.
*   **Filtres** : Tous, Actifs, En attente, Livrés.
*   **Liste des membres** : Affiche pour chaque membre son nom, téléphone et montant total cotisé.

**Inscrire un membre** :
Si la session est active, un bouton flottant **"+"** est visible en bas de l'écran. Cliquez dessus pour inscrire un nouveau membre tontine.

![Tableau de bord Tontine](../images/mobile/tontine_dashboard.png)

### 6.2 Fiche Membre et Actions
Cliquez sur un membre dans la liste pour voir sa fiche détaillée :
*   **Infos Tontine** : Montant par échéance, Total cotisé, Contribution attendue.
*   **Historique** : Liste de toutes les cotisations versées.

**Actions (Cotisation / Livraison)** :
Pour effectuer une action, cliquez sur le bouton **Menu** (les trois points verticaux ⋮) en haut à droite de l'écran :

1.  **Enregistrer une cotisation** :
    *   Sélectionnez cette option pour saisir un nouveau versement.
    *   Entrez le montant et validez.
    *   **Succès et Impression** : Un **Reçu de Cotisation** est généré permettant l'impression du ticket pour le membre.

2.  **Livraison Fin d'Année** :
    *   Sélectionnez cette option lorsque le membre souhaite récupérer sa mise en produits.
    *   Sélectionnez les articles correspondant au budget épargné.
    *   **Validation** : Après confirmation du panier, la livraison est enregistrée et un **Bon de Livraison** est généré pour impression.

3.  **Voir le client** :
    *   Permet d'accéder à la fiche client globale.

![Détails Membre Tontine](../images/mobile/tontine_member_details.png)

## 7. Rapport Journalier

L'accès au **Rapport Journalier** se fait via le bouton **"Rapport"** dans la section "Actions Rapides" du Dashboard ou via le menu latéral.
Ce rapport synthétise votre activité de la journée (basé sur la date du système).

### 7.1 Résumé de l'Activité
La page affiche plusieurs cartes récapitulatives :
*   **Montant Distribué** : Nombre et montant total des ventes du jour.
*   **Montant Collecté** : Nombre et montant total des recouvrements du jour.
*   **Solde Initial** : Montant des soldes d'ouverture des nouveaux clients créés ce jour.
*   **Avances Encaissées** : Montant total des avances perçues sur les distributions.
*   **Tontine** : Montant total collecté pour la tontine.

**Total à Verser** :
En bas des cartes, le **"Montant total à verser"** indique la somme exacte que vous devez remettre à la caisse (Montant Collecté + Avances Encaissées + Tontine).

![Rapport Journalier](../images/mobile/daily_report.png)

### 7.2 Détails par catégorie
Trois onglets permettent de consulter le détail des opérations :
1.  **Distributions** : Heure, nom du client, détails de la vente (articles).
2.  **Recouvrements** : Heure, nom du client, montant perçu.
3.  **Clients** : Liste des nouveaux clients enregistrés avec leurs soldes initiaux.

### 7.3 Impression
Un bouton **"IMPRIMER LE RAPPORT"** (en bas de page) ou l'icône d'imprimante (en haut à droite) permet de générer un ticket récapitulatif via une imprimante Bluetooth connectée. Le bouton est désactivé si aucune opération n'a été effectuée.

## 8. Synchronisation

La synchronisation est cruciale pour envoyer vos données au serveur et récupérer les mises à jour.

### 8.1 Lancer une synchronisation
1.  Assurez-vous d'être connecté au **Wi-Fi du bureau**.
2.  Depuis le **Tableau de Bord**, cliquez sur l'icône de synchronisation <ion-icon name="sync-outline"></ion-icon> dans l'en-tête.
3.  Vous serez redirigé vers l'écran de synchronisation automatique.

### 8.2 État
*   Si des erreurs surviennent (ex: conflit de données), un badge de notification apparaîtra sur l'icône de synchronisation.
*   Consultez l'écran de synchronisation pour voir les détails des erreurs et les corriger.

![Synchronisation](../images/mobile/sync_screen.png)


\newpage



---

