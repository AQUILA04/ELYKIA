# ELYKIA Test Automation Suite

This directory contains the end-to-end (E2E) and integration tests for the ELYKIA project (Backend & Mobile).

## Prerequisites

1.  **Node.js** (v18+)
2.  **Playwright**:
    ```bash
    npm init playwright@latest
    ```

## Structure

- `tests/e2e`: End-to-end user scenarios (Web & Mobile Web).
- `tests/api`: Backend API integration tests.
- `tests/mobile`: Mobile-specific flows (simulated offline/online).

## Running Tests

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run All Tests**:
    ```bash
    npx playwright test
    ```

3.  **Run Backend API Tests**:
    ```bash
    npx playwright test tests/api
    ```

4.  **Run Mobile E2E Tests**:
    ```bash
    npx playwright test tests/mobile
    ```

## Continuous Integration

These tests are designed to run in CI/CD pipelines (GitHub Actions) on every Pull Request (P0/P1) or Nightly (P2).

See `_bmad-output/test-design-qa.md` for the full test strategy.
