# Story 1.1: Dashboard Scaffold & Interceptors (Foundation)

Status: ready-for-dev

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

- [ ] Task 1: Foundation Scaffolding (AC: 1)
  - [ ] Generate `StockModule` (`mobile/src/app/stock/stock.module.ts`).
  - [ ] Generate `StockDashboardComponent` (`mobile/src/app/stock/dashboard/stock-dashboard.component.ts`).
  - [ ] Ensure all new components use `@Component({ standalone: false })`.
  - [ ] Setup lazy-loaded routing for `/stock`.
- [ ] Task 2: Network Resiliency Interceptor (AC: 2)
  - [ ] Generate `NetworkErrorHandlerInterceptor` (`mobile/src/app/core/interceptors/network-error.interceptor.ts`).
  - [ ] Implement interception of HTTP errors `status === 0` and `status === 503`.
  - [ ] Implement fallback check to `health-check.service.ts` `pingBackend()` to definitively confirm offline state.
  - [ ] Implement routing to a generic "Serveur Indisponible" empty state.
- [ ] Task 3: Security Context Interceptor (AC: 3)
  - [ ] Generate `SecurityContextInterceptor` (`mobile/src/app/core/interceptors/security-context.interceptor.ts`).
  - [ ] Extract `commercialUsername` from the active JWT or local secure storage.
  - [ ] Mutate all outgoing payloads to `/api/stock-requests`, `/api/stock-returns`, `/api/v1/stock-tontine-*` to include this identity automatically.
- [ ] Task 4: Module Provider Registration
  - [ ] Register both new Interceptors in the app's root provider list.

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

### Debug Log References

### Completion Notes List

### File List
