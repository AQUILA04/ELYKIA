# UI Component Inventory - Frontend

## Overview
The frontend is built using **Angular 14** and **Angular Material**. It follows a modular structure where components are grouped by feature.

## Core Layout Components
*   `LayoutComponent`: Main shell of the application.
*   `HeaderComponent`: Top navigation bar, user profile, notifications.
*   `SidebarComponent`: Main navigation menu.
*   `FooterComponent`: Application footer.

## Shared Components (`src/app/shared/components`)
*   `ConfirmDialogComponent`: Reusable confirmation modal.
*   `LoaderComponent`: Global loading spinner.
*   `PaginationComponent`: Custom pagination control.
*   `FilterComponent`: Generic list filtering input.
*   `ExportButtonComponent`: Standardized button for Excel/PDF exports.

## Feature Components

### BI Dashboard (`src/app/bi`)
*   `DashboardOverviewComponent`: Main KPI view.
*   `SalesChartComponent`: Visualization of sales trends.
*   `CollectionChartComponent`: Tontine collection performance.
*   `StockLevelComponent`: Inventory status indicators.

### Tontine (`src/app/tontine`)
*   `MemberListComponent`: Data table of tontine members.
*   `MemberDetailComponent`: Detailed view of a member.
*   `CollectionFormComponent`: Input form for recording payments.
*   `SessionManagerComponent`: Controls for opening/closing sessions.

### Orders (`src/app/orders`)
*   `OrderListComponent`: List of customer orders.
*   `OrderCreateComponent`: Wizard for creating new orders.
*   `OrderDetailComponent`: View order status and items.

### Stock (`src/app/stock`)
*   `InventoryListComponent`: Current stock levels.
*   `StockMovementComponent`: Log of stock in/out.
*   `StockRequestComponent`: Form for requesting replenishment.

## Design System
*   **Library:** Angular Material (MatTable, MatInput, MatSelect, MatCard, MatDialog).
*   **Icons:** Material Icons & FontAwesome.
*   **Theming:** Custom SCSS theme based on ELYKIA brand colors.
