# Plan d'Implémentation 13 : Refactoring du Rapport Journalier et Finalisation du Store Tontine

## Contexte
L'optimisation des performances continue avec le refactoring de la page `RapportJournalierPage` et la finalisation du store Tontine. L'objectif est de réduire l'empreinte mémoire lors de l'affichage du rapport journalier en utilisant le *lazy loading* pour les listes, tout en conservant la capacité de générer un PDF complet. De plus, la pagination pour les collectes et livraisons Tontine doit être implémentée dans le Store pour compléter la migration vers l'architecture de données native.

## Objectifs

1.  **Optimisation de l'UI du Rapport Journalier** : Remplacer le chargement complet des listes par un chargement à la demande (lazy loading) via `cdk-virtual-scroll`.
2.  **Gestion de la Génération PDF** : Implémenter une stratégie dédiée pour le PDF qui charge temporairement toutes les données nécessaires puis libère la mémoire immédiatement après.
3.  **Finalisation du Tontine Store** : Ajouter le support de la pagination pour les collectes et les livraisons (Actions, Reducers, Effects, Selectors).

## Étapes d'Implémentation

### 1. Finalisation du Store Tontine (Pagination)

#### Modifications du Repository (`core/repositories/`)
-   **TontineCollectionRepositoryExtensions** : Vérifier/Implémenter `findViewsByCommercialPaginated`.
-   **TontineDeliveryRepositoryExtensions** : Vérifier/Implémenter `findViewsByCommercialPaginated`.

#### Store Tontine (`store/tontine/`)
-   **Actions (`tontine.actions.ts`)** :
    -   Ajouter `loadFirstPageTontineCollections`, `loadNextPageTontineCollections`, `resetTontineCollectionPagination`.
    -   Ajouter `loadFirstPageTontineDeliveries`, `loadNextPageTontineDeliveries`, `resetTontineDeliveryPagination`.
-   **Reducer (`tontine.reducer.ts`)** :
    -   Ajouter `collectionPagination: PaginationState<TontineCollectionView>`.
    -   Ajouter `deliveryPagination: PaginationState<TontineDeliveryView>`.
    -   Gérer les actions de pagination associées.
-   **Effects (`tontine.effects.ts`)** :
    -   Implémenter les effects pour charger les pages via `TontineService`.
-   **Selectors (`tontine.selectors.ts`)** :
    -   Ajouter les sélecteurs pour les listes paginées (`selectPaginatedTontineCollections`, `selectPaginatedTontineDeliveries`, etc.).

#### Service (`core/services/tontine.service.ts`)
-   Ajouter les méthodes `getTontineCollectionsPaginated` et `getTontineDeliveriesPaginated`.

### 2. Refactoring de la Page Rapport Journalier

#### Service (`rapport-journalier.service.ts`)
-   **Nouvelle Méthode** : `getAllDailyReportData(dateFilter)`
    -   Cette méthode sera dédiée EXCLUSIVEMENT à la génération du PDF.
    -   Elle récupérera toutes les données (Distributions, Recouvrements, Clients, Tontine) sans pagination pour une période donnée.
    -   L'objectif est d'isoler ce chargement lourd pour qu'il ne se produise qu'au moment du clic sur "Imprimer/PDF" ou lors de la synchro automatique.

#### Composant (`rapport-journalier.page.ts`)
-   **Suppression du chargement eager** : Ne plus charger les listes complètes dans `ionViewWillEnter` via le service actuel pour l'affichage.
-   **Intégration des Stores** :
    -   Connecter les listes (Distributions, Recouvrements, Nouveaux Clients) aux sélecteurs de pagination des stores respectifs.
    -   Utiliser `cdk-virtual-scroll-viewport` pour l'affichage des listes dans les onglets.
    -   Implémenter le défilement infini (`ion-infinite-scroll`) pour charger les pages suivantes.
-   **Génération PDF** :
    -   Appeler `rapportJournalierService.getAllDailyReportData` uniquement lors de la demande de PDF.
    -   Générer le HTML, créer le PDF, puis laisser le Garbage Collector nettoyer les données reçues (scope local de la fonction).

### 3. KPI et Résumés

-   Les cartes de résumé (KPI) en haut de page continueront d'utiliser le `KpiStore` (déjà implémenté et optimisé).
-   S'assurer que les totaux affichés dans les headers des onglets correspondent aux données paginées (via `totalItems` du state de pagination).

## Plan de Validation

1.  **Vérification Tontine** :
    -   Les listes de collectes et livraisons se chargent correctement par pages.
    -   Les filtres (date, quartier) fonctionnent.
2.  **Vérification Rapport Journalier** :
    -   L'ouverture de la page est rapide (pas de chargement de listes lourdes).
    -   Le scroll dans les onglets est fluide.
    -   Les données se chargent au fur et à mesure.
3.  **Validation PDF** :
    -   Le PDF généré contient bien TOUTES les données de la journée, pas seulement la première page chargée à l'écran.
    -   Pas de crash mémoire (OOM) lors de la génération.
