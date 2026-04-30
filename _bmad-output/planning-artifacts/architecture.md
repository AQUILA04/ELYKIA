---
stepsCompleted:
- 1
- 2
- 3
- 4
- 5
- 6
- 7
- 8
lastStep: 8
status: 'complete'
completedAt: '2026-04-25T16:13:00+04:00'
inputDocuments:
- C:/Users/kahonsu/Documents/GitHub/ELYKIA/_bmad-output/planning-artifacts/prd.md
- C:/Users/kahonsu/Documents/GitHub/ELYKIA/docs/architecture-mobile.md
- C:/Users/kahonsu/Documents/GitHub/ELYKIA/docs/development-guide-mobile.md
- C:/Users/kahonsu/Documents/GitHub/ELYKIA/docs/state-management-patterns-mobile.md
- C:/Users/kahonsu/Documents/GitHub/ELYKIA/docs/ui-component-inventory-mobile.md
workflowType: architecture
project_name: ELYKIA
user_name: Francis
date: 2026-01-28T11:56:13.323Z
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
Based on the PRD, there are 23 FRs across 5 areas. Architecturally, this requires a unified "Container" component managing the context state (Standard vs. Tontine) and isolated "Presenter" components for rendering Lists and Forms. It also necessitates a robust global HTTP interceptor to handle offline states, and a security service to implicitly extract and inject the agent's ID.

**Non-Functional Requirements:**
- **Performance (200ms UI response):** Dictates the need for optimistic UI patterns and eager skeleton loaders.
- **Network Resilience:** The `health-check.service.ts` must dictate the application's online/offline state, overriding native device network APIs.
- **Security:** `commercialUsername` must be strictly handled at the service layer via interceptors, completely bypassing the UI forms.

**Scale & Complexity:**
- Primary domain: Mobile Application (Ionic/Angular)
- Complexity level: Medium-High
- Estimated architectural components: ~8-10 (Container, Presenters, HTTP Interceptor, State Managers).

### Technical Constraints & Dependencies
- Strict adherence to `standalone: false` Angular module structure.
- Dual-logging telemetry requirement (`this.log.log` + `console.log`).
- Existing Backend endpoints are locked and must be accommodated as-is.

### Cross-Cutting Concerns Identified
- **Network Graceful Degradation:** A universal interceptor to trap `status 0` and `503` to trigger the "Serveur Indisponible" UI.
- **Context State Management:** Ensuring no data leakage when switching between Standard and Tontine views using the exact same UI components.
- **Implicit Security Payload Modification:** Injecting `commercialUsername` dynamically into every POST request.

## Starter Template Evaluation

### Primary Technology Domain
Mobile Application (Ionic Framework with Angular)

### Starter Options Considered
**N/A - Brownfield Integration**
This is a brownfield project. The PRD specifies integrating a new Stock Management module into the existing ELYKIA mobile application codebase. Therefore, creating a new project from a starter template CLI is not applicable.

### Selected Foundation: Existing ELYKIA Mobile App

**Rationale for Selection:**
The PRD mandates integration into the existing application to provide field agents with a unified tool. We must strictly adhere to the existing architectural patterns and established logging systems.

**Initialization Command:**
```bash
# N/A - Project already exists. Developers will pull the latest mobile branch.
```

**Architectural Decisions Provided by Existing Foundation:**

**Language & Runtime:**
TypeScript and standard Angular execution environment.

**Styling Solution:**
Ionic SCSS utilities with custom global styles adhering to the brand colors (Primary `#1E40AF`, Secondary `#64748B`).

**Build Tooling:**
Angular CLI.

**Testing Framework:**
Existing Jasmine/Karma and Playwright setups already established in the repository.

**Code Organization:**
Standard Angular Feature Modules using `standalone: false`.

**Development Experience:**
Standard `ionic serve` and device emulators.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Unified UI with Container/Presenter Pattern to support both Standard and Tontine without duplicated code.
- Global Error Interceptor for strict Online-First `0`/`503` routing to "Serveur Indisponible".

**Important Decisions (Shape Architecture):**
- Implicit Security Token Injection (attaching `commercialUsername` to all POST requests invisibly).

**Deferred Decisions (Post-MVP):**
- Complete SQLite Offline-First sync strategies are deferred to Phase 3. The current model is strictly Online-First with graceful error degradation.

### Data Architecture
- **State Management:** The module will use lightweight RxJS `BehaviorSubject`s within a `StockStateService` to maintain the active context (Standard vs Tontine) rather than complex NgRx stores.
- **Local Persistence:** Transient data only during the MVP. Dual-logging strings will be saved via standard file/storage mechanisms on the device, capped at 5MB (as per NFR4).

