# Product Requirements Document (PRD) - Backend

## 1. Introduction
The ELYKIA Backend is the core service powering the ELYKIA platform. It enforces the business rules for the AMENOUVEVE-YAVEH organization, managing its two main activities: **Credit Sales (Core)** and **Tontine Savings (Secondary)**.

## 2. Goals & Objectives
*   **Financial Integrity:** Enforce a strict daily accounting cycle (Open/Close Day, Open/Close Cash Desk) to prevent fraud and errors.
*   **Stock Control:** Track inventory movement from Warehouse to Commercial to Client with validation steps.
*   **Operational Efficiency:** Support high-volume transaction processing for daily credit repayments and tontine collections.
*   **Hybrid Access:** Serve both the Web Admin (Managers) and Mobile App (Field Agents).

## 3. Functional Requirements

### 3.1. Credit Sales Management (Core Activity)
*   **Credit Application:** Create new credit requests (Sales) with a 30-day repayment term.
*   **Validation Workflow:**
    1.  **Created:** Commercial enters the sale.
    2.  **Validated:** Manager reviews and approves the creditworthiness.
    3.  **Started (Delivered):** Storekeeper releases the stock, triggering the 30-day countdown.
*   **Repayment:** Track daily "Mise" (repayments) against the schedule.
*   **Recovery:** Monitor delayed payments and manage recovery actions.
*   **Merging:** Ability to merge multiple credits for a single client.

### 3.2. Tontine Management (Secondary Activity)
*   **Cycle:** Manage the Feb-Nov savings cycle and Dec delivery.
*   **Collection:** Record daily "Mise" (payment) per member.
*   **Delivery:** Convert saved balance into selected articles at cycle end.

### 3.3. Accounting Cycle
*   **Global Day:** Manager must open the "Accounting Day" before any operations can occur.
*   **Cash Desk:** Commercials must open their individual "Cash Desk" to transact.
*   **Closure:** End-of-day closure requires "Billetage" (cash count) and reconciliation of System vs. Real amounts.

### 3.4. Logistics
*   **Procurement:** Record entries into the main warehouse.
*   **Distribution:** Manage stock requests from commercials and validate transfers.
*   **Inventory:** Real-time visibility of stock per location (Warehouse vs. Commercial).

### 3.5. Reporting
*   **Daily Report:** Auto-generated summary of all collections, sales, and expenses.
*   **Gap Analysis:** Highlight discrepancies between system totals and physical cash.

## 4. Non-Functional Requirements
*   **Security:** Role-Based Access Control (RBAC), JWT Authentication.
*   **Performance:** API response time < 200ms.
*   **Audit:** Full transaction logging for all financial and stock movements.

## 5. Technical Constraints
*   **Stack:** Java 17, Spring Boot 3.x.
*   **Database:** PostgreSQL.
*   **Deployment:** Docker containers.
