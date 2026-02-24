# Test Design Architecture: ELYKIA Project

**Version**: 1.0
**Date**: 2026-01-28
**Scope**: System-Level Test Design (Backend & Mobile)

---

## 1. Executive Summary

ELYKIA is a complex financial platform involving a Java Spring Boot backend and an Ionic/Angular mobile application with offline-first capabilities. The architecture presents significant testability challenges, primarily around the synchronization logic between mobile and backend, and the dependence on native device features. This document outlines the architectural concerns and requirements to ensure comprehensive test coverage.

**Risk Summary**:
- **Critical Risk**: Offline synchronization data integrity (Mobile <-> Backend).
- **High Risk**: Mobile native feature dependencies (Camera, Geolocation, SQLite).
- **Medium Risk**: Backend complex business logic (Tontine, Credit calculations).

---

## 2. Quick Guide

### 🚨 BLOCKERS (Action Required Immediately)
- **B-001: Mobile Native Mocks**: No standardized mocking strategy for Capacitor plugins (Camera, Geolocation) -> Blocks automated component testing of mobile features.
- **B-002: Test Data Seeding**: Lack of API endpoints or scripts to seed backend database with complex Tontine scenarios -> Blocks parallel E2E testing.

### ⚠️ HIGH PRIORITY (Address in Sprint 0)
- **H-001: Offline State Simulation**: Need a reliable way to simulate network conditions (offline/online/flaky) in E2E tests.
- **H-002: SQLite Test Fixtures**: Mobile unit/integration tests require an in-memory or mocked SQLite database that matches production schema.

### 📋 INFO ONLY
- **I-001**: Backend uses H2 for tests, which is good, but ensure Flyway migrations run consistently in test profile.

---

## 3. Risk Assessment

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R-001** | DATA | **Data Sync Conflicts**: Offline data sync overwrites or duplicates records on backend. | 3 (Likely) | 3 (Critical) | **9** | Implement robust conflict resolution tests & idempotent API design. |
| **R-002** | TECH | **Native Plugin Flakiness**: Tests fail due to unstable native mocks or device variations. | 3 (Likely) | 2 (Degraded) | **6** | Standardize Capacitor mocks; Use physical device cloud for critical paths. |
| **R-003** | SEC | **Offline Data Security**: Sensitive data stored in SQLite on mobile is accessible if device compromised. | 2 (Possible) | 3 (Critical) | **6** | Verify encryption at rest (SQLCipher) via security tests. |
| **R-004** | PERF | **Sync Payload Size**: Large sync payloads cause timeouts or memory issues on mobile. | 2 (Possible) | 2 (Degraded) | **4** | Performance tests with large datasets; Pagination validation. |
| **R-005** | BUS | **Tontine Calculation Errors**: Incorrect interest or payout calculations. | 1 (Unlikely) | 3 (Critical) | **3** | Extensive unit testing of calculation service (Backend). |

---

## 4. Testability Concerns and Architectural Gaps

### 🚨 Blockers to Fast Feedback

**C-001: Lack of API-Driven State Setup**
- **Problem**: E2E tests currently rely on UI interaction to set up state (e.g., creating a tontine via UI before testing member addition). This makes tests slow and flaky.
- **Requirement**: Backend must expose "Test Helper" APIs (enabled only in non-prod) to seed data directly (e.g., `POST /api/test/seed/tontine`).

**C-002: Hard Dependency on Physical Device Features**
- **Problem**: Mobile code directly calls Capacitor plugins without an abstraction layer in some places.
- **Requirement**: Refactor mobile code to use a "NativeService" interface that can be easily mocked in unit tests (Dependency Injection).

### ⚠️ Architectural Improvements Needed

**C-003: Database State Isolation**
- **Problem**: Parallel test execution on Backend might share the same DB instance/schema.
- **Requirement**: Ensure tests run in transactions that rollback, or use unique schemas per test worker (if parallelized).

**C-004: Observability for Sync Debugging**
- **Problem**: When sync fails, it's hard to know why (network vs validation vs conflict).
- **Requirement**: Add detailed sync logs/events that tests can subscribe to or query to validate "Reason for Failure".

### ✅ Testability Assessment Summary
- **Backend**: Spring Boot architecture is highly testable. Service/Repository layers are well separated. H2 integration is a plus.
- **Mobile**: NgRx state management is excellent for testing state transitions in isolation.

---

## 5. Risk Mitigation Plans (High Priority ≥6)

### Plan for R-001 (Data Sync Conflicts - Score 9)
- **Owner**: Backend Lead & Mobile Lead
- **Action**: Design "Sync V2" with conflict resolution strategy (Last-Write-Wins or Manual Merge).
- **Test Support**: Create a specific "Sync Test Suite" that simulates concurrent edits and validates final state.

### Plan for R-002 (Native Plugin Flakiness - Score 6)
- **Owner**: Mobile Lead
- **Action**: Create a `cap-mocks` library. Implement strict interface for all native features.
- **Test Support**: Unit tests use mocks; E2E tests use a "Bridge" that intercepts native calls and returns deterministic responses.

### Plan for R-003 (Offline Data Security - Score 6)
- **Owner**: Security Architect
- **Action**: Mandate SQLCipher for SQLite.
- **Test Support**: Security tests attempting to read DB file without key.

---

## 6. Assumptions and Dependencies

- **A-001**: We assume the Backend API contract is stable (OpenAPI spec matches implementation).
- **A-002**: We assume Mobile tests will run primarily in a browser environment (Chrome) for functional logic, with only critical paths running on real devices/emulators.
- **D-001**: Dependency on a working CI environment capable of running Docker (for Backend DB) and Headless Chrome (for Mobile).
