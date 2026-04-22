# Product Requirements Document (PRD) - Frontend

## 1. Introduction
The ELYKIA Frontend is the administrative command center. It provides specific interfaces for Managers, Storekeepers, and Secretaries to execute their daily tasks within the AMENOUVEVE-YAVEH business rules, focusing on Credit Sales and Tontine management.

## 2. Goals & Objectives
*   **Control:** Give Managers full control over the daily accounting cycle and credit validation.
*   **Visibility:** Provide real-time dashboards for financial status, credit portfolio health, and stock levels.
*   **Workflow:** Streamline the multi-step validation process for credit sales (Manager Validation -> Storekeeper Delivery).
*   **Accuracy:** Minimize data entry errors through validation and clear UI feedback.

## 3. Functional Requirements

### 3.1. Credit Sales Management (Core)
*   **Dashboard:** View active credits, delayed payments, and total outstanding amount.
*   **Validation Interface:** Managers can review pending credit applications and Approve/Reject them.
*   **Repayment Tracking:** View detailed history of daily repayments for any client.
*   **Merging:** Interface to merge multiple credits.

### 3.2. Logistics Interface (Storekeeper)
*   **Stock Release (Sortie):** View "Validated" credits waiting for delivery.
*   **Action:** "Start" the credit by confirming physical handover of goods (changes status to In Progress).
*   **Inventory:** View stock levels and alerts (Low Stock).
*   **Entries:** Record supplier deliveries.

### 3.3. Manager Dashboard
*   **KPIs:** Total Recouvrement, Total Sorties, Active Caisses.
*   **Accounting Day:** Interface to Open/Close the global day.
*   **Cash Desk Monitoring:** Real-time list of open cash desks.

### 3.4. Tontine Administration
*   **Members:** Manage tontine participants.
*   **Collections:** View and correct daily collection entries.
*   **End-of-Cycle:** Manage the conversion of savings into product deliveries.

### 3.5. Commercial Management
*   **Clients:** CRUD operations for clients with geolocation data.
*   **Performance:** View sales performance per commercial.

### 3.6. Reporting
*   **Daily Report:** View the generated PDF report for the day.
*   **Gap Analysis:** Visual indicators (Green/Red) for cash discrepancies.

## 4. Non-Functional Requirements
*   **Compatibility:** Modern browsers.
*   **Responsiveness:** Desktop optimized, tablet compatible.
*   **Security:** Auto-logout, Role-based menu visibility.

## 5. Technical Constraints
*   **Framework:** Angular 14+.
*   **UI Lib:** Angular Material.
