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
