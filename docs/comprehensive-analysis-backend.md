# Comprehensive Analysis - Backend

## Codebase Statistics
*   **Framework:** Spring Boot 3.3.0
*   **Language:** Java 17
*   **Build System:** Maven
*   **Database:** PostgreSQL

## Key Patterns & Practices

### Architecture
The project follows a standard **Controller-Service-Repository** layered architecture.
*   **Controllers** are thin, handling HTTP concerns and delegating to Services.
*   **Services** contain the business logic and transaction boundaries (`@Transactional`).
*   **Repositories** extend `JpaRepository` for standard CRUD operations.
*   **DTOs** are used for API contracts, mapped to Entities using **MapStruct**.

### Business Logic Highlights
*   **Accounting Cycle:** Strict enforcement of "Accounting Day" and "Cash Desk" states. Operations are blocked if the day or desk is closed.
*   **Stock Flow:** Distinct separation between "Warehouse Stock" and "Commercial Stock". Transfers require validation (Request -> Validate -> Transfer).
*   **Tontine Lifecycle:** Managed via Sessions (Feb-Nov) and Delivery (Dec).

### Security
*   **Spring Security** is used for authentication and authorization.
*   **JWT** is the token format for stateless authentication.
*   `@PreAuthorize` annotations control access to specific endpoints based on roles (MANAGER, COMMERCIAL, STOREKEEPER).

### Error Handling
*   Global exception handling via `@ControllerAdvice`.
*   Standardized `Response` object structure (`ResponseUtil`) for consistent API responses (success/error).

### Reporting
*   **PDF Generation:** Uses iText / Flying Saucer for generating reports (receipts, contracts, daily reports).
*   **Excel Export:** Uses Apache POI for data exports.

### Scheduling
*   Scheduled tasks (via `@Scheduled`) handle periodic jobs like daily reporting, status updates, and performance calculation.

### Database
*   **Flyway** ensures consistent database schema across environments.
*   **JPA/Hibernate** manages data access, with some native queries for complex reporting.
