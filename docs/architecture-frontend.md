# Frontend Architecture

## Executive Summary
The Frontend is an Angular web application designed for administrative users to manage the ELYKIA platform. It provides dashboards, reporting, and management interfaces.

## Technology Stack
*   **Framework:** Angular 14
*   **Language:** TypeScript
*   **UI Library:** Angular Material
*   **Charts:** ApexCharts, Chart.js
*   **State Management:** RxJS (Services-based state)

## Architecture Pattern
**Component-Based Architecture**
*   **Modules:** Feature-based modules (Auth, BI, Tontine, etc.) loaded lazily.
*   **Components:** UI building blocks.
*   **Services:** Data fetching and business logic, shared across components.
*   **Guards:** Route protection (AuthGuard).

## Key Modules
*   **Auth:** Login and user management.
*   **BI:** Dashboards and reports.
*   **Tontine:** Tontine administration.
*   **Stock:** Inventory tracking.
*   **Shared:** Reusable components and pipes.

## UI/UX Design
*   **Design System:** Material Design.
*   **Layout:** Responsive sidebar navigation with header.
*   **Feedback:** Toastr notifications, SweetAlert2 dialogs.
