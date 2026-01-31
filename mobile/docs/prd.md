# Product Requirements Document (PRD) - Mobile

## 1. Introduction
The ELYKIA Mobile App is the primary tool for the "Commercial" (Field Agent). It empowers them to operate autonomously in the field, managing their client portfolio, making Credit Sales, and collecting Tontine savings, regardless of network connectivity.

## 2. Goals & Objectives
*   **Autonomy:** Allow agents to work 100% offline during their route.
*   **Speed:** Optimize the UI for rapid data entry (e.g., quick collection recording).
*   **Trust:** Provide immediate physical receipts (Bluetooth print) to clients.
*   **Accountability:** Enforce cash desk opening/closing and track GPS location.

## 3. Functional Requirements

### 3.1. Credit Sales (Core Activity)
*   **New Sale:** Create a credit application (Sale) for a client.
    *   Select Client -> Select Articles -> Set Daily Repayment Amount.
*   **Repayment Collection:** Record daily "Mise" for existing credits.
*   **Portfolio:** View list of active credits and their status (Days remaining, Amount due).

### 3.2. Tontine Operations (Secondary Activity)
*   **Member List:** Fast search and filter of assigned members.
*   **Collection:** Quick entry of "Mise" amount.
*   **Receipt:** Auto-print receipt via Bluetooth thermal printer.
*   **History:** View recent collections for a member.

### 3.3. Daily Routine
*   **Cash Desk:** Agent must open their "Caisse" at start of day and close it at end.
*   **Sync:** One-tap synchronization to pull latest data and push transactions.

### 3.4. Commercial Operations
*   **Client Registration:** Create new clients with Photo and GPS location.
*   **Stock Request:** Request replenishment from the warehouse.
*   **Mobile Stock:** View current inventory in the agent's possession.

### 3.5. Dashboard
*   **KPIs:** Daily Collection Total, Sales Total.
*   **Alerts:** Notification of sync errors or required actions.

## 4. Non-Functional Requirements
*   **Platform:** Android (Primary).
*   **Offline:** Full functionality without network.
*   **Battery:** Optimized for all-day use.
*   **Storage:** Efficient SQLite usage for large datasets.

## 5. Technical Constraints
*   **Framework:** Ionic / Capacitor.
*   **Database:** SQLite.
*   **Hardware:** Bluetooth Thermal Printer support.
