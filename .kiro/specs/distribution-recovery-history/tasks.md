# Tasks: Distribution Recovery History

## Implementation Tasks

- [x] 1. Étendre RecoveryRepositoryExtensions avec le filtre distributionId
  - [x] 1.1 Ajouter `distributionId?: string` à l'interface `RecoveryRepositoryFilters`
  - [x] 1.2 Ajouter la condition SQL `r.distributionId = ?` dans `findViewsByCommercialPaginated` quand le filtre est présent

- [x] 2. Ajouter les actions NgRx dédiées à la pagination par distribution
  - [x] 2.1 Ajouter `loadFirstPageDistributionRecoveries` et son Success/Failure dans le fichier d'actions recovery
  - [x] 2.2 Ajouter `loadNextPageDistributionRecoveries` et son Success/Failure
  - [x] 2.3 Ajouter `resetDistributionRecoveryPagination`

- [x] 3. Étendre le reducer et l'état NgRx
  - [x] 3.1 Ajouter l'interface `DistributionRecoveryPaginationState` et l'initialiser dans `RecoveryState`
  - [x] 3.2 Implémenter les cas reducer pour les 7 nouvelles actions

- [x] 4. Ajouter les selectors
  - [x] 4.1 Ajouter `selectDistributionRecoveryPagination`, `selectDistributionRecoveryItems`, `selectDistributionRecoveryHasMore`, `selectDistributionRecoveryLoading`, `selectDistributionRecoveryTotalItems`

- [-] 5. Ajouter les effets NgRx
  - [x] 5.1 Implémenter `loadFirstPageDistributionRecoveries$` dans `RecoveryEffects`
  - [ ] 5.2 Implémenter `loadNextPageDistributionRecoveries$` dans `RecoveryEffects`

- [x] 6. Créer le composant DistributionRecoveryHistoryComponent
  - [x] 6.1 Créer le fichier TypeScript du composant standalone avec `@Input() distributionId` et `@Input() distributionReference`
  - [x] 6.2 Implémenter `ngOnInit` (dispatch loadFirstPage), `loadMore`, `openRecoveryDetail`, `trackByRecoveryId`, `ngOnDestroy` (dispatch reset)
  - [x] 6.3 Créer le template HTML avec la liste, le badge sync/local, l'infinite scroll, les états vide/erreur/chargement
  - [x] 6.4 Créer le fichier SCSS du composant

- [x] 7. Intégrer le composant dans DistributionDetailComponent
  - [x] 7.1 Ajouter `DistributionRecoveryHistoryComponent` dans les `imports` du composant
  - [x] 7.2 Ajouter le tag `<app-distribution-recovery-history>` dans le template HTML après les boutons d'action
