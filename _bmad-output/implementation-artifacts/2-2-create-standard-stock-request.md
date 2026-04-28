# Story 2.2: Create Standard Stock Request (FR7)

Status: ready-for-dev

## Story

As a field agent,
I want to fill out a form to request standard stock,
so that I can replenish my inventory.

## Acceptance Criteria

1. **Given** I tap "New Request" in Standard mode **When** the form opens **Then** I can list item articles (`article.id`) and set quantities — and the form is displayed as an Ionic modal.
2. **Given** a completed form **When** I submit **Then** a POST is sent to `/api/stock-requests/create` with the correct payload: `{ items: [{ article: { id: X }, quantity: N }] }` (`collector` is injected automatically by `SecurityContextInterceptor`).
3. **Given** a submission **When** it begins **Then** the submit button enters a disabled loading state (prevent double-tap — FR11).
4. **Given** a successful submission **When** the API responds **Then** the form closes, the dashboard list refreshes, and the event is logged via `LoggerService`.
5. **Given** a submission failure **When** status is 0 or 503 **Then** the `NetworkErrorHandlerInterceptor` routes to "Serveur Indisponible" and the **form state is preserved** so the agent can retry.

## Tasks / Subtasks

- [ ] Task 1: Create StockRequestFormComponent (AC: 1, 2, 3)
  - [ ] Generate `StockRequestFormComponent` at `mobile/src/app/stock/components/request-form/stock-request-form.component.ts`
  - [ ] Create template `stock-request-form.component.html` with articles list (add-item / remove-item), quantity inputs, and submit/cancel buttons
  - [ ] Create styles `stock-request-form.component.scss` following Digital Atelier tokens
  - [ ] `@Output() formSubmit = new EventEmitter<CreateStockRequestPayload>()` to keep presenter "dumb"
  - [ ] `@Output() formCancel = new EventEmitter<void>()` for dismissal
  - [ ] Add form validation (at least 1 item with quantity > 0)
  - [ ] Implement `isSubmitting: boolean` to disable submit button during inflight request
  - [ ] Write unit tests `stock-request-form.component.spec.ts`
- [ ] Task 2: Define CreateStockRequestPayload model (AC: 2)
  - [ ] Add interfaces to `mobile/src/app/stock/models/stock-request.model.ts`:
    ```typescript
    // CORRECT: StockRequestItem.java uses @ManyToOne Articles article — NOT variationId
    export interface StockRequestItemPayload { article: { id: number }; quantity: number; }
    export interface CreateStockRequestPayload { items: StockRequestItemPayload[]; }
    // collector is injected by SecurityContextInterceptor — NOT included in TS interface
    ```
- [ ] Task 3: Extend StockApiService with create method (AC: 2)
  - [ ] Add `createStandardRequest(payload: CreateStockRequestPayload): Observable<StockRequest>` → `POST /api/stock-requests/create`
  - [ ] Add unit tests for the new method in `stock-api.service.spec.ts`
- [ ] Task 4: Expose "New Request" trigger from StockDashboardComponent (AC: 1, 4, 5)
  - [ ] Inject `LoggerService` from `../../core/services/logger.service` into `StockDashboardComponent` (if not already present from Story 2.1)
  - [ ] Implement `openCreateRequestForm()` method in `StockDashboardComponent` — opens `StockRequestFormComponent` via `ModalController`
  - [ ] Implement `onCreateRequestSubmit(payload: CreateStockRequestPayload)` — calls API, `await this.log.log(...)`, refreshes requests list on success, handles error (modal stays open)
  - [ ] Add "New Request" FAB in dashboard template (visible only in Standard context + Requests tab)
- [ ] Task 5: Register new component in StockModule (AC: 1)
  - [ ] Add `StockRequestFormComponent` to `StockModule` declarations array
- [ ] Task 6: Write integration tests (AC: 2, 3, 4, 5)
  - [ ] Test: submit button is disabled while `isSubmitting = true`
  - [ ] Test: correct POST payload structure sent to API
  - [ ] Test: dashboard list refreshes after successful create
  - [ ] Test: form state preserved on network error

## Dev Notes

### Key Architecture Constraints
- **CRITICAL:** `StockRequestFormComponent` is a **Presenter** — it MUST NOT inject `StockApiService` or `HttpClient`. It only emits `formSubmit` with the payload. The Container (`StockDashboardComponent`) performs the actual API call.
- **CRITICAL:** `standalone: false` on the new component.
- **CRITICAL:** The `collector` field in the payload MUST be derived from the authenticated session via `SecurityContextInterceptor` — **never expose a "collector" input field on the UI form**. The interceptor handles this automatically for POST requests.
- **CRITICAL:** Use `LoggerService` for logging: `await this.log.log(message)`. `LoggerService.log()` internally calls `console.log()` — do NOT add a separate `console.log()` call.
- **CRITICAL:** `LoggerService` import: `import { LoggerService } from '../../core/services/logger.service';`. Inject into `StockDashboardComponent` as `private log: LoggerService`.

### API Payload Schema (Verified from backend entity `StockRequest.java` and `StockRequestItem.java`)
```json
{
  "collector": "john.doe",        // Injected by SecurityContextInterceptor — do NOT expose in UI
  "items": [
    {
      "article": { "id": 12 },    // ⚠️ CORRECT: StockRequestItem uses @ManyToOne Articles article, NOT variationId
      "quantity": 10
    }
  ]
}
```
**Endpoint:** `POST /api/stock-requests/create`  
**Response:** Returns the created `StockRequest` entity directly (NOT wrapped in ApiResponse).

