# Document de Requirements : sync-date-filter-preference

## Introduction

Cette fonctionnalité permet à l'utilisateur de configurer une préférence de plage de dates pour la synchronisation automatique dans l'application mobile Angular/Ionic/NgRx. Par défaut, seules les données du jour sont synchronisées. L'utilisateur peut choisir parmi six options : aujourd'hui, 2 jours, 3 jours, 1 semaine, 2 semaines, 1 mois. La préférence est persistée via Ionic Storage, chargée dans le NgRx store au démarrage, et utilisée par `SyncMasterService` pour filtrer les données SQLite via la colonne `created_at`.

## Glossaire

- **SyncDateFilterOption** : Type union TypeScript représentant les six options de filtre de date disponibles (`'today'`, `'2days'`, `'3days'`, `'week'`, `'2weeks'`, `'month'`).
- **DateFilter** : Objet contenant `startDate` et `endDate` au format ISO `YYYY-MM-DD`, représentant la plage de dates à synchroniser.
- **SyncDateFilterPreferenceService** : Service Angular responsable de la persistance et du chargement de la préférence de filtre de date via Ionic Storage.
- **PreferencesStore** : Slice NgRx dédié aux préférences utilisateur, contenant l'état `syncDateFilter` et `loaded`.
- **SyncMasterService** : Service orchestrant la synchronisation de toutes les données de domaine.
- **BaseSyncService** : Classe de base abstraite dont héritent tous les services de synchronisation de domaine.
- **BaseRepository** : Classe de base abstraite dont héritent tous les repositories SQLite.
- **SyncEffects** : Classe NgRx Effects gérant les effets de bord liés à la synchronisation.
- **MorePage** : Page de paramètres de l'application exposant le sélecteur de filtre de date.
- **IsoDateString** : Chaîne de caractères au format `YYYY-MM-DD`.

---

## Requirements

### Requirement 1 : Modèle de données du filtre de date

**User Story :** En tant que développeur, je veux un modèle de données typé pour les options de filtre de date, afin de garantir la cohérence des valeurs dans toute l'application.

#### Acceptance Criteria

1. THE SyncDateFilterOption SHALL être un type union TypeScript acceptant exactement les valeurs `'today'`, `'2days'`, `'3days'`, `'week'`, `'2weeks'` et `'month'`.
2. THE DateFilter SHALL contenir deux champs obligatoires : `startDate` et `endDate`, tous deux des IsoDateString au format `YYYY-MM-DD`.
3. THE SyncDateFilterPreferenceService SHALL exposer une constante `SYNC_DATE_FILTER_LABELS` associant chaque SyncDateFilterOption à son libellé français affiché à l'utilisateur.

---

### Requirement 2 : Résolution du filtre de date

**User Story :** En tant que système, je veux convertir une SyncDateFilterOption en DateFilter concret, afin de pouvoir filtrer les données SQLite lors de la synchronisation.

#### Acceptance Criteria

1. WHEN `resolveDateFilter` est appelé avec une SyncDateFilterOption valide, THE SyncDateFilterPreferenceService SHALL retourner un DateFilter dont `endDate` est égal à la date du jour au format `YYYY-MM-DD`.
2. WHEN `resolveDateFilter` est appelé avec l'option `'today'`, THE SyncDateFilterPreferenceService SHALL retourner un DateFilter dont `startDate` est égal à `endDate`.
3. WHEN `resolveDateFilter` est appelé avec l'option `'2days'`, THE SyncDateFilterPreferenceService SHALL retourner un DateFilter dont `startDate` est la date d'il y a 1 jour (J-1).
4. WHEN `resolveDateFilter` est appelé avec l'option `'3days'`, THE SyncDateFilterPreferenceService SHALL retourner un DateFilter dont `startDate` est la date d'il y a 2 jours (J-2).
5. WHEN `resolveDateFilter` est appelé avec l'option `'week'`, THE SyncDateFilterPreferenceService SHALL retourner un DateFilter dont `startDate` est la date d'il y a 6 jours (J-6).
6. WHEN `resolveDateFilter` est appelé avec l'option `'2weeks'`, THE SyncDateFilterPreferenceService SHALL retourner un DateFilter dont `startDate` est la date d'il y a 14 jours (J-14).
7. WHEN `resolveDateFilter` est appelé avec l'option `'month'`, THE SyncDateFilterPreferenceService SHALL retourner un DateFilter dont `startDate` est la date d'il y a 29 jours (J-29).
8. FOR ALL SyncDateFilterOption valides, THE SyncDateFilterPreferenceService SHALL retourner un DateFilter dont `startDate` est inférieur ou égal à `endDate`.

