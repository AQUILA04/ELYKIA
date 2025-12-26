# Prompts de Développement pour l'Application Commerciale Ionic

Ce document contient une série de prompts destinés à un agent IA de développement. Chaque prompt correspond à une Technical Story (TS) ou une User Story (US) et fournit toutes les instructions nécessaires pour implémenter la fonctionnalité correspondante dans une application Ionic Angular.

Note générale :
Dans tous les prompts, le terme "en ligne" ou "connecté à Internet" doit être interprété comme "le serveur de l'application est accessible". Le test de cette accessibilité se fait en vérifiant que l'endpoint {{baseUrl}}/actuator/status retourne une réponse positive (ex: "UP").

---

### Prompt pour TS000 : Setup du Projet Ionic Angular

**Instruction pour l'IA :**

En tant que développeur IA, ta mission est d'initialiser et de configurer une nouvelle application Ionic Angular en suivant rigoureusement la Technical Story `TS000`. Tu dois mettre en place la structure du projet, les dépendances clés et les outils de développement pour garantir une base de code solide et maintenable.

**Détails de la tâche :**

1.  **Initialisation du projet :**
    * Utilise Ionic CLI (v7.x ou supérieur) et Angular CLI (v16.x ou supérieur).
    * Exécute les commandes suivantes pour créer le projet et installer les dépendances de base :
        ```bash
        # Installation des outils globaux
        npm install -g @ionic/cli @angular/cli
        
        # Création du projet
        ionic start commercial-app tabs --type=angular --capacitor
        
        # Navigation vers le projet
        cd commercial-app
        
        # Installation des dépendances supplémentaires
        npm install @ngrx/store @ngrx/effects @ngrx/store-devtools
        npm install @capacitor-community/sqlite @capacitor/camera @capacitor/geolocation
        npm install @capacitor/network @capacitor/storage
        npm install @ionic/storage-angular
        ```

2.  **Mise en place de la structure de dossiers :**
    * Crée la structure de dossiers suivante dans le répertoire `src/app/` pour organiser le code de manière modulaire et évolutive :
        ```
        src/
        ├── app/
        │   ├── core/
        │   ├── shared/
        │   ├── features/
        │   ├── store/
        │   └── models/
        ```
    * Assure-toi que chaque dossier a un objectif clair (ex: `core` pour les services singletons, `features` pour les modules fonctionnels).

3.  **Configuration de la base de données locale (SQLite) :**
    * Implémente un `DatabaseService` dans `src/app/core/services/`.
    * Ce service doit utiliser `@capacitor-community/sqlite` pour initialiser la connexion à la base de données.
    * Inclus une méthode `initializeDatabase` qui crée et ouvre la connexion.
    * Implémente une méthode `createTables` qui exécute les requêtes SQL `CREATE TABLE IF NOT EXISTS` pour toutes les tables définies dans `TS000` (users, commercials, articles, etc.). Le schéma SQL complet est fourni dans la story.

4.  **Configuration de la gestion d'état (NgRx) :**
    * Configure NgRx dans `app.module.ts`. Importe `StoreModule.forRoot()`, `EffectsModule.forRoot()`, et `StoreDevtoolsModule`. Assure-toi que les DevTools ne sont activés qu'en environnement de développement.

5.  **Configuration des environnements :**
    * Crée les fichiers `environment.ts` et `environment.prod.ts` avec les configurations d'API et les variables spécifiques à chaque environnement, comme spécifié dans `TS000`.

6.  **Configuration du Linter et du Formatteur :**
    * Configure ESLint et Prettier pour assurer une qualité de code constante. Utilise la configuration `.eslintrc.json` fournie comme base.

7.  **Validation :**
    * Le projet doit se lancer sans erreur en utilisant `ionic serve`.
    * La base de données doit être initialisée correctement au lancement de l'application sur une plateforme mobile.
    * Le store NgRx doit être visible et fonctionnel dans les Redux DevTools du navigateur.

