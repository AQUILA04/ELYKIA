# Deployment Guide

## Infrastructure Overview
The ELYKIA application is containerized using Docker and orchestrated via Docker Compose for local/staging environments.

## Docker Configuration

### Backend
*   **Dockerfile:** `backend/Dockerfile`
*   **Base Image:** `eclipse-temurin:17-jdk-alpine`
*   **Exposed Port:** 8080

### Frontend
*   **Dockerfile:** `frontend/Dockerfile`
*   **Base Image:** `nginx:alpine`
*   **Exposed Port:** 80

### Mobile
*   Mobile apps are built as native binaries (APK/AAB for Android, IPA for iOS) and distributed via app stores or direct installation.

## Deployment Steps (Docker Compose)

1.  **Build and Start Services:**
    ```bash
    docker-compose up -d --build
    ```

2.  **Verify Services:**
    *   Backend: `http://localhost:8080/api/v1/actuator/health`
    *   Frontend: `http://localhost:80`

## CI/CD Pipeline
*   **GitHub Actions:** `.github/workflows/` (if present) handles automated testing and building.
