# Plan d'Implémentation Professionnel : Synchronisation Manuelle

## 1. Introduction et Objectifs

Ce document présente un plan d'implémentation détaillé pour la fonctionnalité de **synchronisation manuelle** de l'application mobile Elykia. L'objectif est de fournir aux utilisateurs (commerciaux) un contrôle granulaire sur le processus de synchronisation, leur permettant de sélectionner et de synchroniser des entités spécifiques (clients, distributions, recouvrements) de manière individuelle ou groupée. 

Ce plan s'appuie sur l'architecture existante, notamment le service `SynchronizationService` et le store NgRx, afin de garantir une intégration cohérente, performante et maintenable, tout en respectant les exigences de l'application qui est déjà en production.

## 2. Analyse de l'Existant

L'analyse du code et des documents a révélé les points suivants :

- **Synchronisation Automatique :** La fonctionnalité de synchronisation automatique (`synchronizeAllData`) est implémentée et fonctionnelle. Elle suit un processus séquentiel et prédéfini.
- **Services de Base :** Le `SynchronizationService` expose déjà des méthodes pour la synchronisation unitaire (ex: `syncSingleClient`, `syncSingleDistribution`) qui seront capitales pour notre implémentation.
- **Gestion d'État (NgRx) :** Le `sync.reducer.ts` et les `sync.actions.ts` contiennent déjà une structure et des actions prévues pour la synchronisation manuelle (ex: `ManualSyncState`, `loadManualSyncData`, `startManualSync`).
- **Exigences :** Les fichiers `TODO.md` et `besoin.txt` décrivent clairement le besoin : une interface à onglets permettant la sélection multiple, la synchronisation individuelle et groupée, et une gestion d'erreurs claire.

## 3. Plan d'Implémentation Détaillé

L'implémentation sera structurée en 4 phases principales pour assurer une progression logique et maîtrisée.

### Phase 1 : Création de l'Interface Utilisateur (UI)

Cette phase se concentre sur la mise en place de tous les composants visuels nécessaires.

1.  **Générer la Page et les Composants :**
    -   Créer une nouvelle page `sync-manual` dans `src/app/features/sync/`.
    -   Générer un composant réutilisable `entity-sync-list` dans un dossier `components` qui prendra en entrée le type d'entité et les données à afficher.

2.  **Développer la Structure de la Page `sync-manual` :**
    -   Utiliser les `ion-segment` Ionic pour créer une navigation par onglets : "Clients", "Distributions", "Recouvrements".
    -   Chaque onglet affichera le composant `entity-sync-list` correspondant.
    -   Ajouter un `ion-fab-button` (Floating Action Button) qui sera conditionnellement affiché lorsqu'un ou plusieurs éléments sont sélectionnés.

3.  **Développer le Composant `entity-sync-list` :**
    -   Afficher une liste d'items avec un `ion-checkbox` pour la sélection multiple.
    -   Ajouter un `ion-checkbox` "Tout sélectionner" dans l'en-tête de la liste.
    -   Sur chaque item, ajouter un bouton (icône `sync-outline`) pour la synchronisation individuelle.
    -   Afficher un état visuel pour chaque item (par défaut, en attente, en cours de synchro, synchronisé, erreur).

### Phase 2 : Logique de Gestion d'État (NgRx)

Cette phase consiste à câbler l'interface utilisateur avec le store NgRx pour une gestion d'état réactive et centralisée.

1.  **Chargement des Données :**
    -   Créer un `effect` NgRx qui répond à l'action `loadManualSyncData`.
    -   Cet `effect` appellera les méthodes du `DatabaseService` pour récupérer les clients, distributions et recouvrements non synchronisés.
    -   En cas de succès, il `dispatch` l'action `loadManualSyncDataSuccess` avec les données, qui seront stockées dans le `manualSync` state.

2.  **Gestion des Sélections :**
    -   Implémenter la logique dans le `sync.reducer.ts` pour les actions `toggleEntitySelection`, `selectAllEntities`, et `clearEntitySelection` afin de mettre à jour le tableau `selectedIds` pour chaque type d'entité dans le state.

3.  **Lancement de la Synchronisation :**
    -   Créer un nouvel `effect` qui écoute l'action `startManualSync`.
    -   Cet `effect` itérera sur les `selectedIds` et appellera, pour chaque ID, la méthode de synchronisation unitaire appropriée du `SynchronizationService` (ex: `syncSingleClient`).
    -   Pour chaque élément, il `dispatch` des actions de progression (`manualSyncProgress`), de succès (`syncSingleEntitySuccess`) ou d'échec (`syncSingleEntityFailure`).

### Phase 3 : Intégration des Services et Logique Métier

Cette phase assure la liaison entre le store NgRx et les services existants.

1.  **Adapter le `SynchronizationService` :**
    -   Créer de nouvelles méthodes publiques si nécessaire pour la synchronisation manuelle, qui réutiliseront la logique privée existante. Par exemple, une méthode `syncManualClients(clientIds: string[])`.
    -   S'assurer que chaque appel de synchronisation unitaire gère correctement le mapping des IDs (local -> serveur) et met à jour le statut `isSync` de l'entité dans la base de données locale.

2.  **Connecter la Page `sync-manual.page.ts` au Store :**
    -   Utiliser les sélecteurs NgRx pour souscrire aux données (`availableClients`, etc.) et à l'état de la sélection (`selectedIds`).
    -   `Dispatch` l'action `loadManualSyncData` dans le `ionViewWillEnter`.
    -   Connecter les actions de l'utilisateur (clic sur checkbox, clic sur boutons) pour `dispatch` les actions NgRx correspondantes (`toggleEntitySelection`, `startManualSync`).

### Phase 4 : Gestion des Erreurs et Feedback Utilisateur

Cette phase est cruciale pour fournir une expérience utilisateur robuste et transparente.

1.  **Feedback Visuel :**
    -   Dans le composant `entity-sync-list`, utiliser les sélecteurs NgRx pour afficher un `ion-spinner` sur les éléments en cours de synchronisation.
    -   Changer la couleur et l'icône des éléments en fonction de leur statut (succès, erreur).

2.  **Gestion des Erreurs :**
    -   Lorsqu'une action `syncSingleEntityFailure` est reçue, le reducer mettra à jour l'état de l'entité.
    -   Afficher une icône d'erreur sur l'élément concerné. Un clic sur cette icône pourrait afficher un `AlertController` ou un `Toast` avec le message d'erreur détaillé.
    -   Le `logSyncError` du `SyncErrorService` sera utilisé pour persister l'erreur, la rendant visible dans la page dédiée à la gestion des erreurs.

3.  **Finalisation :**
    -   Afficher des `Toast` de succès ou d'échec globaux à la fin d'une synchronisation de groupe.
    -   S'assurer que les éléments synchronisés avec succès sont retirés de la liste de synchronisation manuelle lors du prochain rechargement de la page.

## 4. Prochaines Étapes

Je vais maintenant procéder à la création du fichier `PLAN_IMPLEMENTATION_SYNC_MANUELLE.md` dans le dossier `mobile/docs` de votre projet. Une fois cette étape validée, je commencerai l'implémentation en suivant rigoureusement les phases décrites ci-dessus, en commençant par la génération des composants de l'interface utilisateur.
