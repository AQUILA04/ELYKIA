# Spécifications Techniques et Fonctionnelles de l'Application Mobile Commerciale

## 1. Introduction

Ce document détaille les spécifications techniques et fonctionnelles pour le développement d'une application mobile destinée aux commerciaux. Cette application vise à optimiser la gestion des stocks, la vente à crédit et le recouvrement journalier sur le terrain, en complément du système de gestion existant. L'objectif principal est de fournir aux commerciaux un outil intuitif et performant, capable de fonctionner en ligne et hors ligne, afin d'améliorer leur productivité et l'efficacité des opérations sur le terrain.

## 2. Contexte et Objectifs

L'application mobile s'inscrit dans un écosystème existant, comprenant un backend robuste et une interface frontend web. Elle est conçue pour étendre les capacités du système aux opérations mobiles, en se concentrant sur les besoins spécifiques des commerciaux.

### 2.1. Objectifs Généraux

*   **Amélioration de la productivité des commerciaux :** Automatisation des tâches répétitives et accès rapide aux informations clés.
*   **Optimisation des opérations sur le terrain :** Facilitation de la distribution, du recouvrement et de l'enregistrement de nouveaux clients.
*   **Support du mode offline :** Assurer la continuité des opérations même en l'absence de connectivité réseau.
*   **Synchronisation des données :** Maintenir la cohérence des données entre l'application mobile et le système backend.
*   **Reporting et Suivi :** Fournir des outils de suivi des performances pour les commerciaux.

### 2.2. Périmètre Fonctionnel

L'application mobile couvrira les fonctionnalités principales suivantes :

*   **Authentification :** Connexion sécurisée avec support offline.
*   **Initialisation des données :** Synchronisation initiale des articles, clients, comptes et sorties d'articles.
*   **Gestion des distributions :** Enregistrement des ventes à crédit et impression de reçus.
*   **Gestion des recouvrements :** Enregistrement des paiements journaliers.
*   **Gestion des clients :** Enregistrement de nouveaux clients avec géolocalisation et photo.
*   **Synchronisation :** Envoi des données collectées sur le terrain vers le serveur.
*   **Reporting :** Génération de rapports journaliers d'activités.
*   **Tableau de bord :** Vue d'ensemble des performances du commercial.

## 3. Architecture Technique Proposée

L'application mobile sera développée en utilisant une architecture robuste et moderne, garantissant performance, sécurité et maintenabilité. Compte tenu des besoins exprimés, notamment le fonctionnement offline et la synchronisation, une approche basée sur une base de données locale et une gestion des états efficace sera privilégiée.

### 3.1. Technologies Clés

