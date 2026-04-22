# Comprehensive Analysis - Mobile

## Codebase Statistics
*   **Framework:** Ionic 8, Angular 20
*   **Runtime:** Capacitor 7
*   **Language:** TypeScript
*   **Local DB:** SQLite

## Key Patterns & Practices

### Offline-First Architecture
The app is designed for field agents who may not have internet access.
*   **Local Database:** SQLite stores the entire relevant dataset (Clients, Members, Products).
*   **Sync Engine:** A robust synchronization mechanism handles:
    *   **Push:** Sending collected money (Mises) and Orders to the server.
    *   **Pull:** Updating the local database with new clients or stock changes from the server.

### Business Logic Enforcement
*   **Cash Desk Check:** The app prevents operations if the agent's cash desk is not open.
*   **Geolocation:** Captures GPS coordinates during client registration and transactions.
*   **Bluetooth Printing:** Integrates with thermal printers to provide physical receipts for Tontine collections.

### Performance Optimization
*   **Virtual Scroll:** Used for the Tontine Member list (which can be large) to ensure smooth scrolling.
*   **OnPush Strategy:** Minimizes change detection cycles.

### Native Integration
*   **Camera:** For client photos.
*   **Geolocation:** For tagging transactions.
*   **Bluetooth:** For receipt printing.
*   **Filesystem:** For storing PDF receipts.

### Security
*   **Secure Storage:** Tokens are stored securely.
*   **Data Privacy:** Local data is only accessible by the app.
