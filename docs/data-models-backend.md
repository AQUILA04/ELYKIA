# Data Models - Backend

## Overview
The backend uses PostgreSQL with Hibernate/JPA for object-relational mapping.

## Core Entities

### Tontine Management
*   **Tontine:** Represents a tontine cycle.
*   **TontineSession:** A specific session within a tontine cycle.
*   **TontineMember:** A participant in a tontine.
*   **TontineCollection:** A payment record for a member in a session.
*   **TontineStock:** Stock allocated to tontine operations.
*   **TontineDelivery:** Record of goods delivered to tontine members.

### Commercial & Sales
*   **Order:** A customer order.
*   **OrderItem:** Line items within an order.
*   **ClientAccountMovement:** Financial movements for a client.
*   **CommercialPerformance:** Performance metrics for sales agents.
*   **DailyCommercialReport:** Daily activity report for agents.

### Inventory
*   **Articles:** Product definitions.
*   **ArticleType:** Categories of articles.
*   **Inventory:** Stock levels.
*   **StockMovement:** Log of stock changes (in/out).
*   **StockRequest:** Requests for stock replenishment.
*   **StockReturn:** Returns of stock to warehouse.

### Organization
*   **Agency:** Organizational unit/branch.
*   **Promoter:** Sales promoter/agent.
*   **Locality:** Geographic location.

### Finance
*   **Credit:** Credit facility details.
*   **Expense:** Operational expenses.
*   **CashDeposit:** Cash deposits to bank/safe.
*   **DailyAccounting:** Daily financial reconciliation.

## Schema Migration
Database changes are managed via Flyway migration scripts located in `src/main/resources/db/migration/`.