### Authentication & Security
- **Security Context:** A specialized Angular HTTP Interceptor (`SecurityContextInterceptor`) will extract the `commercialUsername` from the existing auth session and append it to all outgoing payloads for the stock endpoints.

### API & Communication Patterns
- **API Design:** Adherence to existing REST paradigms.
- **Error Handling:** A global `NetworkErrorHandlerInterceptor` that listens specifically for HttpErrorResponses with status `0` (Timeout/No Route) and `503` (Service Unavailable), utilizing `Router.navigate()` to route to a shared "Server Unavailable" empty state.

### Frontend Architecture
- **Component Architecture:** The "Container-Presenter" pattern. A parent `StockDashboardComponent` will handle API calls and manage the context state. It will pass data downwards to "dumb" `StockListComponent` and `StockFormComponent` presenters.
- **Routing Strategy:** A single route (`/stock`) hosting the dashboard, relying on UI segment controls (tabs) to toggle context rather than sub-routes, ensuring rapid, fluid transitions.

### Infrastructure & Deployment
- **Packaging:** Standard Ionic Capacitor builds targeting Android and iOS, relying on the existing project CI/CD pipeline.

### Decision Impact Analysis

**Implementation Sequence:**
1. Generate `StockStateService` and `NetworkErrorHandlerInterceptor` (Foundation).
2. Create Presenter Components (`StockList`, `StockForm`) with mocked inputs.
3. Build the Container Component (`StockDashboard`) and wire API services.
4. Implement the "Serveur Indisponible" global empty state.

**Cross-Component Dependencies:**
- The Container relies heavily on the `StockStateService` to know which backend API to call (Standard vs Tontine endpoints) when the Presenter form emits a "Submit" event.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined
To ensure multiple AI agents and developers write compatible code, we must enforce strict consistency around the existing Angular/Ionic codebase.

### Naming Patterns

**API & Payload Naming Conventions:**
- JSON payloads must match the Java backend exactly (typically camelCase). No snake_case mapping unless explicitly required by the backend.

**Code Naming Conventions:**
- Files: kebab-case (e.g., `stock-dashboard.component.ts`).
- Classes: PascalCase (e.g., `StockDashboardComponent`).
- Component Selectors: `app-` prefix + kebab-case (e.g., `app-stock-dashboard`).

### Structure Patterns

**Project Organization:**
- All stock-related code must reside within `mobile/src/app/stock/`.
- The module must be declared as an NgModule (`StockModule`), NOT as standalone components.

**File Structure Patterns:**
- Feature components go in `components/`.
- Services go in `services/`.
- Models/Interfaces go in `models/`.

### Format Patterns

**API Response Formats:**
- The frontend must expect and parse the standard API response wrapper: `Response.builder().status(...).message(...).data(data).build();`.
- The actual entity payload is ALWAYS inside the `.data` property.

**Data Exchange Formats:**
- Context state must be explicitly typed using a literal type: `type StockContext = 'STANDARD' | 'TONTINE';`.

### Communication Patterns

**State Management Patterns:**
- Context toggling will NOT use URL query parameters (which forces re-renders). It will use a `BehaviorSubject<StockContext>` within the `StockStateService`.
- Presenter components will receive the current context via `@Input() context: StockContext;` and emit actions via `@Output() submitRequest = new EventEmitter<Payload>();`.

### Process Patterns

**Error Handling Patterns:**
- Any HTTP call must be caught by a generic error handler. If status is `0` or `503`, the user is immediately routed to the shared offline empty state.
- **CRITICAL:** `mobile/src/app/core/services/health-check.service.ts` `.pingBackend()` takes precedence over `Network.status` for determining offline state.

**Loading State Patterns:**
- Prefer eager Skeleton loaders for lists over full-page blocking spinners to meet the 200ms responsiveness NFR.

### Enforcement Guidelines

**All AI Agents MUST:**
- Never remove `standalone: false` from Angular components.
- Always implement the dual-logging system (`this.log.log()` and `console.log()`) for all submit/cancel/error actions.
- Always derive `commercialUsername` dynamically from the Auth service, never hardcoding it or taking it from a UI input.

### Pattern Examples

**Good Examples:**
```typescript
@Component({
  selector: 'app-stock-list',
  templateUrl: './stock-list.component.html',
  standalone: false
})
export class StockListComponent {
  @Input() context: 'STANDARD' | 'TONTINE';
  
  submit() {
    this.log.log('Stock request initiated');
    console.log('Stock request initiated');
  }
}
```

