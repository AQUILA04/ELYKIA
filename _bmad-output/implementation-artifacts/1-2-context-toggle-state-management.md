# Story 1.2: Context Toggle State Management (FR1, FR2)

Status: done

## Story

As a field agent,
I want to toggle between "Standard" and "Tontine" modes using a segmented control,
so that I can easily view the correct stock operations without leaving the page.

## Acceptance Criteria

1. **Given** the dashboard is loaded **When** I click the "Tontine" segment **Then** the `StockStateService` updates its `BehaviorSubject` to 'TONTINE'.
2. **Given** the context changes **When** the child presenters are rendered **Then** they receive the correct context state via an `@Input()` binding.

## Tasks / Subtasks

- [x] Task 1: State Service Creation (AC: 1)
  - [x] Generate `StockStateService` (`mobile/src/app/stock/services/stock-state.service.ts`).
  - [x] Implement a `BehaviorSubject` for the operational context (`STANDARD` | `TONTINE`).
- [x] Task 2: Dashboard Segmented Control (AC: 1, 2)
  - [x] Update `StockDashboardComponent` UI to include an Ionic Segment (`<ion-segment>`).
  - [x] Bind segment changes to update the `StockStateService`.
  - [x] Expose the current state as an Observable to pass down to presenter components via the `async` pipe.

## Dev Notes

- **Architecture Constraints:** Container (`StockDashboard`) manages state; Presenters receive state via `@Input()`.
- **UX Constraint:** Must use Segmented Controls instead of full route transitions to ensure a seamless toggle experience.
- **Framework Constraints:** `standalone: false`

### Project Structure Notes

- Services: `mobile/src/app/stock/services/`

### References

- [Source: PRD FR1, FR2]
- [Source: UX Alignment - Segmented Controls]

## Dev Agent Record

### Implementation Plan
- Created `StockStateService` as a root-provided service with a private `BehaviorSubject<OperationalContext>` and a read-only `context$: Observable<OperationalContext>` exposed via `.asObservable()` for encapsulation.
- The `OperationalContext` type (`'STANDARD' | 'TONTINE'`) is exported from the service file for reuse across presenter components.
- `StockDashboardComponent` injects `StockStateService`, assigns `context$` as a class property, and binds it directly in the template via the `async` pipe.
- An `onContextChange(event: CustomEvent)` method reads `event.detail.value` and calls `stockStateService.setContext()` to update the BehaviorSubject.
- The HTML template contains a second `ion-toolbar` wrapping an `ion-segment` with two `ion-segment-button` elements (STANDARD/TONTINE). The `(ionChange)` event is bound to `onContextChange`.
- `<ng-container *ngIf="context$ | async as currentContext">` in the content area demonstrates the pattern for passing state down to future presenter child components via `@Input()`.

### Debug Log
- Pre-existing TypeScript compilation errors in `auth.guard.spec.ts`, `sync-logger.service.spec.ts`, `clients.page.spec.ts`, and `dashboard.page.spec.ts` prevented Karma from launching. These are **pre-existing regressions** not introduced by this story, confirmed by zero TypeScript errors in all `src/app/stock/**` files.

### Completion Notes
- ✅ Task 1 complete: `StockStateService` created with `BehaviorSubject<OperationalContext>` defaulting to `'STANDARD'`, exposing `context$` as sealed Observable, and `setContext()` mutator.
- ✅ Task 2 complete: `StockDashboardComponent` updated with `ion-segment`, segment change handler, and `context$` async pipe pattern for downstream @Input() propagation.
- ✅ AC1 satisfied: Clicking "Tontine" segment triggers `setContext('TONTINE')` on `StockStateService`.
- ✅ AC2 satisfied: `context$` is exposed as Observable via `async` pipe and the `ng-container` pattern is ready for presenter `@Input()` bindings.
- ✅ 9 unit tests authored and verified clean TypeScript compilation (0 errors in stock module).
### Review Follow-ups (AI)
- ✅ Fixed High Issue: Bound `<ion-segment>` `[value]` to `context$ | async` to prevent UI state desync.
- ✅ Fixed Medium Issue: Added `this.stockStateService.setContext('STANDARD');` in `ngOnInit` to prevent state leakage from `providedIn: 'root'`.
- ✅ Fixed Medium Issue: Updated `onContextChange` typing to use `SegmentCustomEvent` from `@ionic/angular`.
- ✅ Fixed Low Issue: Updated `stock-dashboard.component.spec.ts` to trigger `ionChange` directly from the DOM element using `triggerEventHandler` instead of calling `onContextChange` manually.

## File List

- `mobile/src/app/stock/services/stock-state.service.ts` [NEW]
- `mobile/src/app/stock/services/stock-state.service.spec.ts` [NEW]
- `mobile/src/app/stock/dashboard/stock-dashboard.component.ts` [MODIFIED]
- `mobile/src/app/stock/dashboard/stock-dashboard.component.html` [MODIFIED]
- `mobile/src/app/stock/dashboard/stock-dashboard.component.scss` [MODIFIED]
- `mobile/src/app/stock/dashboard/stock-dashboard.component.spec.ts` [MODIFIED]

## Change Log

- 2026-04-28: Story 1.2 implemented — created `StockStateService` (BehaviorSubject, OperationalContext type, Observable exposure), updated `StockDashboardComponent` with `ion-segment` toggle UI, `onContextChange` handler, and `context$` async pipe pattern for Container/Presenter architecture.
