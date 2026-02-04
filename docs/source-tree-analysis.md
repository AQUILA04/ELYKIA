# Source Tree Analysis

## Project Structure Overview

The ELYKIA project is a monorepo containing three distinct parts:

1.  **Backend**: A Spring Boot application providing the core API and business logic.
2.  **Frontend**: An Angular web application for administrative and management tasks.
3.  **Mobile**: An Ionic/Angular mobile application for field operations.

## Directory Tree

```
ELYKIA/
├── backend/                                # Backend Service (Spring Boot)
│   ├── src/main/java/com/optimize/elykia/core/
│   │   ├── config/                         # Configuration classes (Security, Swagger, etc.)
│   │   ├── controller/                     # REST API Controllers (Entry Points)
│   │   ├── dto/                            # Data Transfer Objects
│   │   ├── entity/                         # JPA Entities (Database Models)
│   │   ├── enumaration/                    # Enums
│   │   ├── event/                          # Event definitions
│   │   ├── listener/                       # Event listeners
│   │   ├── mapper/                         # MapStruct mappers
│   │   ├── repository/                     # Spring Data JPA Repositories
│   │   ├── scheduler/                      # Scheduled tasks
│   │   ├── service/                        # Business Logic Services
│   │   └── util/                           # Utility classes
│   ├── src/main/resources/                 # Application resources
│   │   ├── db/migration/                   # Flyway migration scripts
│   │   └── application.yml                 # Main configuration file
│   ├── docs/                               # Backend-specific documentation
│   ├── pom.xml                             # Maven build configuration
│   └── Dockerfile                          # Docker container definition
│
├── frontend/                               # Web Frontend (Angular)
│   ├── src/app/
│   │   ├── auth/                           # Authentication module
│   │   ├── bi/                             # Business Intelligence module
│   │   ├── tontine/                        # Tontine management module
│   │   ├── orders/                         # Order management module
│   │   ├── stock/                          # Stock management module
│   │   ├── client/                         # Client management module
│   │   ├── layout/                         # Layout components (Header, Sidebar)
│   │   ├── shared/                         # Shared components and services
│   │   ├── core/                           # Core services and guards
│   │   └── app.module.ts                   # Root module
│   ├── docs/                               # Frontend-specific documentation
│   ├── angular.json                        # Angular CLI configuration
│   └── package.json                        # NPM dependencies
│
├── mobile/                                 # Mobile App (Ionic/Angular)
│   ├── src/app/
│   │   ├── core/                           # Core services (API, Auth, Storage)
│   │   ├── features/                       # Feature modules
│   │   │   ├── auth/                       # Login/Register
│   │   │   ├── sync/                       # Offline synchronization
│   │   │   ├── tontine/                    # Tontine operations
│   │   │   ├── orders/                     # Order taking
│   │   │   └── clients/                    # Client management
│   │   ├── shared/                         # Shared UI components
│   │   └── app.module.ts                   # Root module
│   ├── global-docs/                        # Mobile-specific documentation
│   ├── capacitor.config.ts                 # Capacitor configuration
│   ├── ionic.config.json                   # Ionic configuration
│   └── package.json                        # NPM dependencies
│
├── docs/                                   # Generated Project Documentation
└── docker-compose.yml                      # Orchestration for local development
```

## Critical Directories & Entry Points

### Backend (`backend/`)
*   **Entry Point:** `src/main/java/com/optimize/elykia/core/OptimizeElykiaCoreApplication.java`
*   **API Controllers:** `src/main/java/com/optimize/elykia/core/controller/` - Contains all 35+ REST endpoints.
*   **Business Logic:** `src/main/java/com/optimize/elykia/core/service/` - Core business rules.
*   **Data Models:** `src/main/java/com/optimize/elykia/core/entity/` - Database schema definitions.

### Frontend (`frontend/`)
*   **Entry Point:** `src/main.ts` -> `src/app/app.module.ts`
*   **Routing:** `src/app/app-routing.module.ts` - Defines navigation structure.
*   **Modules:** `src/app/*/` - Feature-based organization (BI, Tontine, Orders, etc.).

### Mobile (`mobile/`)
*   **Entry Point:** `src/main.ts` -> `src/app/app.module.ts`
*   **Offline Sync:** `src/app/features/sync/` - Critical for field operations.
*   **Local Storage:** Uses SQLite via Capacitor for offline data persistence.

## Integration Points

*   **Frontend -> Backend:** REST API calls via Angular `HttpClient`.
*   **Mobile -> Backend:** REST API calls with offline synchronization logic.
*   **Database:** PostgreSQL accessed by Backend via JPA/Hibernate.
