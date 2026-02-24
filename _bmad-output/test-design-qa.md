# Test Design QA: ELYKIA Project

**Version**: 1.0
**Date**: 2026-01-28
**Scope**: System-Level Test Design (Backend & Mobile)
**Status**: Draft

---

## 1. Executive Summary

This document outlines the Quality Assurance strategy for the ELYKIA project. The primary focus is ensuring data integrity across offline/online transitions and validating complex financial calculations in the backend. We adopt a "Shift-Left" approach with heavy emphasis on unit testing for business logic and API/E2E testing for critical user journeys.

**Key Metrics**:
- **Critical Path Coverage Target**: 100% (P0 scenarios)
- **Code Coverage Target**: Backend > 80%, Mobile Logic > 70%
- **Sync Reliability Target**: 99.9% data consistency after sync

---

## 2. Dependencies & Test Blockers

- [ ] **D-001**: Setup **Playwright** for E2E and API testing (See Sprint 0 Setup).
- [ ] **D-002**: Configure **CI Pipeline** to run backend tests (Maven) and mobile tests (Karma) on every PR.
- [ ] **D-003**: Implement **Test Data Seeding API** in Backend (B-002 from Arch Doc).
- [ ] **D-004**: Create **Capacitor Mocks** library for Mobile unit tests (B-001 from Arch Doc).

---

## 3. Risk Assessment

See [Test Design Architecture Document](test-design-architecture.md#risk-assessment) for detailed risk analysis.

**Top Risks Managed by QA:**
- **R-001 (Data Sync)**: Covered by P0 Sync Scenarios.
- **R-003 (Security)**: Covered by Security Test Suite.
- **R-005 (Calculations)**: Covered by detailed Unit Tests in Backend.

---

## 4. Test Coverage Plan

### Priority Definitions
- **P0 (Critical)**: Blocks core business (Login, Sync, Payment). Run on every commit.
- **P1 (High)**: Major features (Reporting, User Mgmt). Run on PR merge.
- **P2 (Medium)**: Edge cases, UI polish. Run nightly.
- **P3 (Low)**: Minor features. Run weekly.

### Backend Test Scenarios

#### Authentication (P0)
- [ ] POST /auth/login with valid credentials -> Returns JWT
- [ ] POST /auth/login with invalid credentials -> Returns 401
- [ ] POST /auth/refresh-token -> Returns new JWT

#### Tontine Operations (P0)
- [ ] Create new Tontine Cycle (Happy Path)
- [ ] Add Member to Tontine (Validation: Max members)
- [ ] Record Payment (Calculation: Balance update)
- [ ] Tontine Payout (Logic: Eligibility check)

#### Credit Operations (P1)
- [ ] Apply for Credit (Validation: Credit limit)
- [ ] Approve Credit (State transition: Pending -> Active)
- [ ] Repay Credit (Calculation: Remaining balance)

### Mobile Test Scenarios

#### Offline Capability (P0 - Critical)
- [ ] **Sync**: Create data (Member/Payment) offline -> Connect -> Sync -> Verify data on Backend
- [ ] **Conflict**: Edit same record on Mobile (Offline) and Backend -> Sync -> Verify Conflict Resolution (Last-Write-Wins?)
- [ ] **Persistence**: Create data -> Kill App -> Restart App -> Data persists (SQLite)

#### Core Features (P1)
- [ ] **Tontine**: View Member List (Offline)
- [ ] **Collection**: Record Payment (Offline) -> Generates Receipt
- [ ] **Profile**: Update Agent Profile

---

## 5. Execution Strategy

**Philosophy**: Fast feedback loop. Heavy reliance on Unit/Integration tests. E2E tests focused on critical paths.

### 1. Unit Tests (Dev Loop - Run Locally)
- **Backend (JUnit/Mockito)**: Services, Domain Logic, DTO mapping.
- **Mobile (Jasmine/Karma)**: Components, Services, NgRx Reducers/Effects.

### 2. Integration/API Tests (CI - PR Check)
- **Backend (Spring Boot Test)**: Controller -> Service -> DB (H2).
- **API (Playwright API)**: Test API endpoints against a running (dockerized) backend.

### 3. E2E Tests (Nightly / Release Gate)
- **Web/Mobile (Playwright)**:
  - Run against "Web" version of Mobile App.
  - Simulate offline mode using Network Interception.
  - Validates full user flows (Login -> Sync -> Operation -> Sync).

---

## 6. Sprint 0 Setup Requirements (QA Team)

To prepare for automation:

1.  **Install Playwright**:
    ```bash
    npm init playwright@latest
    # Select 'TypeScript'
    # Create 'tests' directory
    ```
2.  **Configure Backend Test Profile**:
    - Ensure `application-test.yml` exists with H2 configuration.
3.  **Setup Mobile Mocks**:
    - Create `src/mocks/capacitor-mocks.ts` to mock Camera/Geolocation.
4.  **CI/CD Integration**:
    - Create GitHub Actions workflow for:
      - `mvn test` (Backend)
      - `npm run test` (Mobile)
      - `npx playwright test` (E2E/API)

---

## 7. QA Effort Estimate

- **Unit Tests**: Continuous (Dev effort).
- **API Tests Setup**: 3 Days (1 QA Engineer).
- **Mobile E2E Setup**: 5 Days (1 QA Engineer - complexity of offline sync).
- **Total Initial Automation**: ~2 Weeks to reach P0 coverage.
