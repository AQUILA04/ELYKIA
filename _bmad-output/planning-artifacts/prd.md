---
stepsCompleted:
  - step-01-init
inputDocuments:
  - C:/Users/kahonsu/Documents/GitHub/ELYKIA/docs/pagination-mobile-offline-kpi-decoupling_47e1ef48.plan.md
workflowType: 'prd'
---

# Product Requirements Document - ELYKIA

**Author:** Francis
**Date:** 2026-01-28T11:56:13.323Z

## 1. Introduction & Goal

### 1.1 Project Overview
The ELYKIA mobile application requires a significant architectural update to handle large datasets efficiently in an offline-first environment. The current implementation loads entire lists into memory, which impacts performance and scalability. This project aims to implement database-level pagination and decouple Key Performance Indicators (KPIs) from list length to improve performance and maintainability.

### 1.2 Primary Goal
Implement real database-side pagination (SQLite) with a page size of 20 for heavy lists in the mobile app, adapt infinite/virtual scrolling to load data progressively, and decouple all KPIs from in-memory list sizes using direct SQL queries and a dedicated KPI store.

### 1.3 Key Constraints & Principles
- **Offline-First:** All pagination and KPI calculations must work against the local SQLite database.
- **Repository Pattern:** Prioritize using and updating `mobile/src/app/core/repositories` to lighten the `DatabaseService`.
- **Progressive Migration:** Migrate screen by screen to avoid breaking existing functionality.
- **Performance:** Ensure smooth scrolling and quick KPI loading even with large datasets.

## 2. Technical Requirements

### 2.1 Pagination Infrastructure
- **Constant:** Define `DEFAULT_PAGE_SIZE = 20`.
- **Repositories:** Update `ClientRepository`, `DistributionRepository`, `RecoveryRepository`, `OrderRepository`, `TontineMemberRepository`, and `ArticleRepository` to support:
  - `findAllPaginated(page, size, filters)`
  - `count(filters)`
  - Use `LIMIT` and `OFFSET` in SQL queries.
- **DatabaseService:** Add support methods only if strictly necessary for repositories, aiming to move logic to repositories.

### 2.2 State Management (NgRx/NgxStore)
- **Generic Model:** Create a shared pagination state model (`currentPage`, `pageSize`, `items`, `totalItems`, `hasMore`, `loading`).
- **Store Updates:** Extend existing stores (clients, recoveries, distributions, articles, tontine, orders) to handle pagination actions (`loadFirstPage`, `loadNextPage`).
- **KPI Store:** Create a dedicated `KpiStore` for aggregated data (counts, sums) to avoid loading lists for stats.

### 2.3 UI Adaptation
- **Infinite Scroll:** Update `ion-infinite-scroll` and `cdk-virtual-scroll` implementations to trigger `loadNextPage` actions.
- **KPI Display:** Connect UI components displaying stats (totals, amounts) to the `KpiStore` selectors instead of derived list values.

## 3. Migration Plan

### 3.1 Phase 1: Core & Stores
- Implement pagination logic in Repositories.
- Create `KpiStore` and update existing stores with pagination support.

### 3.2 Phase 2: Screen Migration
- Migrate screens one by one:
  - Clients Page
  - Recovery List
  - Distributions List
  - Article List
  - Tontine Dashboard & Details
  - Order List

### 3.3 Phase 3: Cleanup
- Remove deprecated non-paginated methods from `DatabaseService` and Repositories once all usages are migrated.
