# Comprehensive Analysis - Frontend

## Codebase Statistics
*   **Framework:** Angular 14
*   **Language:** TypeScript
*   **UI Library:** Angular Material

## Key Patterns & Practices

### Modular Architecture
The application is structured into **Feature Modules** (Lazy Loaded) corresponding to business domains:
*   `AccountingDayModule`: For managing the daily cycle (Open/Close).
*   `TontineModule`: Member management and collections.
*   `CommercialModule`: Sales, Credits, and Clients.
*   `StockModule`: Inventory and Logistics.
*   `ReportModule`: Visualization of daily reports.

### Role-Based UI
The interface adapts dynamically based on the logged-in user's role (Manager, Storekeeper, Secretary).
*   **Manager:** Sees Dashboard, Accounting Day, Reports, User Admin.
*   **Storekeeper:** Sees Inventory, Stock Requests, Deliveries.
*   **Secretary:** Sees Client Management, Tontine encoding.

### Workflow Integration
The UI guides users through specific business workflows:
*   **Sale Validation:** Visual indicators (Check/Play buttons) guide the transition from Validation to Delivery.
*   **Cash Desk:** Prompts for "Billetage" (cash count) before allowing closure.

### HTTP Communication
*   **Interceptors:**
    *   `AuthInterceptor`: Adds Bearer token.
    *   `ErrorInterceptor`: Global error handling.
*   **Services:** Encapsulate `HttpClient` calls.

### UI/UX
*   **Responsive:** Uses FlexLayout.
*   **Feedback:** Loading spinners (`ngx-spinner`) and Toasts (`ngx-toastr`).
*   **Dialogs:** Uses `MatDialog` for complex forms (e.g., creating a client, validating a sale).