> ⚠️ **IMPORTANT:** The backend `StockRequestController.createRequest()` returns `ResponseEntity<StockRequest>` directly (not the `ApiResponse<>` wrapper used by the GET endpoints). The `StockApiService` must type-hint the return as `Observable<StockRequest>` (not `Observable<ApiResponse<StockRequest>>`).

> ⚠️ **Item field correction:** `StockRequestItem` entity has `article` (`@ManyToOne Articles`) and `quantity`. The payload must use `{ article: { id: X }, quantity: N }` — NOT `{ variationId: X, quantity: N }`. Update the `StockRequestItem` TypeScript interface accordingly:
```typescript
export interface StockRequestItemPayload { article: { id: number }; quantity: number; }
export interface CreateStockRequestPayload { items: StockRequestItemPayload[]; }
// collector is injected by interceptor — NOT in the TS interface
```

### Duplicate Submission Prevention (FR11)
- Implement `isSubmitting = false` in the form component.
- Set `isSubmitting = true` at the start of submission; reset to `false` in both success and error paths.
- The submit button must use `[disabled]="isSubmitting"` in the template.

### Form Modes — Presentation Options
Present the form as an **Ionic modal** (preferred for consistency with `StockDetailModalComponent` already implemented in Story 1.5). Use `ModalController.create({ component: StockRequestFormComponent, componentProps: { ... } })`.

### Agency Selection
- **Check first:** Run a search for `AgenceService` or `agence` in `mobile/src/app/` before creating anything new. The app may already have an agency fetching mechanism.
- If no agency service exists: add a `getAgencies(): Observable<any[]>` method to `StockApiService` pointing to the existing backend agency endpoint. Do NOT create a new standalone service for this MVP.
- For MVP: a static list is acceptable if no `/api/agences` endpoint exists.

> ⚠️ **NOTE:** `StockRequest` entity does NOT have an `agenceId` field. Verify the actual agency linking mechanism by reading `StockRequest.java` and `StockRequestService.java` before implementing the agency selector.

### Model Correction (C5)
```typescript
// In stock-request.model.ts — CORRECT payload types:
export interface StockRequestItemPayload { article: { id: number }; quantity: number; }
export interface CreateStockRequestPayload { items: StockRequestItemPayload[]; }
// collector injected by SecurityContextInterceptor — not in TypeScript interface
```

### Items List UI Pattern
- Dynamic list: each row has an article selector (`<ion-select>` for available articles) and a quantity input (`<ion-input type="number">`).
- Provide "Add Item" and "Remove Item" controls.
- Minimum 1 item required for form validity.

### Files to Touch
- `mobile/src/app/stock/models/stock-request.model.ts` — Add `StockRequestItem`, `CreateStockRequestPayload` interfaces
- `mobile/src/app/stock/services/stock-api.service.ts` — Add `createStandardRequest()` method
- `mobile/src/app/stock/services/stock-api.service.spec.ts` — Add create tests
- `mobile/src/app/stock/components/request-form/stock-request-form.component.ts` — NEW component
- `mobile/src/app/stock/components/request-form/stock-request-form.component.html` — NEW template
- `mobile/src/app/stock/components/request-form/stock-request-form.component.scss` — NEW styles
- `mobile/src/app/stock/components/request-form/stock-request-form.component.spec.ts` — NEW tests
- `mobile/src/app/stock/dashboard/stock-dashboard.component.ts` — Add `LoggerService` injection; add `openCreateRequestForm()`, `onCreateRequestSubmit()`
- `mobile/src/app/stock/dashboard/stock-dashboard.component.html` — Add "New Request" button (Standard context only)
- `mobile/src/app/stock/dashboard/stock-dashboard.component.spec.ts` — Add create integration tests
- `mobile/src/app/stock/stock.module.ts` — Add `StockRequestFormComponent` to declarations

### UX Constraints (Digital Atelier)
- Primary color: `#1E40AF` for submit button
- All touch targets ≥ 44×44px
- Form must show a skeleton/loading state during agency fetch
- Use Ionic `<ion-select>` for agency selection, `<ion-input type="number">` for quantities

### Previous Story Intelligence (from Epic 1 patterns)
- Modal pattern established: `StockDetailModalComponent` in `mobile/src/app/stock/components/detail-modal/`
- Container opens modals via `ModalController.create()` — same pattern applies here
- `SecurityContextInterceptor` automatically injects `commercialUsername` (= `collector`) into all POST payloads — the UI form must NOT have a collector field

### References
- [Source: epics.md — Story 2.2, FR7, FR11]
- [Source: architecture.md — Container-Presenter pattern, Security section, Anti-Patterns]
- [Source: backend/src/main/java/com/optimize/elykia/core/controller/stock/StockRequestController.java — POST /create]
- [Source: backend/src/main/java/com/optimize/elykia/core/entity/stock/StockRequest.java — Entity fields]
- [Source: architecture.md — Enforcement Guidelines: standalone:false, dual-logging, commercialUsername from auth]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (Thinking) — Context Engine v1.0

### Debug Log References

### Completion Notes List

### File List
