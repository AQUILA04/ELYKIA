# Story 2.1: Cancel Pending Standard Operations (FR6)

Status: ready-for-dev

## Story

As a field agent,
I want to cancel a standard stock request or return that is still pending,
so that I can correct mistakes before the agency processes the items.

## Acceptance Criteria

1. **Given** a pending stock operation (status = `CREATED`) in the Standard list view **When** I tap the "Cancel" button on that item **Then** a confirmation `AlertController` dialog appears asking the agent to confirm the cancellation.
2. **Given** I confirm the cancellation **When** the API call to `PUT /api/stock-requests/{id}/cancel` or `PUT /api/stock-returns/{id}/cancel` successfully returns **Then** the item is **optimistically** removed from the list immediately, and the action is dual-logged.
3. **Given** a cancellation action is confirmed **When** the request is sent **Then** the cancel button enters a disabled loading state to prevent double-taps.
4. **Given** the API call fails (network error or server error) **When** the error is caught **Then** the item is restored in the list, an error toast is shown to the user, and `NetworkErrorHandlerInterceptor` routes to "Serveur Indisponible" for status 0/503.
5. **Given** a successful cancellation **When** the API responds **Then** the event is dual-logged via `this.log.log()` AND `console.log()`.

## Tasks / Subtasks

- [ ] Task 1: Extend StockApiService with cancel methods (AC: 2, 3)
  - [ ] Add `cancelStandardRequest(id: number): Observable<void>` → `PUT /api/stock-requests/{id}/cancel`
  - [ ] Add `cancelStandardReturn(id: number): Observable<void>` → `PUT /api/stock-returns/{id}/cancel`
  - [ ] Add unit tests for both methods in `stock-api.service.spec.ts`
- [ ] Task 2: Add cancel action to RequestListComponent (AC: 1, 3)
  - [ ] Add `@Output() cancelTap = new EventEmitter<StockRequest>()` to `RequestListComponent`
  - [ ] Add a "Cancel" button rendered only when `request.status === 'CREATED'` (or appropriate cancellable status)
  - [ ] Emit `cancelTap` with the request object on tap
  - [ ] Style cancel button to meet 44x44px minimum touch target (NFR5)
- [ ] Task 3: Add cancel action to StockReturnListComponent (AC: 1, 3)
  - [ ] Add `@Output() cancelTap = new EventEmitter<StockReturn>()` to `StockReturnListComponent`
  - [ ] Add a "Cancel" button rendered only when `return.status === 'CREATED'`
  - [ ] Emit `cancelTap` with the return object on tap
- [ ] Task 4: Container orchestration in StockDashboardComponent (AC: 1, 2, 3, 4, 5)
  - [ ] Inject `AlertController` from `@ionic/angular` into `StockDashboardComponent`
  - [ ] Inject `LoggerService` from `mobile/src/app/core/services/logger.service.ts` into `StockDashboardComponent` (as `private log: LoggerService`)
  - [ ] Add `cancellingId: number | null = null` property to track in-flight cancel requests
  - [ ] Implement `onCancelRequestTap(request: StockRequest)` method: show alert, on confirm → set `cancellingId`, optimistic remove + API call + `await this.log.log(...)` + error restore + reset `cancellingId`
  - [ ] Implement `onCancelReturnTap(stockReturn: StockReturn)` method: same pattern
  - [ ] Wire `(cancelTap)="onCancelRequestTap($event)"` in template for `<app-request-list>`
  - [ ] Wire `(cancelTap)="onCancelReturnTap($event)"` in template for `<app-stock-return-list>`
- [ ] Task 5: Tests (AC: 1, 2, 3, 4, 5)
  - [ ] Add unit tests for cancel methods in `stock-dashboard.component.spec.ts`
  - [ ] Test: confirmation dialog appears on `cancelTap`
  - [ ] Test: optimistic removal on confirm
  - [ ] Test: list restored on API error

## Dev Notes

### Key Architecture Constraints
- **CRITICAL:** Never inject `AlertController` or `HttpClient` directly into Presenter components (`RequestListComponent`, `StockReturnListComponent`). All orchestration must happen in the Container (`StockDashboardComponent`).
- **CRITICAL:** `standalone: false` must be preserved on ALL components.
- **CRITICAL:** Use `LoggerService` for all logging: `await this.log.log(message)`. `LoggerService.log()` internally calls `console.log()` AND writes to file — do NOT add a separate `console.log()` call.
- **CRITICAL:** `LoggerService` import path: `import { LoggerService } from '../../core/services/logger.service';` (relative to component location in `stock/dashboard/`)

### Cancellable Status Logic
- The backend `cancelRequest` / `cancelReturn` endpoints only succeed for operations in `CREATED` or `PENDING` status. The "Cancel" button must only be visible for cancellable statuses. A safe list to display the button: `['CREATED', 'PENDING']`. Verify against backend `StockRequestStatus` enum at:
  - `backend/src/main/java/com/optimize/elykia/core/enumaration/StockRequestStatus.java`

