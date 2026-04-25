# Story 1.2: Context Toggle State Management (FR1, FR2)

Status: ready-for-dev

## Story

As a field agent,
I want to toggle between "Standard" and "Tontine" modes using a segmented control,
so that I can easily view the correct stock operations without leaving the page.

## Acceptance Criteria

1. **Given** the dashboard is loaded **When** I click the "Tontine" segment **Then** the `StockStateService` updates its `BehaviorSubject` to 'TONTINE'.
2. **Given** the context changes **When** the child presenters are rendered **Then** they receive the correct context state via an `@Input()` binding.

## Tasks / Subtasks

- [ ] Task 1: State Service Creation (AC: 1)
  - [ ] Generate `StockStateService` (`mobile/src/app/stock/services/stock-state.service.ts`).
  - [ ] Implement a `BehaviorSubject` for the operational context (`STANDARD` | `TONTINE`).
- [ ] Task 2: Dashboard Segmented Control (AC: 1, 2)
  - [ ] Update `StockDashboardComponent` UI to include an Ionic Segment (`<ion-segment>`).
  - [ ] Bind segment changes to update the `StockStateService`.
  - [ ] Expose the current state as an Observable to pass down to presenter components via the `async` pipe.

## Dev Notes

- **Architecture Constraints:** Container (`StockDashboard`) manages state; Presenters receive state via `@Input()`.
- **UX Constraint:** Must use Segmented Controls instead of full route transitions to ensure a seamless toggle experience.
- **Framework Constraints:** `standalone: false`

### Project Structure Notes

- Services: `mobile/src/app/stock/services/`

### References

- [Source: PRD FR1, FR2]
- [Source: UX Alignment - Segmented Controls]