---

### Requirement 3 : Persistance de la préférence via Ionic Storage

**User Story :** En tant qu'utilisateur, je veux que ma préférence de filtre de date soit sauvegardée localement, afin de la retrouver à chaque redémarrage de l'application.

#### Acceptance Criteria

1. WHEN `saveFilter` est appelé avec une SyncDateFilterOption valide, THE SyncDateFilterPreferenceService SHALL persister la valeur dans Ionic Storage sous la clé `'sync_date_filter'`.
2. WHEN `loadFilter` est appelé et qu'une valeur est présente dans Ionic Storage, THE SyncDateFilterPreferenceService SHALL retourner la SyncDateFilterOption persistée.
3. WHEN `loadFilter` est appelé et qu'aucune valeur n'est présente dans Ionic Storage, THE SyncDateFilterPreferenceService SHALL retourner la valeur par défaut `'today'`.
4. IF une erreur survient lors de la lecture d'Ionic Storage, THEN THE SyncDateFilterPreferenceService SHALL logger l'erreur en console et retourner la valeur par défaut `'today'`.

---

### Requirement 4 : État NgRx des préférences

**User Story :** En tant que développeur, je veux un slice NgRx dédié aux préférences utilisateur, afin de centraliser et réactiver l'accès à la préférence de filtre de date dans toute l'application.

#### Acceptance Criteria

1. THE PreferencesStore SHALL maintenir un état contenant `syncDateFilter` de type SyncDateFilterOption et un booléen `loaded`.
2. WHEN l'action `loadSyncDateFilterPreferenceSuccess` est dispatchée avec un filtre, THE PreferencesStore SHALL mettre à jour `syncDateFilter` avec la valeur reçue et passer `loaded` à `true`.
3. WHEN l'action `setSyncDateFilterSuccess` est dispatchée avec un filtre, THE PreferencesStore SHALL mettre à jour `syncDateFilter` avec la nouvelle valeur.
4. THE PreferencesStore SHALL exposer un sélecteur `selectSyncDateFilter` retournant la valeur courante de `syncDateFilter`.
5. WHILE `loaded` est `false`, THE PreferencesStore SHALL retourner `'today'` comme valeur de `selectSyncDateFilter`.

---

### Requirement 5 : Chargement de la préférence au démarrage

**User Story :** En tant qu'utilisateur, je veux que ma préférence de filtre de date soit chargée automatiquement au démarrage de l'application, afin qu'elle soit disponible dès la première synchronisation.

#### Acceptance Criteria

1. WHEN l'application démarre, THE SyncEffects SHALL dispatcher l'action `loadSyncDateFilterPreference`.
2. WHEN l'action `loadSyncDateFilterPreference` est dispatchée, THE SyncEffects SHALL appeler `SyncDateFilterPreferenceService.loadFilter()` et dispatcher `loadSyncDateFilterPreferenceSuccess` avec la valeur retournée.
3. IF `SyncDateFilterPreferenceService.loadFilter()` échoue, THEN THE SyncEffects SHALL dispatcher `loadSyncDateFilterPreferenceSuccess` avec la valeur par défaut `'today'`.

---

### Requirement 6 : Interface utilisateur de sélection du filtre