---

### Prompt pour US001 : Connexion Utilisateur

**Instruction pour l'IA :**

Développe la fonctionnalité de connexion utilisateur (`US001`) pour l'application mobile. Cette fonctionnalité doit gérer l'authentification en ligne via une API et une authentification hors ligne en utilisant les données locales.

**Détails de la tâche :**

1.  **Création de l'interface de connexion :**
    * Crée une page de connexion (`LoginPage`) dans le module `auth` (`src/app/features/auth/`).
    * L'interface doit contenir deux champs de saisie : `username` et `password`, ainsi qu'un bouton "Connecter".

2.  **Implémentation de la logique d'authentification :**
    * Crée un `AuthService` pour gérer la logique de connexion.
    * La logique doit suivre les règles métiers `RM-AUTH-001` à `RM-AUTH-008`.
    * **Flux de connexion :**
        1.  Au clic sur "Connecter", vérifie d'abord la disponibilité du réseau (via le plugin Capacitor Network).
        2.  **Si en ligne :** Appelle l'API `POST {{baseUrl}}/api/auth/signin` avec le `username` et le `password`.
            * **En cas de succès (200 OK) :**
                * Récupère les données (`id`, `username`, `email`, `roles`, `accessToken`, `refreshToken`).
                * Crypte le mot de passe (utilise une librairie comme `bcrypt.js` ou une alternative compatible).
                * Sauvegarde/Met à jour les informations de l'utilisateur dans la table `users` de la base de données SQLite locale.
                * Redirige vers le tableau de bord (`/dashboard`).
            * **En cas d'échec (4xx, 5xx) :** Affiche un message d'erreur approprié retourné par l'API.
        3.  **Si hors ligne (ou si l'API échoue) :** Tente une authentification locale.
            * Recherche l'utilisateur dans la table locale `users` par son `username`.
            * Compare le mot de passe saisi avec le hash stocké localement.
            * **En cas de succès :** Redirige vers le tableau de bord.
            * **Si l'utilisateur n'existe pas localement :** Affiche le message "Utilisateur non configuré pour cet appareil !".
            * **Si le mot de passe est incorrect :** Affiche le message "Nom d'utilisateur ou mot de passe incorrect".

3.  **Gestion de l'état et de l'expérience utilisateur :**
    * Utilise NgRx pour gérer l'état de l'authentification (ex: `isLoggedIn`, `user`, `token`).
    * Affiche un indicateur de chargement (spinner avec un fond flou) pendant les opérations d'authentification et le chargement des données initiales après la connexion (règle `RM-AUTH-008`).

4.  **Tests d'Acceptance :**
    * Assure-toi que l'implémentation passe tous les scénarios de test définis dans `TA-AUTH-001` à `TA-AUTH-005` (connexion en ligne/hors ligne, succès/échec).

---

### Prompt pour les User Stories d'Initialisation (US002, US003, US004, US005, US013, US014, US015)

**Instruction pour l'IA :**

Développe un service d'initialisation des données (`DataInitializationService`). Ce service sera responsable du téléchargement et du stockage local des données essentielles après une première connexion en ligne réussie. Tu dois implémenter la logique pour chaque entité décrite dans les User Stories `US002`, `US003`, `US004`, `US005`, `US013`, `US014`, et `US015`.

**Détails de la tâche :**

1.  **Création du `DataInitializationService` :**
    * Ce service doit être appelé après une authentification en ligne réussie (`US001`).
    * Il doit orchestrer le téléchargement séquentiel ou parallèle des différentes entités.
    * Affiche un indicateur de progression global pour l'ensemble du processus d'initialisation.

2.  **Implémentation des méthodes de téléchargement pour chaque entité :**
    * Pour chaque User Story d'initialisation, crée une méthode privée dans le service. Chaque méthode doit :
        * Appeler l'endpoint de l'API spécifié dans la section "Détails Techniques des API" de la story.
        * Traiter la réponse JSON pour extraire les données pertinentes (ex: `data.content` pour les listes paginées).
        * Appliquer les règles de filtrage ou de transformation spécifiées (ex: `status == "INPROGRESS"` pour `US013`, ou ne stocker que l'utilisateur connecté pour `US005`).
        * Mapper les données de l'API aux modèles de la base de données locale (tables définies dans `TS000`).
        * Stocker les données dans la base de données SQLite en utilisant le `DatabaseService`. Porte une attention particulière à ne stocker que les ID de référence pour les entités liées (`clientId`, `articleId`, etc.) afin d'éviter la duplication.
    * **Exemples spécifiques :**
        * **US002 (Articles) :** Ne stocke que les champs listés dans `Champs à stocker localement`.
        * **US004 (Clients) :** Ajoute les champs locaux `latitude`, `longitude`, `mll`, `profilPhoto` avec des valeurs `null` pour les clients venant du serveur.
        * **US013 (Sorties d'Articles) :** Ne stocke que les sorties avec `status` égal à "INPROGRESS" et `updatable` à `true`.

3.  **Gestion des erreurs et de l'expérience utilisateur :**
    * Pour chaque appel API, gère les erreurs (réseau, 4xx, 5xx).
    * En cas d'échec pour une entité, affiche un message d'erreur informatif et propose une option pour "Réessayer" l'initialisation de cette entité spécifique ou de "Continuer" avec des données potentiellement incomplètes, comme spécifié dans les règles métiers.

4.  **Validation :**
    * Le processus doit se déclencher automatiquement après une connexion en ligne réussie.
    * Les données doivent être correctement téléchargées, filtrées et insérées dans les tables SQLite locales.
    * Les tests d'acceptance pour chaque story d'initialisation doivent être validés.

---

### Prompt pour US009 : Enregistrement d'un Nouveau Client

**Instruction pour l'IA :**

Développe la fonctionnalité d'enregistrement d'un nouveau client (`US009`). Un commercial doit pouvoir créer un client sur le terrain, même hors ligne. La fonctionnalité doit inclure la saisie d'informations, la prise de photo et la géolocalisation.

**Détails de la tâche :**

1.  **Création du formulaire de création :**
    * Crée une page (`ClientCreatePage`) dans le module `clients` (`src/app/features/clients/`).
    * Le formulaire doit inclure tous les champs mentionnés dans les règles `RM-NEWCLI-001` et `RM-NEWCLI-002`, avec une validation pour les champs obligatoires.
    * Le champ "quartier" (`localityId`) doit être un menu déroulant peuplé par les localités stockées localement (`US003`).

2.  **Intégration des plugins Capacitor :**
    * **Photo de profil (`RM-NEWCLI-004`) :** Utilise le plugin `Capacitor/Camera` pour permettre au commercial de prendre une photo. La photo est obligatoire. Stocke la photo localement (ex: en base64 dans la base de données ou en tant que fichier et stocker son URI).
    * **Géolocalisation (`RM-NEWCLI-005`) :** Utilise le plugin `Capacitor/Geolocation` pour obtenir les coordonnées `latitude` et `longitude` automatiquement. Prévois des champs de saisie manuelle si la géolocalisation automatique échoue ou si l'utilisateur le souhaite.

3.  **Implémentation de la logique métier :**
    * **Génération du lien de carte (`RM-NEWCLI-006`) :** Crée une fonction qui génère une URL Google Maps (ou équivalent) à partir des coordonnées GPS (ex: `https://maps.google.com/?q=latitude,longitude`).
    * **Génération d'ID locaux (`RM-NEWCLI-008`) :**
        * Génère un identifiant local unique pour le client (ex: un timestamp ou un UUID).
        * Implémente la logique de génération du `code` et du `accountNumber` comme décrit dans les "Détails Techniques des API".
    * **Sauvegarde locale :**
        * Lors de la validation du formulaire, crée un objet `Client` et un objet `Account` correspondants.
        * Sauvegarde le nouveau client et son compte dans les tables SQLite `clients` et `accounts`.
        * Assure-toi de définir les drapeaux `isLocal` à `true` et `isSync` à `false`.

4.  **Validation :**
    * Le formulaire doit appliquer les validations requises (champs, photo).
    * Les plugins Capacitor doivent fonctionner correctement pour la caméra et la géolocalisation.
    * Le nouveau client et son compte doivent être correctement enregistrés dans la base de données locale avec les bonnes valeurs et les bons drapeaux.

---

### Prompt pour US006 & US007 : Enregistrement et Impression d'une Distribution

**Instruction pour l'IA :**

Développe la fonctionnalité d'enregistrement d'une distribution (`US006`) et l'impression du reçu associé (`US007`). Le commercial doit pouvoir enregistrer une vente à crédit hors ligne, avec des validations sur le stock et le solde du client, puis imprimer un reçu.

**Détails de la tâche :**

**Partie 1 : Enregistrement de la Distribution (US006)**

1.  **Création de l'interface d'enregistrement :**
    * Crée une page (`DistributionCreatePage`) dans le module `distributions`.
    * L'interface doit permettre de :
        * Sélectionner un client depuis la base de données locale.
        * Sélectionner des articles depuis les `stock_outputs` actifs du commercial (ceux où `updatable` est `true`).
        * Saisir les quantités pour chaque article.

2.  **Implémentation de la logique métier et des validations :**
    * **Validation du stock (`RM-DIST-004`) :** La quantité saisie pour un article ne doit pas dépasser la quantité disponible dans la `stock_output_items` correspondante.
    * **Calculs automatiques (`RM-DIST-005`, `RM-DIST-006`) :** Calcule le `totalAmount` (Σ `quantity` × `creditSalePrice`) et le `dailyPayment` (`totalAmount` / 30).
    * **Validation du solde client (`RM-DIST-010`) :** Le montant total de la distribution ne doit pas dépasser 6 fois le `accountBalance` du client sélectionné. Affiche une alerte claire si cette limite est dépassée.
    * **Sauvegarde locale :**
        * Si toutes les validations sont réussies, enregistre la nouvelle distribution dans la table `distributions` et les articles associés dans `distribution_items` avec un drapeau `isSync` à `false`.
        * Met à jour le stock local : décrémente les quantités dans `stock_output_items`.
        * Vérifie si une `stock_output` est épuisée. Si c'est le cas, met son drapeau `updatable` à `false` (`RM-DIST-012`).

**Partie 2 : Impression du Reçu (US007)**

1.  **Création du service d'impression :**
    * Implémente un `PrintingService`.
    * Crée une fonction `generateDistributionReceipt` qui prend en paramètre un objet de distribution.

2.  **Génération du contenu du reçu :**
    * La fonction doit formater un texte (ou HTML) contenant toutes les informations requises par les règles `RM-RECU-001` à `RM-RECU-007`.

3.  **Intégration de l'impression Bluetooth :**
    * Utilise une librairie comme `cordova-plugin-bluetooth-printer` ou `ngx-printer` pour envoyer le contenu formaté à une imprimante thermique Bluetooth.
    * Gère la découverte et la connexion à l'imprimante.

4.  **Gestion de l'échec d'impression (`RM-RECU-009`) :**
    * Si aucune imprimante n'est connectée ou si l'impression échoue, propose à l'utilisateur de sauvegarder le reçu en tant que fichier PDF dans le stockage de l'appareil. Nomme le fichier `distribution_<ref>_<date>.pdf`.

5.  **Flux utilisateur :**
    * Après avoir enregistré une distribution avec succès (fin de `US006`), affiche une boîte de dialogue proposant "Imprimer le reçu".

---

### Prompt pour US008 : Enregistrement d’un Recouvrement Journalier

**Instruction pour l'IA :**

Développe la fonctionnalité d'enregistrement d'un recouvrement (`US008`). Le commercial doit pouvoir enregistrer facilement les paiements journaliers des clients hors ligne.

**Détails de la tâche :**

1.  **Création de l'interface de recouvrement :**
    * Crée une page (`RecoveryCreatePage`) dans le module `recouvrements`.
    * L'interface doit permettre de :
        * Sélectionner un client dans une liste.
        * Une fois le client sélectionné, afficher la liste de ses distributions (`credits`) en cours, avec le solde restant et la mise journalière pour chacune.
        * Permettre la saisie du montant collecté.

2.  **Implémentation de la logique métier et des validations :**
    * **Validation du montant (`RM-RECOUV-003`, `RM-RECOUV-004`) :**
        * Le montant saisi doit être inférieur ou égal au solde restant du crédit.
        * Le montant doit être un multiple de la mise journalière, sauf si une option "paiement spécial/libre" est implémentée. Affiche une erreur si la validation échoue.
    * **Sauvegarde locale (`RM-RECOUV-005`) :**
        * Si la validation est réussie, crée un nouvel enregistrement dans la table `recoveries` avec les détails du paiement (montant, date, `distributionId`, `clientId`, etc.).
        * Assigne un identifiant local unique et met le drapeau `isSync` à `false`.
    * **Mise à jour du solde (`RM-RECOUV-006`) :**
        * Met à jour le solde restant de la distribution concernée dans la table `distributions`.

3.  **Expérience utilisateur :**
    * Pour simplifier la saisie, propose des boutons rapides pour les multiples de la mise (ex: "1x", "2x", "Solde total").

---

### Prompt pour US010 : Synchronisation des Données

**Instruction pour l'IA :**

Développe la fonctionnalité de synchronisation des données (`US010`). Le commercial doit pouvoir envoyer toutes les données créées ou modifiées localement vers le serveur principal lorsqu'il dispose d'une connexion internet.

**Détails de la tâche :**

1.  **Création de l'interface de synchronisation :**
    * Crée une page (`SyncPage`) dans le module `synchronisation`.
    * Cette page doit afficher le nombre d'éléments en attente de synchronisation pour chaque type de données (clients, distributions, recouvrements).
    * Inclus un bouton "Tout Synchroniser".
    * Affiche une barre de progression globale et des indicateurs d'état pendant le processus.

2.  **Implémentation du `SyncService` :**
    * **Vérification des prérequis (`RM-SYNC-001`, `RM-SYNC-002`) :**
        * Avant de démarrer, vérifie la connexion internet avec le plugin Capacitor Network.
        * Appelle l'API `GET {{baseUrl}}/api/v1/cash-desks/is-opened`. Si la caisse est fermée, appelle `GET {{baseUrl}}/api/v1/cash-desks/open` avant de continuer (`RM-SYNC-003`).
    * **Logique de synchronisation ordonnée (`RM-SYNC-004`) :**
        * La synchronisation doit se faire dans l'ordre suivant pour gérer les dépendances : **1. Clients → 2. Distributions → 3. Recouvrements**.
        * Pour chaque type de données :
            1.  Récupère tous les enregistrements de la table locale où `isSync` est `false`.
            2.  Itère sur chaque enregistrement et appelle l'API POST ou PATCH correspondante (détaillée dans les stories `US009`, `US006`, `US008`).
            3.  **Gestion des dépendances :** Pour les distributions et les recouvrements, assure-toi d'utiliser l'ID serveur du client (obtenu lors de la synchronisation des clients) dans la requête.
            4.  **En cas de succès de l'API :** Récupère l'ID serveur retourné, mets à jour l'enregistrement local avec cet ID et passe le drapeau `isSync` à `true`.
    * **Gestion des erreurs et de la résilience (`RM-SYNC-007`, `RM-SYNC-008`) :**
        * Si la synchronisation d'un élément échoue, logue l'erreur et continue avec l'élément suivant. Ne bloque pas tout le processus.
        * À la fin, affiche un rapport récapitulatif (ex: "Clients synchronisés : 5/5. Distributions : 9/10. Échec : 1").
        * Gère les erreurs d'authentification (token expiré). Si une erreur 401/403 est reçue, déconnecte l'utilisateur et redirige-le vers la page de connexion.

---

### Prompt pour US011 : Génération du Rapport Journalier

**Instruction pour l'IA :**

Développe la fonctionnalité de génération et d'impression du rapport journalier (`US011`). À la fin de sa journée, le commercial doit pouvoir consulter un résumé de ses activités et l'imprimer.

**Détails de la tâche :**

1.  **Création de la page de rapport :**
    * Crée une page (`DailyReportPage`) dans le module `dashboard` ou un nouveau module `reports`.
    * La page doit comporter un bouton "Générer le rapport du jour".

2.  **Logique de génération de rapport :**
    * Au clic sur le bouton, exécute des requêtes sur la base de données SQLite locale pour récupérer :
        * Tous les clients créés aujourd'hui (`createdAt`).
        * Toutes les distributions créées aujourd'hui.
        * Tous les recouvrements créés aujourd'hui.
    * **Agrégation des données (`RM-RAPPORT-001` à `RM-RAPPORT-004`) :**
        * Groupe les données par localité lorsque cela est pertinent.
        * Calcule le montant total à verser : `montant total des recouvrements du jour + soldes initiaux des nouveaux comptes clients créés le jour même`.

3.  **Affichage et impression :**
    * Affiche les données agrégées de manière claire et structurée sur la page, en suivant la structure proposée (tables pour clients, distributions, collectes).
    * Intègre les boutons "Imprimer" et "Sauvegarder en PDF".
    * Réutilise le `PrintingService` de `US007` pour gérer l'impression Bluetooth et la sauvegarde en PDF.
    * Le nom du fichier PDF doit suivre le format `rapport_journalier_<YYYY-MM-DD>.pdf`.

---

### Prompt pour US012 : Tableau de Bord Commercial

**Instruction pour l'IA :**

Développe le tableau de bord (`US012`), qui sera la page d'accueil de l'application après la connexion. Il doit fournir une vue synthétique et visuelle des performances du commercial.

**Détails de la tâche :**

1.  **Création de la page du tableau de bord :**
    * Crée la page (`DashboardPage`) qui sera la route principale après la connexion.
    * Structure la page en suivant le wireframe fourni : des cartes pour les KPIs en haut, les filtres, puis le graphique.

2.  **Implémentation des KPIs (`RM-DASH-001` à `RM-DASH-003`) :**
    * Crée des méthodes dans un `DashboardService` pour requêter la base de données locale et calculer :
        * Le montant total des distributions du mois en cours.
        * Le montant total des recouvrements du mois en cours.
        * Le nombre de nouveaux clients créés le mois en cours.
    * Affiche ces valeurs dans les cartes de KPI.

3.  **Implémentation du graphique (`RM-DASH-004`) :**
    * Utilise une bibliothèque de graphiques pour Angular (ex: `ng2-charts` qui encapsule Chart.js).
    * Crée une requête qui agrège par jour le montant total des distributions et le montant total des recouvrements sur les 30 derniers jours.
    * Affiche ces deux séries de données sur un graphique linéaire.

4.  **Implémentation des filtres (`RM-DASH-005`) :**
    * Ajoute des boutons pour filtrer les données du graphique par période : "Aujourd'hui", "Cette semaine", "Ce mois", "Cette année".
    * La sélection d'un filtre doit déclencher une nouvelle requête vers la base de données locale et mettre à jour le graphique.

5.  **Gestion des données initiales (`RM-DASH-007`) :**
    * Si le tableau de bord se charge et détecte que l'initialisation des données a échoué (par exemple, via un état dans le store NgRx), il doit afficher un message d'alerte bien visible avec un bouton "Réessayer l'initialisation" qui déclenchera le `DataInitializationService`.