# Plan d'implémentation : sync-date-filter-preference

## Vue d'ensemble

Implémentation du filtre de date de synchronisation en TypeScript/Angular/NgRx. Les tâches suivent l'ordre des dépendances : modèle → service → store NgRx → modifications des services existants → UI → câblage final.

## Tâches

- [ ] 1. Créer le modèle de données `sync-date-filter.model.ts`
  - Créer `mobile/src/app/models/sync-date-filter.model.ts`
  - Définir le type union `SyncDateFilterOption` avec les six valeurs : `'today'`, `'2days'`, `'3days'`, `'week'`, `'2weeks'`, `'month'`
  - Définir l'interface `DateFilter` avec `startDate: string` et `endDate: string` (format `YYYY-MM-DD`)
  - Exporter la constante `SYNC_DATE_FILTER_LABELS: Record<SyncDateFilterOption, string>` avec les libellés français
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Créer `SyncDateFilterPreferenceService`
  - [ ] 2.1 Implémenter le service `mobile/src/app/core/services/sync-date-filter-preference.service.ts`
    - Injecter `Storage` d'Ionic Storage
    - Implémenter `saveFilter(filter: SyncDateFilterOption): Promise<void>` — persiste sous la clé `'sync_date_filter'`
    - Implémenter `loadFilter(): Promise<SyncDateFilterOption>` — retourne `'today'` si absent ou en cas d'erreur (avec log console)
    - Implémenter `resolveDateFilter(option: SyncDateFilterOption): DateFilter` — calcul pur des dates selon le tableau : `today`→J-0, `2days`→J-1, `3days`→J-2, `week`→J-6, `2weeks`→J-14, `month`→J-29
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4_

  - [ ]* 2.2 Écrire le test de propriété pour `resolveDateFilter` — Property 1
    - **Property 1 : DateFilter toujours valide (invariant de structure)**
    - Pour toute `SyncDateFilterOption` valide, vérifier que `startDate` et `endDate` sont au format `YYYY-MM-DD` et que `startDate <= endDate`
    - **Validates: Requirements 1.2, 2.1, 2.8**

  - [ ]* 2.3 Écrire le test de propriété pour `resolveDateFilter` — Property 2
    - **Property 2 : Calcul correct de `startDate` selon l'option**
    - Pour chaque option, vérifier que `startDate` correspond exactement au décalage défini (0, 1, 2, 6, 14, 29 jours) et que `endDate` est la date du jour
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