**Anti-Patterns:**
```typescript
// ❌ ANTI-PATTERN: Using standalone components
@Component({ standalone: true }) 

// ❌ ANTI-PATTERN: Failing to use dual logging
submit() { console.log('Submitted'); }

// ❌ ANTI-PATTERN: Trusting device network over pingBackend
if (Network.status.connected) { ... }
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
mobile/src/app/
├── core/
│   ├── interceptors/
│   │   ├── network-error-handler.interceptor.ts
│   │   └── security-context.interceptor.ts
│   └── services/
│       └── health-check.service.ts
└── stock/
    ├── stock.module.ts
    ├── stock-routing.module.ts
    ├── components/
    │   ├── stock-dashboard/ (Container)
    │   │   ├── stock-dashboard.component.ts
    │   │   ├── stock-dashboard.component.html
    │   │   └── stock-dashboard.component.scss
    │   ├── stock-list/ (Presenter)
    │   │   ├── stock-list.component.ts
    │   │   ├── stock-list.component.html
    │   │   └── stock-list.component.scss
    │   └── stock-form/ (Presenter)
    │       ├── stock-form.component.ts
    │       ├── stock-form.component.html
    │       └── stock-form.component.scss
    ├── services/
    │   ├── stock-api.service.ts
    │   └── stock-state.service.ts
    └── models/
        └── stock.model.ts
```

### Architectural Boundaries

**API Boundaries:**
- The `StockApiService` encapsulates all HTTP traffic to the backend stock controllers (`/api/stock-requests`, `/api/stock-returns`, `/api/v1/stock-tontine-request`, `/api/v1/stock-tontine-return`). No components are permitted to inject the `HttpClient` directly.

**Component Boundaries:**
- **Container (`stock-dashboard`):** Injects `StockApiService` and `StockStateService`. Subscribes to the data, manages loading states, and passes data downward.
- **Presenter (`stock-list`, `stock-form`):** Strictly relies on `@Input()` for data and `@Output()` for user actions. No service injection is allowed here except perhaps utility/logging services.

**Service Boundaries:**
- **`StockStateService`:** Pure state management. Holds `BehaviorSubject<'STANDARD' | 'TONTINE'>` and does not call HTTP.

**Data Boundaries:**
- Transient context state dies when the user navigates away from the `/stock` route.

### Requirements to Structure Mapping

**Feature Mapping:**
- **FR4-5, FR11-12 (Viewing Lists):** `stock-list.component.ts`
- **FR6-8, FR13-14 (Creating Requests/Returns):** `stock-form.component.ts`
- **FR2 (Context Toggling):** `stock-dashboard.component.ts` (Segmented Control UI) & `stock-state.service.ts`

**Cross-Cutting Concerns:**
- **FR16-FR19 (Resilience & Offline):** `network-error-handler.interceptor.ts` and `health-check.service.ts`
- **FR21-22 (Implicit Security):** `security-context.interceptor.ts`

### Integration Points

**Internal Communication:**
The Dashboard container listens to the `submitRequest` event emitted by the Form presenter, queries the `StockStateService` to determine the active context, and calls the appropriate method on the `StockApiService`.

**External Integrations:**
The backend API is the sole external integration. The `SecurityContextInterceptor` invisibly attaches the required `commercialUsername` based on the active JWT session to all outbound stock HTTP requests.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All architectural decisions align tightly with the existing ELYKIA Ionic/Angular stack. The Container-Presenter pattern directly supports the need to share UI components while managing different API contexts (Standard vs. Tontine).

**Pattern Consistency:**
Logging, network resilience, and UI paradigms are consistent with the existing `health-check.service` and the PRD's stringent `standalone: false` constraint.

**Structure Alignment:**
The provided file tree cleanly separates state (services), interception (core), and UI (components), ensuring a modular footprint that won't disrupt existing application flows.

### Requirements Coverage Validation ✅

**Epic/Feature Coverage:**
- The Container structure covers the Context Selection (FR2).
- The List Presenter handles Sorties (FR4) and Retours (FR11).
- The Form Presenter handles standard creations (FR6, FR13) and tontine equivalents.

**Non-Functional Requirements Coverage:**
- NFR1 (200ms load) supported via Skeleton loaders.
- NFR2/NFR5 (Resilience) supported via Interceptors.
- NFR10 (Dual Logging) mandated in Implementation Patterns.

### Implementation Readiness Validation ✅

**Decision Completeness:**
All component names, module structures, and service roles are explicitly defined and ready for scaffolding.

**Gap Analysis Results:**
No critical gaps remain. The architecture provides a crystal-clear path for AI agents or developers to execute the tasks safely.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Very low risk of breaking existing app code thanks to strict module encapsulation.
- Excellent separation of concerns via the Container-Presenter approach.
- Robust, global approach to "Server Unavailable" states that satisfies business requirements for remote field agents.

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented.
- Use implementation patterns consistently across all components.
- Respect project structure and boundaries.
- Refer to this document for all architectural questions.

**First Implementation Priority:**
Generate the foundational services (`StockStateService`, `StockApiService`) and Interceptors before touching the UI.