**User Story :** En tant qu'utilisateur, je veux pouvoir sélectionner ma préférence de filtre de date depuis la page de paramètres, afin de contrôler la plage de données synchronisées.

#### Acceptance Criteria

1. THE MorePage SHALL afficher un composant `ion-select` dans la section "Synchronisation" présentant les six options de SyncDateFilterOption avec leurs libellés français.
2. WHEN l'utilisateur sélectionne une option dans le `ion-select`, THE MorePage SHALL dispatcher l'action `setSyncDateFilter` avec la valeur sélectionnée.
3. WHEN la MorePage s'initialise, THE MorePage SHALL lire la valeur courante de `selectSyncDateFilter` depuis le PreferencesStore et l'afficher comme valeur sélectionnée dans le `ion-select`.
4. WHEN l'action `setSyncDateFilter` est dispatchée, THE SyncEffects SHALL appeler `SyncDateFilterPreferenceService.saveFilter()` avec la nouvelle valeur et dispatcher `setSyncDateFilterSuccess`.

---

### Requirement 7 : Propagation du filtre lors de la synchronisation automatique

**User Story :** En tant que système, je veux que le filtre de date configuré soit utilisé lors de chaque synchronisation automatique, afin de ne synchroniser que les données de la plage sélectionnée.

#### Acceptance Criteria

1. WHEN l'action `startAutomaticSync` est dispatchée, THE SyncEffects SHALL lire la valeur courante de `selectSyncDateFilter` depuis le PreferencesStore via `withLatestFrom`.
2. WHEN THE SyncEffects déclenche la synchronisation, THE SyncEffects SHALL appeler `SyncDateFilterPreferenceService.resolveDateFilter()` avec la SyncDateFilterOption courante pour obtenir un DateFilter.
3. WHEN `synchronizeAllData` est appelé, THE SyncMasterService SHALL accepter un paramètre `dateFilter` optionnel de type DateFilter et le propager à chaque appel de `syncAll` des services de domaine.
4. WHEN `syncAll` est appelé avec un DateFilter, THE BaseSyncService SHALL passer le DateFilter à `fetchUnsynced` lors de chaque itération de batch.
5. WHEN `fetchUnsynced` est appelé avec un DateFilter, THE BaseSyncService SHALL passer le DateFilter au repository via `findUnsynced`.

---

### Requirement 8 : Filtrage SQL par date dans les repositories

**User Story :** En tant que système, je veux que les repositories SQLite filtrent les enregistrements non synchronisés par plage de dates, afin de réduire le volume de données chargées en mémoire.

#### Acceptance Criteria

1. WHEN `findUnsynced` est appelé avec un DateFilter, THE BaseRepository SHALL ajouter une condition SQL `AND created_at >= :startDate AND created_at <= :endDate` à la clause WHERE de la requête.
2. WHEN `findUnsynced` est appelé sans DateFilter, THE BaseRepository SHALL exécuter la requête sans condition de date, préservant le comportement existant.
3. WHEN un service de domaine ne supporte pas le filtre de date (colonne `created_at` absente), THE BaseSyncService SHALL ignorer le paramètre `dateFilter` sans erreur.

---

### Requirement 9 : Valeur par défaut et rétrocompatibilité

**User Story :** En tant qu'utilisateur existant, je veux que l'application continue de fonctionner comme avant si aucune préférence n'a été configurée, afin de ne pas être impacté par la mise à jour.

#### Acceptance Criteria

1. WHEN aucune préférence n'est persistée dans Ionic Storage, THE SyncMasterService SHALL synchroniser uniquement les données du jour, identique au comportement antérieur.
2. WHEN `synchronizeAllData` est appelé sans paramètre `dateFilter`, THE SyncMasterService SHALL se comporter comme si le filtre `'today'` était appliqué.
3. THE BaseSyncService SHALL accepter un `dateFilter` optionnel dans `syncAll` et `fetchUnsynced` sans modifier le comportement des services de domaine qui ne passent pas ce paramètre.
