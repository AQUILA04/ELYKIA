# State Management Patterns - Mobile

## Overview
The mobile app requires robust state management to handle **offline capabilities**. It uses **NgRx** (Redux pattern) to manage application state predictably.

## Pattern Description

### 1. NgRx Store
*   **Single Source of Truth:** The entire app state is stored in a single object tree.
*   **Slices:**
    *   `auth`: User token and profile.
    *   `tontine`: Members, sessions, and local collections.
    *   `orders`: Product catalog, cart, and order history.
    *   `sync`: Queue of offline actions waiting to be pushed.

### 2. Offline-First Strategy
*   **Actions:** User actions (e.g., `[Collection] Add Payment`) dispatch NgRx actions.
*   **Reducers:** Update the local state immediately (Optimistic UI).
*   **Effects:**
    1.  Intercept the action.
    2.  Save the change to **SQLite** (Local Persistence).
    3.  If online, attempt API call.
    4.  If offline, add to `SyncQueue` in SQLite.

### 3. Synchronization
*   **Sync Service:** Monitors network status.
*   **Push:** When online, iterates through `SyncQueue` and sends requests to Backend.
*   **Pull:** Periodically fetches updated data (deltas) from Backend to update SQLite and Store.

### 4. Selectors
*   Components select data from the Store using memoized selectors.
*   This ensures UI updates only when relevant data changes.

## Key Stores
*   `AuthStore`: Login status.
*   `DataStore`: Core business data (Members, Products).
*   `SyncStore`: Status of synchronization tasks.
