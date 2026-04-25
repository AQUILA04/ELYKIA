# Story 1.3: Stock Requests List View (FR3)

Status: ready-for-dev

## Story

As a field agent,
I want to view a list of my historical Stock Requests,
so that I can track pending and completed requests.

## Acceptance Criteria

1. **Given** the dashboard is set to "Standard" **When** the list loads **Then** it fetches data exclusively from `/api/stock-requests`.
2. **Given** the dashboard is set to "Tontine" **When** the list loads **Then** it fetches data exclusively from `/api/v1/stock-tontine-request`.
3. **Given** the API is experiencing latency **When** the list is loading **Then** a Skeleton loader (compliant with 200ms NFR) is displayed instead of a full-page blocking spinner.

## Tasks / Subtasks

- [ ] Task 1: API Service Integration (AC: 1, 2)
  - [ ] Generate `StockApiService` (`mobile/src/app/stock/services/stock-api.service.ts`).
  - [ ] Implement `getStandardRequests()` mapped to `/api/stock-requests`.
  - [ ] Implement `getTontineRequests()` mapped to `/api/v1/stock-tontine-request`.
- [ ] Task 2: List Presenter Component (AC: 1, 2)
  - [ ] Generate `StockRequestListComponent` (`mobile/src/app/stock/components/request-list/stock-request-list.component.ts`).
  - [ ] Configure `@Input()` to accept the current context (`STANDARD` | `TONTINE`) and the data list.
- [ ] Task 3: UX & Performance (AC: 3)
  - [ ] Implement an `<ion-skeleton-text>` based loading state.
  - [ ] Ensure list items use Digital Atelier colors and color-coded status badges.

## Dev Notes

- **Performance NFR1:** The UI must display the skeleton loader within 200ms of any interaction (e.g. toggling the context segment from Story 1.2).
- **Framework Constraints:** `standalone: false`

### Project Structure Notes

- Presenters: `mobile/src/app/stock/components/`

### References

- [Source: PRD FR3, NFR1]
- [Source: Epics - Story 1.3]
