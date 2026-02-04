# Backend Architecture

## Executive Summary
The Backend is a Spring Boot application serving as the core of the ELYKIA platform. It exposes a RESTful API for the Frontend and Mobile clients and manages data persistence in PostgreSQL.

## Technology Stack
*   **Framework:** Spring Boot 3.3.0
*   **Language:** Java 17
*   **Build Tool:** Maven
*   **Database:** PostgreSQL
*   **Migration:** Flyway
*   **Security:** Spring Security (JWT)
*   **Documentation:** SpringDoc OpenAPI (Swagger)

## Architecture Pattern
**Layered Architecture (Service-Repository Pattern)**
*   **Controller Layer:** Handles HTTP requests and responses.
*   **Service Layer:** Contains business logic and transaction management.
*   **Repository Layer:** Interfaces with the database using Spring Data JPA.
*   **Entity Layer:** Represents database tables.
*   **DTO Layer:** Data Transfer Objects for API communication.

## Key Modules
*   **Core:** General application logic.
*   **Security:** Authentication and authorization.
*   **Tontine:** Management of tontine cycles, sessions, and members.
*   **BI:** Business Intelligence and reporting.
*   **Stock:** Inventory management.

## Data Architecture
*   **Database:** Relational (PostgreSQL).
*   **ORM:** Hibernate (via Spring Data JPA).
*   **Schema Management:** Versioned migrations with Flyway.

## API Design
*   **Style:** RESTful
*   **Format:** JSON
*   **Documentation:** Swagger UI available at `/swagger-ui.html` (when running).
