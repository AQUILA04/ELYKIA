# UI Component Inventory - Mobile

## Overview
The mobile app is built with **Ionic 8** and **Angular 20**. It uses Ionic's UI components which adapt to the platform (iOS/Android).

## Core Layout
*   `TabsPage`: Main navigation controller (Home, Tontine, Orders, Profile).
*   `AppMenu`: Side menu (if applicable).

## Shared Components (`src/app/shared/components`)
*   `HeaderComponent`: Standard page header with back button/title.
*   `EmptyStateComponent`: Placeholder when lists are empty.
*   `SyncStatusComponent`: Indicator of offline/online/syncing status.
*   `LoadingOverlayComponent`: Blocker during heavy operations.

## Feature Components

### Tontine (`src/app/features/tontine`)
*   `MemberListComponent`: Virtual scroll list of members (optimized for performance).
*   `CollectionModalComponent`: Modal for entering payment details.
*   `MemberCardComponent`: Summary card for a member.

### Orders (`src/app/features/orders`)
*   `ProductCatalogComponent`: Grid view of available products.
*   `CartComponent`: Shopping cart view.
*   `OrderSummaryComponent`: Final review before submission.

### Sync (`src/app/features/sync`)
*   `SyncDashboardComponent`: View pending items and sync history.
*   `ConflictResolverComponent`: UI for handling sync conflicts (if implemented).

### Clients (`src/app/features/clients`)
*   `ClientRegistrationFormComponent`: Multi-step form for new clients.
*   `ClientDetailComponent`: View client history and info.

## Design System
*   **Library:** Ionic Framework Components (`ion-content`, `ion-list`, `ion-card`, `ion-modal`).
*   **Icons:** Ionicons.
*   **Theming:** Ionic CSS Variables for dynamic theming (Light/Dark mode support).