- [ ] 3. Créer le slice NgRx `preferences`
  - [ ] 3.1 Créer `mobile/src/app/store/preferences/preferences.actions.ts`
    - Définir `loadSyncDateFilterPreference`
    - Définir `loadSyncDateFilterPreferenceSuccess({ filter: SyncDateFilterOption })`
    - Définir `setSyncDateFilter({ filter: SyncDateFilterOption })`
    - Définir `setSyncDateFilterSuccess({ filter: SyncDateFilterOption })`
    - _Requirements: 4.1, 5.1, 5.2, 6.2, 6.4_

  - [ ] 3.2 Créer `mobile/src/app/store/preferences/preferences.reducer.ts`
    - Définir `PreferencesState` avec `syncDateFilter: SyncDateFilterOption` (défaut `'today'`) et `loaded: boolean` (défaut `false`)
    - Gérer `loadSyncDateFilterPreferenceSuccess` : mettre à jour `syncDateFilter` et passer `loaded` à `true`
    - Gérer `setSyncDateFilterSuccess` : mettre à jour `syncDateFilter`
    - Exporter `preferencesReducer`
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [ ] 3.3 Créer `mobile/src/app/store/preferences/preferences.selectors.ts`
    - Définir `selectPreferencesState` depuis `AppState`
    - Définir `selectSyncDateFilter` retournant `syncDateFilter` (valeur par défaut `'today'` si `loaded` est `false`)
    - _Requirements: 4.4, 4.5_

  - [ ] 3.4 Créer `mobile/src/app/store/preferences/preferences.effects.ts`
    - Injecter `SyncDateFilterPreferenceService`
    - Effect `loadSyncDateFilterPreference$` : écoute `loadSyncDateFilterPreference`, appelle `loadFilter()`, dispatche `loadSyncDateFilterPreferenceSuccess` (fallback `'today'` en cas d'erreur)
    - Effect `setSyncDateFilter$` : écoute `setSyncDateFilter`, appelle `saveFilter()`, dispatche `setSyncDateFilterSuccess`
    - _Requirements: 5.2, 5.3, 6.4_

  - [ ]* 3.5 Écrire les tests unitaires du reducer `preferences`
    - Tester `loadSyncDateFilterPreferenceSuccess` : `syncDateFilter` mis à jour, `loaded` à `true`
    - Tester `setSyncDateFilterSuccess` : `syncDateFilter` mis à jour
    - Tester l'état initial : `syncDateFilter === 'today'`, `loaded === false`
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 4. Enregistrer le slice `preferences` dans l'application
  - [ ] 4.1 Modifier `mobile/src/app/store/app.state.ts`
    - Importer `PreferencesState` depuis `./preferences/preferences.reducer`
    - Ajouter `preferences: PreferencesState | undefined` à l'interface `AppState`
    - _Requirements: 4.1_

  - [ ] 4.2 Modifier `mobile/src/app/app.module.ts`
    - Importer `preferencesReducer` et `PreferencesEffects`
    - Ajouter `preferences: preferencesReducer` dans `StoreModule.forRoot({...})`
    - Ajouter `PreferencesEffects` dans `EffectsModule.forRoot([...])`
    - _Requirements: 4.1, 5.2, 6.4_

- [ ] 5. Modifier `BaseRepository.findUnsynced` pour supporter le filtre de date
  - Modifier `mobile/src/app/core/repositories/base.repository.ts`
  - Ajouter le paramètre optionnel `dateFilter?: DateFilter` à la signature de `findUnsynced`
  - Si `dateFilter` est fourni, étendre la clause SQL WHERE avec `AND created_at >= ? AND created_at <= ?` et ajouter `dateFilter.startDate` et `dateFilter.endDate` aux paramètres
  - Si `dateFilter` est absent, conserver le comportement existant sans condition de date
  - _Requirements: 8.1, 8.2_

- [ ] 6. Modifier `BaseSyncService` pour propager le filtre de date
  - Modifier `mobile/src/app/core/services/sync/base-sync.service.ts`
  - Ajouter `dateFilter?: DateFilter` comme second paramètre optionnel de `syncAll(batchSize?: number, dateFilter?: DateFilter)`
  - Modifier `syncBatch` pour accepter et passer `dateFilter` à `fetchUnsynced`
  - Modifier `fetchUnsynced(limit: number, dateFilter?: DateFilter)` pour passer `dateFilter` à `repository.findUnsynced`
  - _Requirements: 7.4, 7.5, 8.3, 9.3_

- [ ] 7. Modifier `SyncMasterService.synchronizeAllData` pour accepter et propager le filtre
  - Modifier `mobile/src/app/core/services/sync-master.service.ts`
  - Ajouter `dateFilter?: DateFilter` comme paramètre optionnel de `synchronizeAllData`
  - Passer `dateFilter` à chaque appel `xxxSyncService.syncAll(batchSize, dateFilter)` pour les services qui supportent le filtre : `clientSyncService`, `distributionSyncService`, `recoverySyncService`, `tontineMemberSyncService`, `tontineCollectionSyncService`, `tontineDeliverySyncService`
  - Ne pas passer `dateFilter` à `localitySyncService` et `accountSyncService` (pas de colonne `created_at`)
  - _Requirements: 7.3, 9.2_

- [ ] 8. Checkpoint — Vérifier la chaîne de propagation du filtre
  - S'assurer que tous les tests passent, vérifier que la signature de `findUnsynced` est cohérente dans `BaseRepository` et ses sous-classes qui la surchargent.
  - Demander à l'utilisateur si des questions se posent avant de continuer.

- [ ] 9. Modifier `SyncEffects` pour lire le filtre depuis le store et le résoudre
  - Modifier `mobile/src/app/store/sync/sync.effects.ts`
  - Injecter `SyncDateFilterPreferenceService` dans le constructeur
  - Modifier `startAutomaticSync$` : ajouter `withLatestFrom(this.store.select(selectSyncDateFilter))` dans le pipe
  - Dans le `switchMap`, résoudre le `DateFilter` via `this.prefService.resolveDateFilter(filterOption)` et passer `dateFilter` à `this.syncMasterService.synchronizeAllData(dateFilter)`
  - Dispatcher `loadSyncDateFilterPreference` au démarrage de l'app (dans un effect `init$` ou via `APP_INITIALIZER` dans les effects)
  - _Requirements: 5.1, 7.1, 7.2_

- [ ] 10. Ajouter l'UI de sélection du filtre dans `MorePage`
  - [ ] 10.1 Modifier `mobile/src/app/tabs/more/more.page.ts`
    - Importer `selectSyncDateFilter` et l'action `setSyncDateFilter`
    - Importer `SyncDateFilterOption` et `SYNC_DATE_FILTER_LABELS`
    - Ajouter la propriété `syncDateFilter: SyncDateFilterOption = 'today'`
    - Exposer `SYNC_DATE_FILTER_LABELS` pour le template
    - Dans `ngOnInit`, s'abonner à `store.select(selectSyncDateFilter)` pour initialiser `syncDateFilter`
    - Implémenter `onSyncDateFilterChange()` : dispatcher `setSyncDateFilter({ filter: this.syncDateFilter })`
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 10.2 Modifier `mobile/src/app/tabs/more/more.page.html`
    - Ajouter un `ion-item` avec `ion-icon name="calendar-outline"` dans la section "Synchronisation"
    - Ajouter un `ion-label` avec titre "Filtre de date de synchronisation" et sous-titre "Données à synchroniser"
    - Ajouter `ion-select [(ngModel)]="syncDateFilter" (ionChange)="onSyncDateFilterChange()"` avec les six `ion-select-option` et leurs libellés français
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 11. Checkpoint final — S'assurer que tous les tests passent
  - Vérifier la cohérence de bout en bout : sélection UI → dispatch → store → persistance → résolution → synchronisation filtrée.
  - S'assurer que tous les tests passent, demander à l'utilisateur si des questions se posent.

## Notes

- Les tâches marquées `*` sont optionnelles et peuvent être ignorées pour un MVP rapide
- Le langage d'implémentation est TypeScript (Angular 17+ / Ionic / NgRx)
- `resolveDateFilter` est un calcul pur sans I/O — idéal pour les tests de propriétés
- `localitySyncService` et `accountSyncService` ne reçoivent pas `dateFilter` (pas de colonne `created_at` dans leurs tables)
- Les sous-classes de `BaseRepository` qui surchargent `findUnsynced` (ex: `ClientRepository`, `DistributionRepository`) doivent également mettre à jour leur signature pour accepter `dateFilter?`
