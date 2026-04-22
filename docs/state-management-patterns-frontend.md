# State Management Patterns - Frontend

## Overview
The Angular frontend primarily uses **Service-based State Management** with RxJS `BehaviorSubject`s. It does not use a heavy global store library like NgRx, opting for a simpler, modular approach suitable for administrative dashboards.

## Pattern Description

### 1. Service-as-Store
Feature modules (e.g., Tontine, Stock) have dedicated services that hold the state for that domain.
*   **Data Source:** Services fetch data from the API.
*   **State Holder:** `BehaviorSubject<T>` holds the current value.
*   **Stream:** Components subscribe to the `Observable` derived from the Subject.

### 2. Component State
*   **Smart Components (Pages):** Subscribe to services, handle routing parameters, and manage high-level logic.
*   **Dumb Components (UI):** Receive data via `@Input()` and emit events via `@Output()`. They are stateless regarding business logic.

### 3. Authentication State
*   `AuthService` manages the user's login state and JWT token.
*   `UserSubject` (BehaviorSubject) broadcasts the current user profile to the app.
*   `AuthGuard` checks this state to protect routes.

### 4. Form State
*   **Reactive Forms:** Used extensively for complex inputs (Order creation, Member registration).
*   Form validation logic is encapsulated within the component or custom validators.

## Key Services
*   `AuthService`: User session management.
*   `TontineService`: State for active session and member lists.
*   `StockService`: Inventory levels and movement logs.
*   `BiService`: Dashboard data caching.
