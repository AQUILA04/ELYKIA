# Story 2.3: Create Standard Stock Return (FR9)

Status: ready-for-dev

## Story

As a field agent,
I want to document a standard stock return to the agency,
so that I can formally release liability for the items.

## Acceptance Criteria

1. **Given** I tap "New Return" in Standard mode **When** the form opens **Then** I must be able to list the specific returned items (article + quantity) and optionally add a free-text comment.
2. **Given** a completed form **When** I submit **Then** a POST is sent to `/api/stock-returns/create` with the correct payload: `{ items: [{ article: { id: X }, quantity: N }], comment? }` (`collector` is injected by `SecurityContextInterceptor`).
3. **Given** a submission begins **When** the request is in-flight **Then** the submit button is disabled to prevent double-tap (FR11).
4. **Given** a successful submission **When** the API responds **Then** the form modal closes, the dashboard returns list refreshes, and the event is logged via `LoggerService`.
5. **Given** a submission failure (status 0 or 503) **When** the error is caught **Then** the `NetworkErrorHandlerInterceptor` routes to "Serveur Indisponible" and form state is preserved for retry.

## Tasks / Subtasks

- [ ] Task 1: Create StockReturnFormComponent (AC: 1, 2, 3)
  - [ ] Generate `StockReturnFormComponent` at `mobile/src/app/stock/components/return-form/stock-return-form.component.ts`
  - [ ] Create template `stock-return-form.component.html` with articles list (add/remove items with quantity), optional comment `<ion-textarea>`, submit/cancel buttons
  - [ ] Create styles `stock-return-form.component.scss` following Digital Atelier design tokens
  - [ ] `@Output() formSubmit = new EventEmitter<CreateStockReturnPayload>()`
  - [ ] `@Output() formCancel = new EventEmitter<void>()`
  - [ ] Add form validation (at least 1 item with quantity > 0; comment is optional)
  - [ ] Implement `isSubmitting: boolean` to manage submit button state (AC: 3)
  - [ ] Write unit tests `stock-return-form.component.spec.ts`
- [ ] Task 2: Define CreateStockReturnPayload model (AC: 2)
  - [ ] Add interfaces to `mobile/src/app/stock/models/stock-return.model.ts`:
    ```typescript
    // CORRECT: StockReturnItem.java uses @ManyToOne Articles article — NOT variationId.
    // comment is an optional field to be added to StockReturn.java (see backend task below).
    export interface StockReturnItemPayload { article: { id: number }; quantity: number; }
    export interface CreateStockReturnPayload { items: StockReturnItemPayload[]; comment?: string; }
    // collector injected by SecurityContextInterceptor — NOT in TS interface
    ```
- [ ] Task 2b: Add `comment` field to backend `StockReturn` entity (**Backend change required**)
  - [ ] Add `private String comment;` to `backend/src/main/java/com/optimize/elykia/core/entity/stock/StockReturn.java`
  - [ ] No migration needed — JPA/Hibernate will add the nullable column on next startup
- [ ] Task 3: Extend StockApiService with createReturn method (AC: 2)
  - [ ] Add `createStandardReturn(payload: CreateStockReturnPayload): Observable<StockReturn>` → `POST /api/stock-returns/create`
  - [ ] Add unit tests for the new method in `stock-api.service.spec.ts`
- [ ] Task 4: Container orchestration in StockDashboardComponent (AC: 1, 4, 5)
  - [ ] Inject `LoggerService` from `../../core/services/logger.service` into `StockDashboardComponent` (if not already present from Story 2.1)
  - [ ] Implement `openCreateReturnForm()` method — opens `StockReturnFormComponent` via `ModalController`
  - [ ] Implement `onCreateReturnSubmit(payload: CreateStockReturnPayload)` — calls API, `await this.log.log(...)`, refreshes returns list on success, handles error (modal stays open)
  - [ ] Add "New Return" FAB visible only in Standard context + Returns tab
- [ ] Task 5: Register new component in StockModule (AC: 1)
  - [ ] Add `StockReturnFormComponent` to `StockModule` declarations array
