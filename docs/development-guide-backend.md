# Backend Development Guide

## Prerequisites
*   **Java:** JDK 17
*   **Maven:** 3.8+
*   **Database:** PostgreSQL 14+
*   **Docker:** (Optional) for containerized development

## Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/AQUILA04/ELYKIA.git
    cd ELYKIA/backend
    ```

2.  **Configure Database:**
    *   Create a PostgreSQL database named `oec_v2`.
    *   Update `src/main/resources/application.yml` with your credentials.

3.  **Build the project:**
    ```bash
    ./mvnw clean install
    ```

## Running the Application

*   **Using Maven:**
    ```bash
    ./mvnw spring-boot:run
    ```
*   **Using Docker:**
    ```bash
    docker-compose up -d backend
    ```

## Testing

*   **Run Unit Tests:**
    ```bash
    ./mvnw test
    ```

## Database Migrations
The project uses **Flyway** for database migrations.
*   Migration scripts are located in `src/main/resources/db/migration/`.
*   Migrations run automatically on application startup.
