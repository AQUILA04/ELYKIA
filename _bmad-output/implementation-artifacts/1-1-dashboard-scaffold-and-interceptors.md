# Story 1.1: Dashboard Scaffold & Interceptors (Foundation)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a mobile developer,
I want to create the StockModule, Dashboard Container, and global interceptors,
so that the application has a secure, offline-aware foundation for stock features.

## Acceptance Criteria

1. **Given** a logged-in user **When** they navigate to `/stock` **Then** the `StockDashboardComponent` loads successfully **And** the component is declared in a `standalone: false` NgModule.
2. **Given** a network failure (status `0` or `503`) **When** an API call is made **Then** the user is immediately routed to the "Serveur Indisponible" screen.
3. **Given** an outbound API call **When** the payload is sent **Then** the `commercialUsername` is injected automatically by the `SecurityContextInterceptor`.

## Tasks / Subtasks

- [x] Task 1: Foundation Scaffolding (AC: 1)
  - [x] Generate `StockModule` (`mobile/src/app/stock/stock.module.ts`).
  - [x] Generate `StockDashboardComponent` (`mobile/src/app/stock/dashboard/stock-dashboard.component.ts`).
  - [x] Ensure all new components use `@Component({ standalone: false })`.
  - [x] Setup lazy-loaded routing for `/stock`.
- [x] Task 2: Network Resiliency Interceptor (AC: 2)
  - [x] Generate `NetworkErrorHandlerInterceptor` (`mobile/src/app/core/interceptors/network-error.interceptor.ts`).
  - [x] Implement interception of HTTP errors `status === 0` and `status === 503`.
  - [x] Implement fallback check to `health-check.service.ts` `pingBackend()` to definitively confirm offline state.
  - [x] Implement routing to a generic "Serveur Indisponible" empty state.
- [x] Task 3: Security Context Interceptor (AC: 3)
  - [x] Generate `SecurityContextInterceptor` (`mobile/src/app/core/interceptors/security-context.interceptor.ts`).
  - [x] Extract `commercialUsername` from the active JWT or local secure storage.
  - [x] Mutate all outgoing payloads to `/api/stock-requests`, `/api/stock-returns`, `/api/v1/stock-tontine-*` to include this identity automatically.
- [x] Task 4: Module Provider Registration
  - [x] Register both new Interceptors in the app's root provider list.

## Dev Notes

- **Architecture Constraints:** Must strictly follow the Container-Presenter pattern.
- **Framework Constraints:** Angular components must not be standalone (`standalone: false`). This is critical to adhere to the legacy codebase style.
- **Error Handling Strategy:** Do not trust the native mobile network API. `health-check.service.ts` is the *absolute* source of truth.

### Project Structure Notes

- Feature Code: `mobile/src/app/stock/`
- Interceptors: `mobile/src/app/core/interceptors/`

### References

- [Source: PRD FR16, FR17, FR18, FR21]
- [Source: Architecture - SecurityContextInterceptor & NetworkErrorHandlerInterceptor decisions]

## Dev Agent Record

### Agent Model Used
Gemini 3.1 Pro (High)

### Debug Log References
- Extracted user identity correctly using AuthService since it manages local storage asynchronously and exposes the state.
- Verified Network Error routes to /server-unavailable on pingBackend() false result.

### Completion Notes List
- Scaffolded `StockModule` and `StockDashboardComponent`.
- Included routing for `/stock` in `app-routing.module.ts`.
- Implemented `NetworkErrorHandlerInterceptor` to intercept HTTP errors 0 and 503 and perform a health check before redirecting to offline screen.
- Implemented `SecurityContextInterceptor` to attach `commercialUsername` to `stock-requests`, `stock-returns`, and `stock-tontine-*` APIs on POST/PUT/PATCH.
- Registered interceptors in `app.module.ts`.
- Authored test suites for both interceptors.

### File List
- `mobile/src/app/stock/stock.module.ts`
- `mobile/src/app/stock/stock-routing.module.ts`
- `mobile/src/app/stock/dashboard/stock-dashboard.component.ts`
- `mobile/src/app/stock/dashboard/stock-dashboard.component.html`
- `mobile/src/app/stock/dashboard/stock-dashboard.component.scss`
- `mobile/src/app/stock/dashboard/stock-dashboard.component.spec.ts`
- `mobile/src/app/core/interceptors/network-error.interceptor.ts`
- `mobile/src/app/core/interceptors/network-error.interceptor.spec.ts`
- `mobile/src/app/core/interceptors/security-context.interceptor.ts`
- `mobile/src/app/core/interceptors/security-context.interceptor.spec.ts`
- `mobile/src/app/app-routing.module.ts`
- `mobile/src/app/app.module.ts`

## Senior Developer Review (AI)

**Review Date:** 2026-04-27
**Reviewer:** Claude Sonnet 4.6 (Thinking)
**Outcome:** Changes Requested → All fixed automatically

### Action Items

- [x] [High] Infinite loop risk: interceptor was catching its own health-check HTTP call — added `/actuator/health` guard in `network-error.interceptor.ts`
- [x] [High] Silent username drop: `SecurityContextInterceptor` passed request without `commercialUsername` when user is null, violating AC3 — now logs warning with `this.log.log()` and `console.log()`
- [x] [High] Non-exclusive navigation/error: interceptor fired `router.navigate` AND `throwError` simultaneously — fixed to return `EMPTY` after navigating
- [x] [Med] Unused `from` import in `network-error.interceptor.ts` — removed
- [x] [Med] Unused `from` and `switchMap` imports in `security-context.interceptor.ts` — removed
- [x] [Med] `NetworkErrorHandlerInterceptor` spec had only 1 test — expanded to 5 covering status 503, online-transient, 404, and recursion guard
- [x] [Med] `SecurityContextInterceptor` spec missing null-user path — added; also added PUT and PATCH coverage