*   **Framework de développement mobile :** Ionic/Angular (conformément à l'écosystème frontend existant et pour sa capacité à cibler plusieurs plateformes).
*   **Base de données locale :** SQLite ou IndexedDB (pour la persistance des données en mode offline).
*   **API Backend :** Utilisation des endpoints existants décrits dans le fichier `backend-openapi-docs.json`.
*   **Mécanisme de synchronisation :** Implémentation d'une logique de synchronisation bidirectionnelle (pull/push) avec gestion des conflits.

### 3.2. Composants Architecturaux

*   **Couche de Présentation (UI) :** Développée avec Angular, responsable de l'interface utilisateur et de l'interaction avec l'utilisateur.
*   **Couche de Logique Métier :** Contient les services et les règles métier, gérant les interactions entre l'UI et la couche de données.
*   **Couche de Données :** Gère l'accès aux données locales (SQLite/IndexedDB) et aux données distantes via les APIs backend.
*   **Module de Synchronisation :** Responsable de la gestion des données en mode offline et de leur synchronisation avec le serveur lorsque la connectivité est rétablie.
*   **Module d'Authentification :** Gère la connexion, la persistance des informations d'authentification et la logique de connexion offline.

## 4. Spécifications Fonctionnelles Détaillées

### 4.1. Authentification et Gestion des Sessions

#### 4.1.1. Connexion Utilisateur

*   **Description :** L'utilisateur saisit son nom d'utilisateur et son mot de passe sur un écran dédié.
*   **Règles Métier :**
    *   Si une connexion internet est disponible, l'application tente de s'authentifier auprès du backend via l'API `{{baseUrl}}/api/auth/signin` (POST).
    *   En cas de succès (HTTP 200), les informations de l'utilisateur (username, mot de passe crypté, email, rôles, tokens) sont stockées localement.
    *   En cas d'échec de la connexion au serveur (pas de réseau ou erreur), l'application tente une authentification locale.
    *   Si l'utilisateur n'est pas configuré localement, un message 


d'erreur "Utilisateur non configuré pour cet appareil !" est affiché.
    *   Si l'utilisateur existe localement mais que le mot de passe est incorrect, le message "Nom d'utilisateur ou mot de passe incorrect" est affiché.
    *   Après une authentification réussie (locale ou via le serveur), l'utilisateur est redirigé vers le tableau de bord. Un spinner ou une barre de progression avec un fond flou ou un effet de verre sera affiché pendant le chargement des données initiales.
*   **Tests d'Acceptation :**
    *   **TA-AUTH-001 :** L'utilisateur saisit des identifiants valides en ligne, l'application se connecte au backend, stocke les informations localement et redirige vers le tableau de bord.
    *   **TA-AUTH-002 :** L'utilisateur saisit des identifiants invalides en ligne, l'application affiche un message d'erreur approprié du backend.
    *   **TA-AUTH-003 :** L'utilisateur tente de se connecter hors ligne avec des identifiants précédemment synchronisés, l'application authentifie localement et redirige vers le tableau de bord.
    *   **TA-AUTH-004 :** L'utilisateur tente de se connecter hors ligne sans identifiants synchronisés, l'application affiche "Utilisateur non configuré pour cet appareil !"
    *   **TA-AUTH-005 :** L'utilisateur tente de se connecter hors ligne avec des identifiants synchronisés mais un mot de passe incorrect, l'application affiche "Nom d'utilisateur ou mot de passe incorrect".

#### 4.1.2. Diagramme d'État de l'Authentification

```plantuml
@startuml
state 


Authentification {
  [*] --> Déconnecté
  Déconnecté --> SaisieIdentifiants : Ouvrir Application
  SaisieIdentifiants --> AuthentificationEnCours : Cliquer 'Connecter'
  AuthentificationEnCours --> AuthentificationBackend : Connexion Internet Disponible
  AuthentificationEnCours --> AuthentificationLocale : Connexion Internet Indisponible

  AuthentificationBackend --> AuthentificationReussie : Réponse 200 (Succès)
  AuthentificationBackend --> ErreurBackend : Réponse Erreur (4xx, 5xx)

  AuthentificationLocale --> AuthentificationReussie : Identifiants Locaux Valides
  AuthentificationLocale --> ErreurUtilisateurNonConfigure : Identifiants Locaux Inexistants
  AuthentificationLocale --> ErreurMotDePasseIncorrect : Identifiants Locaux Invalides

  AuthentificationReussie --> ChargementInitialDonnees : Redirection vers Tableau de Bord
  ChargementInitialDonnees --> Connecte : Données Initiales Chargées

  ErreurBackend --> SaisieIdentifiants : Afficher Message Erreur Backend
  ErreurUtilisateurNonConfigure --> SaisieIdentifiants : Afficher Message Erreur Local
  ErreurMotDePasseIncorrect --> SaisieIdentifiants : Afficher Message Erreur Local

  Connecte --> [*]
}
@enduml
```

### 4.2. Initialisation des Données (Première Connexion Online)

Après une authentification réussie en ligne, l'application doit initialiser sa base de données locale en récupérant les informations essentielles du backend. Ce processus doit être visible par l'utilisateur via un indicateur de progression.

#### 4.2.1. Récupération des Articles

*   **Description :** L'application appelle l'API pour récupérer tous les articles disponibles et les stocke localement.
*   **Endpoint :** `GET {{baseUrl}}/api/v1/articles/all`
*   **Règles Métier :**
    *   Seuls les champs `id`, `creditSalePrice`, `name`, `marque`, `model`, `type`, `stockQuantity`, et `commercialName` doivent être stockés localement. Les champs `purchasePrice` et `sellingPrice` ne sont pas nécessaires pour l'application mobile.
    *   En cas d'erreur de l'API, un message d'erreur générique sera affiché et le processus d'initialisation pourra être relancé ou l'utilisateur sera informé d'une fonctionnalité limitée.
*   **Tests d'Acceptation :**
    *   **TA-INIT-001 :** L'application récupère et stocke correctement la liste des articles, en ignorant les champs non pertinents.
    *   **TA-INIT-002 :** En cas d'échec de l'API articles, l'application gère l'erreur et informe l'utilisateur.

#### 4.2.2. Récupération des Localités

*   **Description :** L'application récupère la liste de toutes les localités et les stocke localement.
*   **Endpoint :** `GET {{baseUrl}}/api/v1/localities/all`
*   **Règles Métier :**
    *   La liste des localités se trouve directement dans le champ `data` de la réponse.
*   **Tests d'Acceptation :**
    *   **TA-INIT-003 :** L'application récupère et stocke correctement la liste des localités.

#### 4.2.3. Récupération des Commerciaux

*   **Description :** L'application récupère la liste de tous les commerciaux et stocke localement uniquement les informations du commercial connecté.
*   **Endpoint :** `GET {{baseUrl}}/api/v1/promoters/all`
*   **Règles Métier :**
    *   Seul l'élément de la liste dont le `username` correspond à celui de l'utilisateur connecté doit être enregistré localement.
*   **Tests d'Acceptation :**
    *   **TA-INIT-004 :** L'application récupère et stocke correctement les informations du commercial connecté.

#### 4.2.4. Récupération des Clients du Commercial

*   **Description :** L'application récupère la liste des clients associés au commercial connecté et les stocke localement.
*   **Endpoint :** `GET {{baseUrl}}/api/v1/clients/by-commercial/{commercial-username}?page=0&size=2000&sort=id,desc`
*   **Règles Métier :**
    *   Les données sont récupérées depuis `data.content`.
    *   Pour chaque client, les attributs `latitude`, `longitude`, `mll` (map location link) et `profilPhoto` doivent être ajoutés à la base de données locale. Ces valeurs peuvent être nulles pour les données initiales du serveur, mais seront obligatoires pour les nouveaux clients enregistrés localement.
    *   L'intégration avec OpenStreetMap (ou une alternative) sera envisagée pour la géolocalisation et la génération de liens de carte.
    *   La possibilité de prendre une photo de profil du client sera intégrée lors de l'enregistrement local.
*   **Tests d'Acceptation :**
    *   **TA-INIT-005 :** L'application récupère et stocke correctement la liste des clients, en ajoutant les champs de géolocalisation et photo.

#### 4.2.5. Récupération des Comptes Clients

*   **Description :** L'application récupère les comptes des clients du commercial connecté et les stocke localement.
*   **Endpoint :** `GET {{baseUrl}}/api/v1/accounts?page=0&size=2000&sort=id,desc&username=<commercial-username>`
*   **Règles Métier :**
    *   Les données sont récupérées depuis `data.content`.
    *   Seul l'ID du client (`client.id`) doit être stocké pour référencer le client déjà enregistré localement, évitant la duplication des informations complètes du client.
*   **Tests d'Acceptation :**
    *   **TA-INIT-006 :** L'application récupère et stocke correctement les comptes clients, en référençant les clients existants.

#### 4.2.6. Récupération des Sorties d'Articles (Crédits en Cours)

*   **Description :** L'application récupère les enregistrements de sorties d'articles du magasin pour le commercial, représentant les crédits en cours qu'il peut distribuer.
*   **Endpoint :** `GET {{baseUrl}}/api/v1/credits/sorties-history/by-commercial/{{commercial-username}}?page=0&size=1000&sort=id,desc`
*   **Règles Métier :**
    *   Les données sont récupérées depuis `data.content`.
    *   Seuls les éléments avec un `status` égal à "INPROGRESS" et `updatable` à "true" doivent être enregistrés localement.
    *   Seules les références des entités liées (`client.id`, `articles.id`) doivent être stockées pour éviter la duplication.
*   **Tests d'Acceptation :**
    *   **TA-INIT-007 :** L'application récupère et stocke correctement les sorties d'articles en cours, en filtrant par statut et `updatable`.

#### 4.2.7. Récupération des Distributions Existantes (Ventes à Crédit)

*   **Description :** L'application récupère l'historique des distributions (ventes à crédit) effectuées par le commercial.
*   **Endpoint :** `GET {{baseUrl}}/api/v1/credits/by-commercial/{{commercial-username}}?page=0&size=10000&sort=id,desc`
*   **Règles Métier :**
    *   Les données sont récupérées depuis `data.content`.
    *   Les informations pertinentes pour le suivi des crédits et des recouvrements doivent être stockées localement.
*   **Tests d'Acceptation :**
    *   **TA-INIT-008 :** L'application récupère et stocke correctement l'historique des distributions.

## 5. Spécifications Fonctionnelles Détaillées (Suite)

### 5.1. Gestion des Distributions d'Articles

#### 5.1.1. Enregistrement d'une Distribution

*   **Description :** Le commercial enregistre une distribution d'articles à un client sur le terrain.
*   **Règles Métier :**
    *   L'application doit permettre de sélectionner un client existant ou d'en créer un nouveau (voir section 5.3).
    *   Le commercial sélectionne les articles et les quantités distribuées à partir de son stock de sorties d'articles.
    *   Le système calcule automatiquement le montant total de la distribution et la mise journalière à collecter pour cette vente (basé sur le `creditSalePrice` des articles).
    *   La distribution est enregistrée localement et marquée pour synchronisation.
*   **Tests d'Acceptation :**
    *   **TA-DIST-001 :** Le commercial peut enregistrer une distribution avec succès, et les calculs sont corrects.
    *   **TA-DIST-002 :** Le stock local du commercial est mis à jour après une distribution.

#### 5.1.2. Impression de Reçu

*   **Description :** Après une distribution, le commercial peut imprimer un reçu pour le client.
*   **Contenu du Reçu :**
    *   Liste des articles distribués (nom, quantité, prix unitaire).
    *   Montant total de la distribution.
    *   Mise journalière à collecter pour cette vente.
    *   Informations sur le client et le commercial.
    *   Date et heure de la transaction.
*   **Règles Métier :**
    *   L'application doit s'interfacer avec une imprimante mobile compatible (Bluetooth).
    *   Le reçu doit être clair, lisible et contenir toutes les informations nécessaires.
*   **Tests d'Acceptation :**
    *   **TA-PRINT-001 :** L'application génère et envoie un reçu correct à l'imprimante mobile.

### 5.2. Gestion des Recouvrements Journaliers

#### 5.2.1. Enregistrement d'un Recouvrement

*   **Description :** Le commercial enregistre le recouvrement (collecte) d'une mise journalière auprès d'un client.
*   **Règles Métier :**
    *   Le commercial sélectionne le client et le crédit concerné.
    *   Le système affiche la mise journalière attendue et le solde restant du crédit.
    *   Le commercial saisit le montant collecté.
    *   Le recouvrement est enregistré localement et marqué pour synchronisation.
    *   Le solde du compte client local est mis à jour.
*   **Tests d'Acceptation :**
    *   **TA-RECOUV-001 :** Le commercial peut enregistrer un recouvrement avec succès, et le solde du crédit est mis à jour localement.

### 5.3. Enregistrement de Nouveaux Clients

#### 5.3.1. Création d'un Nouveau Client

*   **Description :** Le commercial peut enregistrer un nouveau client directement sur le terrain.
*   **Informations Requises :**
    *   Nom, Prénom, Adresse, Téléphone, Pièce d'identité (type et numéro), Date de naissance.
    *   Personne à contacter en cas d'urgence (Nom, Téléphone, Adresse).
    *   Profession, Type de client.
    *   **Géolocalisation :** Latitude, Longitude, Lien Google Maps (généré via OpenStreetMap ou service similaire).
    *   **Photo de Profil :** Possibilité de prendre une photo du client via l'appareil photo du mobile.
*   **Règles Métier :**
    *   La géolocalisation et la photo de profil sont obligatoires pour les nouveaux clients enregistrés localement.
    *   Les données du nouveau client sont enregistrées localement et marquées pour synchronisation.
*   **Tests d'Acceptation :**
    *   **TA-NEWCLIENT-001 :** Le commercial peut enregistrer un nouveau client avec toutes les informations requises, y compris la géolocalisation et la photo.

### 5.4. Synchronisation des Données

#### 5.4.1. Synchronisation au Retour à l'Agence

*   **Description :** Lorsque le commercial retourne à l'agence et dispose d'une connexion internet, l'application synchronise toutes les données collectées (distributions, recouvrements, nouveaux clients) avec le serveur backend.
*   **Règles Métier :**
    *   La synchronisation doit être bidirectionnelle : envoi des données locales vers le serveur et récupération des mises à jour du serveur.
    *   Gestion des conflits : En cas de modifications concurrentes, une stratégie de résolution des conflits (ex: 


dernière modification gagne) doit être définie.
    *   Un indicateur de progression clair doit être affiché pendant la synchronisation.
*   **Tests d'Acceptation :**
    *   **TA-SYNC-001 :** Toutes les distributions et recouvrements enregistrés hors ligne sont correctement synchronisés avec le serveur.
    *   **TA-SYNC-002 :** Les nouveaux clients enregistrés hors ligne sont correctement synchronisés avec le serveur.
    *   **TA-SYNC-003 :** L'application gère les erreurs de synchronisation et informe l'utilisateur.

### 5.5. Impression de Rapport Journalier

#### 5.5.1. Génération et Impression du Rapport

*   **Description :** Le commercial peut générer et imprimer un rapport journalier de ses activités sur le terrain.
*   **Contenu du Rapport :**
    *   Résumé des distributions effectuées (nombre, montant total).
    *   Résumé des recouvrements effectués (nombre, montant total).
    *   Liste détaillée des distributions (client, articles, quantités, montants).
    *   Liste détaillée des recouvrements (client, montant collecté, crédit concerné).
    *   Informations sur le commercial et la date du rapport.
*   **Règles Métier :**
    *   Le rapport doit être généré à partir des données locales.
    *   L'application doit permettre l'impression via une imprimante mobile.
*   **Tests d'Acceptation :**
    *   **TA-REPORT-001 :** L'application génère un rapport journalier précis et complet.
    *   **TA-REPORT-002 :** Le rapport peut être imprimé avec succès.

### 5.6. Tableau de Bord Commercial

#### 5.6.1. Affichage du Tableau de Bord

*   **Description :** Un tableau de bord visuel fournissant des indicateurs clés sur les performances du commercial au cours du mois.
*   **Indicateurs Clés (Exemples) :**
    *   Montant total des ventes à crédit du mois.
    *   Montant total des recouvrements du mois.
    *   Nombre de nouveaux clients enregistrés.
    *   Progression par rapport aux objectifs mensuels.
    *   Graphiques de tendance (ventes, recouvrements).
*   **Règles Métier :**
    *   Les données du tableau de bord doivent être agrégées à partir des données locales synchronisées.
    *   Le tableau de bord doit être interactif et permettre de visualiser les données par période (jour, semaine, mois).
*   **Tests d'Acceptation :**
    *   **TA-DASH-001 :** Le tableau de bord affiche des indicateurs pertinents et à jour.
    *   **TA-DASH-002 :** Les graphiques sont clairs et représentatifs des données.

## 6. Considérations Techniques Supplémentaires

### 6.1. Gestion des Erreurs et Robustesse

*   **Gestion des Erreurs API :** L'application doit gérer de manière robuste les erreurs retournées par le backend (4xx, 5xx) et afficher des messages compréhensibles à l'utilisateur.
*   **Résilience Offline :** Toutes les opérations critiques doivent pouvoir être effectuées hors ligne et mises en file d'attente pour synchronisation.
*   **Journalisation :** Implémentation d'un mécanisme de journalisation pour faciliter le débogage et le support.

### 6.2. Sécurité

*   **Stockage Sécurisé :** Les informations sensibles (tokens d'authentification, mots de passe cryptés) doivent être stockées de manière sécurisée sur l'appareil.
*   **Communication Sécurisée :** Toutes les communications avec le backend doivent utiliser HTTPS.

### 6.3. Performance et Expérience Utilisateur

*   **Optimisation des Requêtes :** Minimiser le nombre de requêtes API et optimiser la taille des données transférées.
*   **Réactivité de l'UI :** Assurer une interface utilisateur fluide et réactive, même lors du traitement de grandes quantités de données.
*   **Indicateurs de Chargement :** Utilisation systématique de spinners ou de barres de progression pour informer l'utilisateur des opérations en cours.

## 7. Glossaire

*   **API :** Application Programming Interface.
*   **Backend :** Partie serveur de l'application.
*   **Frontend :** Partie client de l'application (interface utilisateur).
*   **Ionic/Angular :** Framework de développement mobile hybride.
*   **SQLite/IndexedDB :** Bases de données locales pour applications mobiles/web.
*   **Epic :** Grande fonctionnalité ou ensemble de fonctionnalités.
*   **User Story :** Description d'une fonctionnalité du point de vue de l'utilisateur.
*   **PlantUML :** Langage de description de diagrammes.

## 8. Références

*   [1] Fichier `besoin.txt` fourni par l'utilisateur.
*   [2] Fichier `backend-openapi-docs.json` fourni par l'utilisateur.

---

**Auteur :** Manus AI
**Date :** 25 Juillet 2025
**Version :** 1.0




#### 4.2.8. Récupération des Sorties d'Articles du Commercial

*   **Description :** L'application récupère les enregistrements des sorties d'articles du magasin attribués au commercial, représentant le stock qu'il peut distribuer à crédit.
*   **Endpoint :** `GET {{baseUrl}}/api/v1/credits/sorties-history/by-commercial/{{commercial-username}}?page=0&size=1000&sort=id,desc`
*   **Règles Métier :**
    *   Les données sont récupérées depuis `data.content`.
    *   Seuls les éléments avec un `status` égal à "INPROGRESS" et `updatable` à "true" doivent être enregistrés localement.
    *   Seules les références des entités liées (`client.id`, `articles.id`) doivent être stockées pour éviter la duplication des données complètes des clients et articles déjà initialisés.
*   **Tests d'Acceptation :**
    *   **TA-INIT-SORTIE-001 :** L'application récupère et stocke correctement les sorties d'articles en cours, en filtrant par statut et `updatable`.
    *   **TA-INIT-SORTIE-002 :** En cas d'échec de l'API, l'application gère l'erreur et informe l'utilisateur.

#### 4.2.9. Récupération des Distributions Existantes du Commercial

*   **Description :** L'application récupère l'historique complet des distributions (ventes à crédit) effectuées par le commercial connecté.
*   **Endpoint :** `GET {{baseUrl}}/api/v1/credits/by-commercial/{{commercial-username}}?page=0&size=10000&sort=id,desc`
*   **Règles Métier :**
    *   Les données sont récupérées depuis `data.content`.
    *   Toutes les distributions retournées par l'API doivent être stockées localement, incluant les crédits en cours et terminés.
    *   Les informations pertinentes pour le suivi des crédits et des recouvrements doivent être stockées, notamment : ID de la distribution, Référence du crédit, Informations du client (ID de référence), Articles distribués (ID de référence), Montants (total, payé, restant), Dates (début, fin prévue, fin effective), Statut du crédit, Mise journalière.
    *   Seules les références des entités liées (`client.id`, `articles.id`) doivent être stockées pour éviter la duplication des données complètes des clients et articles déjà initialisés.
*   **Tests d'Acceptation :**
    *   **TA-INIT-DIST-001 :** L'application récupère et stocke correctement les distributions existantes.
    *   **TA-INIT-DIST-002 :** En cas d'échec de l'API, l'application gère l'erreur et informe l'utilisateur.

#### 4.2.10. Récupération des Comptes Clients du Commercial

*   **Description :** L'application récupère les informations des comptes clients associés au commercial connecté.
*   **Endpoint :** `GET {{baseUrl}}/api/v1/accounts?page=0&size=2000&sort=id,desc&username=<commercial-username>`
*   **Règles Métier :**
    *   Les données sont récupérées depuis `data.content`.
    *   Pour chaque compte, les informations suivantes doivent être stockées localement : ID du compte, Numéro de compte, Solde du compte (accountBalance), Statut du compte, ID du client associé (client.id) pour référence.
    *   Seul l'ID du client (`client.id`) doit être stocké pour référencer le client déjà enregistré localement.
*   **Tests d'Acceptation :**
    *   **TA-INIT-COMPTE-001 :** L'application récupère et stocke correctement les comptes clients.
    *   **TA-INIT-COMPTE-002 :** En cas d'échec de l'API, l'application gère l'erreur et informe l'utilisateur.


