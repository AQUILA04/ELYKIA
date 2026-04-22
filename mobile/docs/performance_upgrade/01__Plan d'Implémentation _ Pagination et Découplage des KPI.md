# Plan d'Implémentation : Pagination et Découplage des KPI

## Introduction

Ce document présente le plan d'implémentation détaillé pour la refonte de l'architecture de l'application mobile ELYKIA. L'objectif principal est d'introduire une pagination côté base de données locale (SQLite) et de découpler les indicateurs de performance clés (KPI) de la taille des listes chargées en mémoire. Cette initiative vise à améliorer significativement les performances, la scalabilité et la maintenabilité de l'application, en particulier dans un contexte d'utilisation hors ligne avec de grands volumes de données.

Le plan s'articule en quatre phases principales, conçues pour une migration progressive et contrôlée, minimisant les risques de régression.

---

## Phase 1 : Mise en Place de l'Infrastructure de Base

Cette phase initiale consiste à construire les fondations techniques nécessaires pour la pagination et la gestion des KPI. Elle est cruciale et doit être complétée avant d'entamer la migration des fonctionnalités existantes.

| Tâche | Description | Objectifs Clés |
|---|---|---|
| **1.1** | **Logique de Pagination dans les Repositories** | - Introduire une constante `DEFAULT_PAGE_SIZE = 20`.
- Ajouter les méthodes `findAllPaginated(page, size, filters)` et `count(filters)` dans les repositories concernés (`ClientRepository`, `DistributionRepository`, etc.).
- Implémenter la logique `LIMIT` / `OFFSET` dans les requêtes SQL sous-jacentes. |
| **1.2** | **Modèle d'État de Pagination Générique** | - Définir une interface TypeScript partagée pour l'état de pagination (`currentPage`, `pageSize`, `items`, `totalItems`, `hasMore`, `loading`).
- Assurer la réutilisabilité de ce modèle dans tous les stores NgRx. |
| **1.3** | **Création du Store KPI Dédié** | - Mettre en place un nouveau `KpiStore` (NgRx) distinct des stores de listes.
- Ce store ne contiendra que des données agrégées (comptages, sommes, etc.).
- Créer les actions, effects et selectors pour charger et exposer les KPI depuis les méthodes `count()` des repositories. |

---

## Phase 2 : Intégration dans les Stores et Migration des KPI

Une fois l'infrastructure en place, cette phase se concentre sur l'intégration de la logique de pagination dans les stores existants et la migration de tous les calculs de KPI pour utiliser le nouveau store dédié.

| Tâche | Description | Objectifs Clés |
|---|---|---|
| **2.1** | **Extension des Stores de Fonctionnalités** | - Pour chaque store existant (clients, recoveries, distributions, etc.), intégrer le modèle d'état de pagination.
- Ajouter les actions de pagination (`loadFirstPage`, `loadNextPage`, `resetPagination`).
- Adapter les effects pour appeler les nouvelles méthodes paginées des repositories. |
| **2.2** | **Migration des Calculs de KPI** | - Identifier toutes les occurrences où les KPI sont calculés à partir de `list.length` ou `filter().length`.
- Remplacer ces calculs par des sélections depuis le `KpiStore`.
- Assurer que les écrans (`dashboard.page.ts`, `rapport-journalier.service.ts`, etc.) dépendent exclusivement du `KpiStore` pour les statistiques. |

---

## Phase 3 : Migration des Écrans de l'Interface Utilisateur

Cette phase est la plus visible pour l'utilisateur final. Elle consiste à adapter chaque écran de liste pour qu'il consomme les données de manière paginée. La migration se fera écran par écran pour maîtriser l'impact.

| Tâche | Description | Objectifs Clés |
|---|---|---|
| **3.1** | **Migration de la Liste des Clients** | - Connecter le `cdk-virtual-scroll-viewport` aux données paginées du `ClientStore`.
- Implémenter le déclenchement de l'action `loadNextPage` au scroll. |
| **3.2** | **Migration de la Liste des Recouvrements** | - Adapter le `recovery-list.component.ts` pour utiliser le `RecoveryStore` paginé.
- Connecter les statistiques de l'en-tête au `KpiStore`. |
| **3.3** | **Migration de la Liste des Distributions** | - Remplacer la logique de slicing manuelle par un `ion-infinite-scroll` connecté au `DistributionStore` paginé.
- Lier les statistiques au `KpiStore`. |
| **3.4** | **Migration des Autres Listes Principales** | - Appliquer le même pattern de migration pour les écrans : `Article List`, `Tontine Dashboard`, `Order List`.
- Pour chaque écran, s'assurer que le scroll infini charge les pages suivantes et que les KPI proviennent du `KpiStore`. |
| **3.5** | **Revue des Listes Secondaires** | - Évaluer les listes moins critiques (`Localities`, `Recovery Client List`) et appliquer la pagination si le volume de données le justifie. |

---

## Phase 4 : Nettoyage et Finalisation

La dernière phase consiste à nettoyer le code, à effectuer des tests de performance et à s'assurer de la robustesse de la nouvelle architecture.

| Tâche | Description | Objectifs Clés |
|---|---|---|
| **4.1** | **Suppression du Code Obsolète** | - Une fois tous les écrans migrés, identifier et supprimer les anciennes méthodes non paginées (`findAll`, etc.) dans les repositories et le `DatabaseService`.
- Marquer les anciennes méthodes comme `@deprecated` pendant la phase de transition. |
| **4.2** | **Tests de Performance et d'UX** | - Effectuer des tests sur des appareils avec de très grandes bases de données locales.
- Valider la fluidité du scroll, la réactivité de l'interface et l'exactitude des KPI affichés.
- Vérifier le comportement en mode hors ligne. |
| **4.3** | **Validation Finale** | - Confirmer que tous les objectifs du PRD sont atteints.
- Documenter la nouvelle architecture de pagination et de gestion des KPI. |
