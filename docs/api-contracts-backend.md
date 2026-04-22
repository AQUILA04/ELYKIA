# API Contracts - Backend

## Overview
The Backend API is built with Spring Boot and exposes RESTful endpoints. All API endpoints are prefixed with `/api/v1`.

## Authentication
*   **Mechanism:** JWT (JSON Web Token)
*   **Header:** `Authorization: Bearer <token>`

## Controller Catalog

### 1. Credit Management (Core Activity) (`/api/v1/credits`)
Manages the primary business activity: Credit Sales (30-day term).
*   `POST /` - Create a new credit application (Sale).
*   `GET /` - List all credits (supports filtering).
*   `GET /{id}` - Get detailed credit information.
*   `PATCH /validate/{creditId}` - Manager validates a credit application.
*   `PATCH /start/{creditId}` - Storekeeper confirms delivery (starts the 30-day cycle).
*   `POST /daily-stake` - Record a daily repayment (Mise).
*   `GET /by-commercial/{collector}` - List active credits for a specific agent.
*   `GET /sorties/by-commercial/{collector}` - List approved credits waiting for stock release.
*   `GET /history` - View settled/closed credits.
*   `POST /merge` - Merge multiple credits into one.

### 2. Tontine Management (Secondary Activity) (`/api/v1/tontines`)
Manages the savings cycle (Feb-Nov) and end-of-year delivery.
*   `GET /sessions/current` - Get active session.
*   `POST /members` - Register new member.
*   `POST /collections` - Record daily payment (Mise).
*   `GET /stock` - View tontine-specific stock.

### 3. Commercial & Orders (`/api/v1/orders`)
*   `POST /orders` - Create new commercial order.
*   `GET /orders` - List orders with status.

### 4. Stock & Logistics (`/api/v1/inventory`, `/api/v1/stock-requests`)
Manages physical inventory and transfers.
*   `GET /inventory` - Current stock levels.
*   `POST /inventory/entries` - Record stock arrival (Magasinier).
*   `POST /stock-requests` - Commercial requests stock from warehouse.
*   `PUT /stock-requests/{id}/validate` - Approve stock transfer.

### 5. Financial & Accounting (`/api/v1/accounting-day`, `/api/v1/cash-desk`)
Enforces the strict daily accounting cycle.
*   `POST /accounting-day/open` - Open global accounting day (Manager).
*   `POST /accounting-day/close` - Close global accounting day.
*   `POST /cash-desk/open` - Open commercial's individual cash desk.
*   `POST /cash-desk/close` - Close cash desk and validate balance.
*   `POST /cash-desk/billetage` - Record physical cash count.

### 6. BI & Reporting (`/api/v1/bi/dashboard`, `/api/v1/reports`)
Provides data for decision making.
*   `GET /bi/dashboard/overview` - Global KPIs (Sales, Collections).
*   `GET /bi/dashboard/sales/metrics` - Detailed sales analysis.
*   `GET /reports/daily` - Generate daily activity report (PDF).
*   `GET /reports/commercial` - Performance report per agent.

### 7. Administration (`/api/v1/users`, `/api/v1/articles`, `/api/v1/localities`)
System configuration.
*   `GET /articles` - Product catalog.
*   `POST /articles` - Add new product.
*   `GET /localities` - Geographic zones.
*   `GET /users` - Manage system users and roles.

### 8. Mobile Sync (`/api/v1/mobile`)
Dedicated endpoints for offline-first mobile app.
*   `POST /sync` - Push offline data (Collections, Orders, Clients).
*   `GET /config` - Pull latest configuration (Articles, Users).
