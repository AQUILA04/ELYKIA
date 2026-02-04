# Project Overview: ELYKIA

## Executive Summary
ELYKIA is a comprehensive platform for managing tontines, credits, and commercial operations. It consists of a robust backend service, a web-based administration frontend, and a mobile application for field agents. The system is designed to handle complex financial transactions, inventory management, and offline data collection.

## Technology Stack Summary

| Component | Type | Framework | Language | Key Tech |
| :--- | :--- | :--- | :--- | :--- |
| **Backend** | Service | Spring Boot 3.3 | Java 17 | PostgreSQL, Flyway, Maven |
| **Frontend** | Web | Angular 14 | TypeScript | Angular Material, ApexCharts |
| **Mobile** | Mobile | Ionic 8, Angular 20 | TypeScript | Capacitor 7, SQLite, NgRx |

## Architecture Classification
**Monorepo / Multi-part Architecture**
The project is organized as a monorepo containing three distinct but integrated parts:
1.  **Backend:** The central source of truth and business logic.
2.  **Frontend:** The administrative interface for managers.
3.  **Mobile:** The tool for field agents operating in disconnected environments.

## Repository Structure
```
ELYKIA/
├── backend/   # Spring Boot API
├── frontend/  # Angular Web App
├── mobile/    # Ionic Mobile App
└── docs/      # Project Documentation
```

## Key Documentation Links
*   [Source Tree Analysis](./source-tree-analysis.md)
*   [Integration Architecture](./integration-architecture.md)
*   [Backend Architecture](./architecture-backend.md)
*   [Frontend Architecture](./architecture-frontend.md)
*   [Mobile Architecture](./architecture-mobile.md)
