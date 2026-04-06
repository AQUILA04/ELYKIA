# Plan d'Implémentation - Phase 4: Migration des KPI du Dashboard

## Objectif
Optimiser le chargement du Dashboard en découplant le calcul des KPI du chargement des listes complètes. Actuellement, le Dashboard charge toutes les distributions, recouvrements, etc. pour calculer des sommes en mémoire, ce qui est inefficace et lent avec beaucoup de données.

## Stratégie
Utiliser des requêtes SQL agrégées (`SUM`, `COUNT`) via les Repository Extensions et stocker ces statistiques dans une partie dédiée du State Redux (`stats`).

## Étapes d'Implémentation

### 1. Repository Extensions (Couche Data)
Ajout de méthodes optimisées pour les calculs.

#### [DistributionRepositoryExtensions]
- `getTotalRemainingAmountByCommercial(commercialId, filters)`
- `getTotalDailyPaymentAmountByCommercial(commercialId)`

#### [RecoveryRepositoryExtensions]
- `getTotalRecoveryAmountByCommercial(commercialId, filters)`

#### [TontineCollectionRepositoryExtensions]
- `getTotalCollectionAmountByCommercial(commercialId, filters)`

#### [CommercialStockRepository]
- `getTotalStockValueByCommercial(commercialId)` (Nouveau calcul basé sur `quantityRemaining * creditSalePrice`)

### 2. Store Updates (Couche State)
Pour chaque feature (`Distribution`, `Recovery`, `Tontine`, `CommercialStock`), nous allons :
- Ajouter une interface `StatsState` dans le reducer.
- Ajouter des actions : `loadStats`, `loadStatsSuccess`, `loadStatsFailure`.
- Ajouter des effects pour appeler les repositories.
- Ajouter des selectors pour exposer les stats.

### 3. UI Update (Dashboard)
- Remplacer les appels `loadDistributions`, `loadRecoveries`, etc. par `loadDistributionStats`, `loadRecoveryStats`.
- Remplacer les calculs en JS par l'utilisation des selectors de stats.
- Conserver le graphique "Tendances" (si nécessaire) en utilisant une endpoint optimisée ou en acceptant de charger une petite partie des données (ex: 7 derniers jours uniquement).

## Détail des Modifications Techniques

### Distribution Store
**Actions:**
```typescript
loadDistributionDashboardStats({ commercialUsername })
loadDistributionDashboardStatsSuccess({ stats: { totalSales: number, totalRemaining: number } })
```

### Recovery Store
**Actions:**
```typescript
loadRecoveryDashboardStats({ commercialUsername })
loadRecoveryDashboardStatsSuccess({ stats: { totalCollected: number } })
```

### Stock Store
**Actions:**
```typescript
loadStockDashboardStats({ commercialUsername })
loadStockDashboardStatsSuccess({ stats: { totalStockValue: number } })
```

### DashboardPage
Refactoring complet de `loadDashboardData` pour n'appeler que les actions de stats.