- [ ] Task 6: Integration tests (AC: 2, 3, 4, 5)
  - [ ] Test: correct POST payload to `/api/stock-returns/create`
  - [ ] Test: submit button disabled during inflight request
  - [ ] Test: returns list refreshes after successful create
  - [ ] Test: form dismissed correctly on success

## Dev Notes

### Key Architecture Constraints
- **CRITICAL:** `StockReturnFormComponent` is a **Presenter** — MUST NOT inject services. Only emits payload via `@Output()`.
- **CRITICAL:** `standalone: false` on the new component.
- **CRITICAL:** `collector` field is injected by `SecurityContextInterceptor` — **NEVER expose in the UI form**.
- **CRITICAL:** Use `LoggerService` for logging: `await this.log.log(message)`. `LoggerService.log()` internally calls `console.log()` — do NOT add a separate `console.log()` call.
- **CRITICAL:** `LoggerService` import: `import { LoggerService } from '../../core/services/logger.service';`.

### API Payload Schema (Verified from `StockReturn.java` and `StockReturnItem.java`)
```json
{
  "items": [
    { "article": { "id": 12 }, "quantity": 3 }
  ],
  "comment": "Retour suite à annulation client"  // Optional — requires backend entity change
}
```
> ⚠️ **CRITICAL — Entity Audit Result:**
> - `StockReturn` entity current fields: `collector`, `returnDate`, `status`, `items` — **NO `comment` yet**.
> - `StockReturnItem` fields: `article` (@ManyToOne Articles), `quantity`, `unitPrice` — **NOT `variationId`**.
> - **Backend entity change required (Task 2b):** Add `private String comment;` to `StockReturn.java` before testing this endpoint.
> - Do NOT add `agenceId` to the payload.

**Endpoint:** `POST /api/stock-returns/create`
**Response:** Returns `StockReturn` entity directly (NOT wrapped in `ApiResponse<>`).

### Difference vs Story 2.2 (Request Form)
| Field | Request Form (2.2) | Return Form (2.3) |
|---|---|---|
| Items (article + qty) | ✅ Required | ✅ Required |
| Endpoint | `/api/stock-requests/create` | `/api/stock-returns/create` |

> Both forms share the same simple structure — just different endpoints and model types.

### Files to Touch
- `mobile/src/app/stock/models/stock-return.model.ts` — Add `StockReturnItem`, `CreateStockReturnPayload` interfaces
- `mobile/src/app/stock/services/stock-api.service.ts` — Add `createStandardReturn()` method
- `mobile/src/app/stock/services/stock-api.service.spec.ts` — Add tests
- `mobile/src/app/stock/components/return-form/stock-return-form.component.ts` — NEW component
- `mobile/src/app/stock/components/return-form/stock-return-form.component.html` — NEW template
- `mobile/src/app/stock/components/return-form/stock-return-form.component.scss` — NEW styles
- `mobile/src/app/stock/components/return-form/stock-return-form.component.spec.ts` — NEW tests
- `mobile/src/app/stock/dashboard/stock-dashboard.component.ts` — Add `openCreateReturnForm()`, `onCreateReturnSubmit()`
- `mobile/src/app/stock/dashboard/stock-dashboard.component.html` — Add "New Return" button (Standard + Returns tab)
- `mobile/src/app/stock/dashboard/stock-dashboard.component.spec.ts` — Add integration tests
- `mobile/src/app/stock/stock.module.ts` — Add `StockReturnFormComponent` to declarations

### UX Constraints
- Primary color `#1E40AF` for submit button.
- All touch targets ≥ 44×44px.
- Items rows: `<ion-input type="number">` for quantity, `<ion-select>` for article.
- "New Return" button visible only on Returns tab AND in Standard context.

### Previous Story Intelligence
- Modal orchestration established in Story 1.5 (`ModalController`).
- Form pattern to follow from Story 2.2 (`StockRequestFormComponent`).
- Dual-logging established in Story 2.1.

### References
- [Source: epics.md — Story 2.3, FR9]
- [Source: architecture.md — Container-Presenter pattern, Enforcement Guidelines]
- [Source: backend/src/main/java/com/optimize/elykia/core/controller/stock/StockReturnController.java — POST /create]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (Thinking) — Context Engine v1.0

### Debug Log References

### Completion Notes List

### File List