### Optimistic Update Pattern
```typescript
// Optimistic removal pattern
// Note: LoggerService.log() is async and internally calls console.log() — do NOT add extra console.log()
async onCancelRequestTap(request: StockRequest): Promise<void> {
  const prevRequests = [...this.requests];
  this.cancellingId = request.id;
  this.requests = this.requests.filter(r => r.id !== request.id);
  this.stockApiService.cancelStandardRequest(request.id).subscribe({
    next: async () => {
      await this.log.log(`Standard request ${request.id} cancelled`);
      this.cancellingId = null;
    },
    error: async (err) => {
      this.requests = prevRequests; // Restore on error
      this.cancellingId = null;
      await this.log.log(`Cancel standard request ${request.id} failed: ${err?.message}`);
      // Show error toast
    }
  });
}
```

### Alert Dialog Pattern (Ionic)
```typescript
const alert = await this.alertCtrl.create({
  header: 'Confirm Cancellation',
  message: 'Are you sure you want to cancel this operation? This cannot be undone.',
  buttons: [
    { text: 'Keep', role: 'cancel' },
    { text: 'Cancel Operation', role: 'destructive', handler: () => { /* cancel logic */ } }
  ]
});
await alert.present();
```

### API Endpoints (Verified from backend controllers)
| Operation | Method | Endpoint |
|---|---|---|
| Cancel Standard Request | PUT | `/api/stock-requests/{id}/cancel` |
| Cancel Standard Return | PUT | `/api/stock-returns/{id}/cancel` |

**Note:** Both cancel endpoints return `ResponseEntity<Void>`. The `Observable<void>` return type in TypeScript is correct.

### Files to Touch
- `mobile/src/app/stock/services/stock-api.service.ts` — Add 2 cancel methods
- `mobile/src/app/stock/services/stock-api.service.spec.ts` — Add tests
- `mobile/src/app/stock/components/request-list/request-list.component.ts` — Add `cancelTap` Output
- `mobile/src/app/stock/components/request-list/request-list.component.html` — Add cancel button (conditional on status)
- `mobile/src/app/stock/components/request-list/request-list.component.spec.ts` — Add tests
- `mobile/src/app/stock/components/return-list/stock-return-list.component.ts` — Add `cancelTap` Output
- `mobile/src/app/stock/components/return-list/stock-return-list.component.html` — Add cancel button
- `mobile/src/app/stock/components/return-list/stock-return-list.component.spec.ts` — Add tests
- `mobile/src/app/stock/dashboard/stock-dashboard.component.ts` — Add `AlertController`, `LoggerService`, `ToastController` injections; add `cancellingId` property; add cancel handler methods
- `mobile/src/app/stock/dashboard/stock-dashboard.component.html` — Wire `(cancelTap)` events
- `mobile/src/app/stock/dashboard/stock-dashboard.component.spec.ts` — Add cancel integration tests
- `mobile/src/app/stock/stock.module.ts` — No changes expected (`AlertController`, `ToastController` provided by `IonicModule`; `LoggerService` is `providedIn: 'root'`)

### UX Constraints
- Touch targets for cancel buttons must be at least 44×44px (NFR5).
- `cancellingId: number | null = null` on Container — pass as `@Input() cancellingId` to Presenters to disable the correct button.
- Cancel button template: `[disabled]="cancellingId === request.id"` in `request-list.component.html`.
- Error toast via `ToastController` — 3 second duration, `position: 'bottom'`, `color: 'danger'`.

### Testing Standards
- Use Jasmine/Karma (existing test suite).
- Mock `AlertController.create()` → spy on `present()` and simulate user confirmation via `role = 'destructive'`.
- Mock `StockApiService.cancelStandardRequest()` → return `of(undefined)` for success, `throwError(...)` for failure.
- Mock `LoggerService`: `jasmine.createSpyObj('LoggerService', ['log', 'error'])` — note `log()` is async, the spy returns `Promise.resolve()` by default which is correct.
- In spec `TestBed.configureTestingModule` providers: `{ provide: LoggerService, useValue: mockLogService }`

### Project Structure Notes
- All new code in `mobile/src/app/stock/` only.
- No new Angular modules needed — `AlertController` & `ToastController` are provided by `IonicModule` already in `StockModule` imports.
- Follow existing kebab-case file naming.

### References
- [Source: epics.md — Story 2.1, FR6, NFR3]
- [Source: architecture.md — Container-Presenter pattern, Enforcement Guidelines]
- [Source: backend/src/main/java/com/optimize/elykia/core/controller/stock/StockRequestController.java — PUT /{id}/cancel]
- [Source: backend/src/main/java/com/optimize/elykia/core/controller/stock/StockReturnController.java — PUT /{id}/cancel]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (Thinking) — Context Engine v1.0

### Debug Log References

### Completion Notes List

### File List
