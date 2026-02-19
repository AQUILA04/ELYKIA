# Plan d'Implémentation - Phase 3 Part 2: Order Store

## Objectif
Implémenter la pagination et les vues natives pour le module `Order` (Commandes), en créant un nouveau `OrderStore` dédié si nécessaire ou en étendant l'existant, tout en préservant la compatibilité avec le code existant.

## Stratégie
Implementation parallèle et non-destructive. Les méthodes existantes du `OrderService` (qui utilisent directement `DatabaseService`) resteront intactes. Nous ajouterons de nouvelles méthodes paginées qui utiliseront une nouvelle extension de repository.

## Étapes Détaillées

### 1. Modèle de Vue (OrderView)
- **Fichier**: `src/app/models/order-view.model.ts`
- **Contenu**: Interface étendant `Order` avec des champs aplatis du client (`clientName`, `clientQuarter`, `clientPhone`, etc.) et des compteurs d'articles si nécessaire.

### 2. Extension du Repository (OrderRepositoryExtensions)
- **Fichier**: `src/app/core/repositories/order.repository.extensions.ts`
- **Responsabilité**: Exécuter des requêtes SQL natives optimisées.
- **Méthodes**:
    - `findViewsByCommercialPaginated(commercialId, page, size, filters)`:
        - `LEFT JOIN` avec la table `clients`.
        - Filtrage par `commercialId` (sécurité).
        - Filtrage dynamique (`status`, `date`, `clientId`, `quarter`, `isLocal`, `isSync`).
        - Pagination `LIMIT` / `OFFSET`.

### 3. Création du Store (OrderStore)
Si le store n'existe pas encore, il sera créé de zéro.

- **Répertoire**: `src/app/store/order/`
- **Actions (`order.actions.ts`)**:
    - `loadFirstPageOrders`: Charge la première page avec remise à zéro.
    - `loadNextPageOrders`: Charge la page suivante (infinite scroll).
    - `resetOrderPagination`: Réinitialise l'état.
- **Reducer (`order.reducer.ts`)**:
    - État `OrderState` contenant `pagination: PaginationState<OrderView>`.
    - Gestionnaires pour les actions de pagination.
- **Selectors (`order.selectors.ts`)**:
    - `selectPaginatedOrders`: La liste des commandes chargées.
    - `selectOrderPaginationLoading`: État de chargement.
    - `selectOrderPaginationTotalItems`: Nombre total d'éléments.
- **Effects (`order.effects.ts`)**:
    - `loadFirstPageOrders$`: Appelle `OrderService.getOrdersPaginated`.
    - `loadNextPageOrders$`: Appelle `OrderService.getOrdersPaginated` avec `currentPage + 1`.

### 4. Mise à jour du Service (OrderService)
- **Fichier**: `src/app/core/services/order.service.ts`
- **Modifications**:
    - Injecter `OrderRepositoryExtensions`.
    - Ajouter la méthode `getOrdersPaginated(page, size, filters)`.
    - **Ne pas toucher** aux méthodes existantes (`createOrder`, `getOrders`, etc.) sauf pour ajouter `@deprecated` sur les méthodes de liste complètes si elles sont remplacées par la pagination dans l'UI.

### 5. Enregistrement du Store
- **Fichier**: `src/app/app.module.ts` (ou module principal)
- **Action**: Importer `StoreModule.forFeature('order', ...)` et `EffectsModule.forFeature([OrderEffects])`.
