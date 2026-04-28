# Story 2.4: Prevent Duplicate Submissions (FR11)

Status: ready-for-dev

## Story

As a field agent,
I want the system to prevent me from accidentally submitting the same form twice,
so that I don't accidentally request double inventory due to a slow network.

## Acceptance Criteria

1. **Given** I tap submit on any Standard creation form (Request or Return) **When** the request is in-flight **Then** the entire UI prevents secondary submissions (submit button disabled).
2. **Given** a submission fails with a network error (status 0 or 503) **When** the modal is still open **Then** form state is preserved (data not lost) and `isSubmitting` is reset to allow retry.
3. **Given** a submission is successfully processed **When** the API returns a success response **Then** the form is dismissed and the submit action cannot be re-triggered on the same data.
4. **Given** a form is submitting **When** the agent navigates away (e.g., app backgrounds) **Then** the in-flight request is not duplicated on return.

> **Scope note:** This story covers Standard forms only (2.2 and 2.3). Tontine forms (3.2, 3.3) will implement the same pattern independently — the dev must verify the guard is replicated there.

## Tasks / Subtasks

- [ ] Task 1: Audit all form components for submission guard (AC: 1)
  - [ ] Verify `StockRequestFormComponent` (Story 2.2) has `isSubmitting: boolean` and `[disabled]="isSubmitting"` on submit button
  - [ ] Verify `StockReturnFormComponent` (Story 2.3) has the same guard
  - [ ] If any guard is missing, add it now
  - [ ] Write unit tests confirming double-tap is impossible: second `submit()` call while `isSubmitting = true` is a no-op
- [ ] Task 2: Implement form state preservation on network failure (AC: 2)
  - [ ] In `StockDashboardComponent`, when `createStandardRequest` or `createStandardReturn` fails:
    - Keep the modal open (do NOT call `modal.dismiss()` in the error path)
    - Reset `isSubmitting = false` in the Presenter via `@ViewChild` ref or by passing `isSubmitting` back as an `@Input()`
    - Show a `ToastController` error message: "Erreur réseau. Vos données sont préservées. Veuillez réessayer."
    - Log via `await this.log.log('create failed: ' + err?.message)` (LoggerService only — no extra console.log)
  - [ ] Audit `mobile/src/app/core/interceptors/network-error.interceptor.ts` to verify it does NOT force-navigate away while a modal is open (read-only audit)
- [ ] Task 3: Request idempotency token (AC: 3, 4) [OPTIONAL if backend supports it]
  - [ ] Check if the backend accepts an `X-Idempotency-Key` header on POST requests.
  - [ ] If yes: generate a UUID per form session in `StockRequestFormComponent` and `StockReturnFormComponent`, add to payload or header.
  - [ ] If no: skip this subtask (the disabled-button guard is sufficient for MVP).
- [ ] Task 4: Integration tests (AC: 1, 2, 3)
  - [ ] Test: `submit()` is a no-op when `isSubmitting = true`
  - [ ] Test: modal stays open and `isSubmitting` resets to `false` on API error
  - [ ] Test: success path closes modal and resets state

## Dev Notes

### Context
This story is a **quality/hardening story** — it does not introduce new UI components. Its primary job is to cross-cut Stories 2.2 and 2.3 to ensure the `isSubmitting` guard is correctly implemented and tested end-to-end.

### Implementation Pattern
```typescript
// In Presenter (StockRequestFormComponent / StockReturnFormComponent)
isSubmitting = false;

onSubmit(): void {
  if (this.isSubmitting || this.form.invalid) return; // Guard — prevents double-tap
  this.isSubmitting = true;
  this.formSubmit.emit(this.buildPayload());
  // NOTE: isSubmitting stays true until Container signals reset
  // Container must call resetSubmitting() on this component via @ViewChild
}

resetSubmitting(): void {
  this.isSubmitting = false;
}
```

### Logging Pattern
```typescript
// In Container (StockDashboardComponent) — error path:
error: async (err) => {
  await this.log.log(`create failed: ${err?.message}`); // LoggerService only — no extra console.log
  // DO NOT dismiss modal
  const toast = await this.toastCtrl.create({
    message: 'Erreur réseau. Vos données sont préservées. Veuillez réessayer.',
    duration: 4000, position: 'bottom', color: 'danger'
  });
  await toast.present();
  this.activeRequestFormRef?.resetSubmitting();
}
```

### NetworkErrorHandlerInterceptor Interaction
- File: `mobile/src/app/core/interceptors/network-error.interceptor.ts` (class: `NetworkErrorHandlerInterceptor`)
- On status 0 or 503: calls `router.navigate(['/server-unavailable'])` if backend ping fails.
- **Risk:** This navigation will close the modal, losing form data.
- **Mitigation:** Store form data transiently in `StockStateService` (no DB persistence) before the API call. On re-open, populate the form from state.

### Files to Touch (Audit-focused)
- `mobile/src/app/stock/components/request-form/stock-request-form.component.ts` — Verify/add `isSubmitting` guard
- `mobile/src/app/stock/components/request-form/stock-request-form.component.spec.ts` — Add double-submit prevention tests
- `mobile/src/app/stock/components/return-form/stock-return-form.component.ts` — Verify/add `isSubmitting` guard
- `mobile/src/app/stock/components/return-form/stock-return-form.component.spec.ts` — Add double-submit prevention tests
- `mobile/src/app/stock/dashboard/stock-dashboard.component.ts` — Verify error path keeps modal open, resets `isSubmitting`
- `mobile/src/app/stock/dashboard/stock-dashboard.component.spec.ts` — Add idempotency tests
- `mobile/src/app/core/interceptors/network-error-handler.interceptor.ts` — Audit for modal-context awareness (READ ONLY unless fix needed)

### Testing Standards
- **Critical test:** Simulate two rapid `onSubmit()` calls — verify only 1 HTTP request is made.
- **Critical test:** Simulate API error → verify modal is still displayed, `isSubmitting === false`.

### References
- [Source: epics.md — Story 2.4, FR11]
- [Source: architecture.md — Process Patterns, Error Handling Patterns]
- [Source: Story 2.2 — `StockRequestFormComponent` `isSubmitting` pattern]
- [Source: Story 2.3 — `StockReturnFormComponent` `isSubmitting` pattern]
- [Source: mobile/src/app/core/interceptors/network-error-handler.interceptor.ts — Existing interceptor]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (Thinking) — Context Engine v1.0

### Debug Log References

### Completion Notes List

### File List
