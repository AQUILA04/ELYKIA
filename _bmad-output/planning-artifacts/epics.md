---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: 
  - C:/Users/kahonsu/Documents/GitHub/ELYKIA/_bmad-output/planning-artifacts/prd.md
  - C:/Users/kahonsu/Documents/GitHub/ELYKIA/_bmad-output/planning-artifacts/architecture.md
  - C:/Users/kahonsu/Documents/GitHub/ELYKIA/docs/Spécification Visuelle - Module de Gestion des Stocks ELYKIA (Application Mobile).md
---

# ELYKIA - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for ELYKIA, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: The system shall provide a unified dashboard for viewing Stock Requests and Returns.
FR2: The user shall be able to toggle between "Standard" and "Tontine" operational modes.
FR3: The system shall display a list of Stock Requests (Standard or Tontine based on active mode).
FR4: The system shall display a list of Stock Returns (Standard or Tontine based on active mode).
FR5: The user shall be able to view details of an existing Request/Return.
FR6: The user shall be able to cancel a pending Request/Return.
FR7: The user shall be able to create a new Standard Stock Request (Select Agency, add items, set quantities).
FR8: The user shall be able to create a new Tontine Stock Request (Requires selecting a Client and Contract reference).
FR9: The user shall be able to create a new Standard Stock Return (Select Agency, specify returned items, log comments).
FR10: The user shall be able to create a new Tontine Stock Return (Specify client and contract context).
FR11: The system must enforce idempotency to prevent duplicate creation requests.

### NonFunctional Requirements

NFR1: Performance - The UI shall respond to user interactions (taps, mode switching) within 200ms using optimistic UI/skeletons.
NFR2: Reliability - The system must gracefully handle offline scenarios without crashing.
NFR3: Security - All payload requests must implicitly include the authenticated `commercialUsername` without UI exposure.
NFR4: Storage - Local device storage must be utilized strictly for telemetry/dual-logging, capped at 5MB.
NFR5: Network Resilience - `health-check.service.ts` pingBackend() must dictate online truth, overriding native device network APIs.

### Additional Requirements

- **Architecture:** Must implement the Container-Presenter pattern (`StockDashboard` as container, `StockList` / `StockForm` as presenters).
- **Architecture:** Must declare all code in a single feature NgModule (`StockModule`) with `standalone: false`.
- **Architecture:** Must implement `NetworkErrorHandlerInterceptor` to intercept HTTP status 0 and 503 and route to a shared "Serveur Indisponible" screen.
- **Architecture:** Must implement `SecurityContextInterceptor` for dynamic token payload injection.
- **UX Design:** Adhere to Digital Atelier System colors (Primary `#1E40AF`, Secondary `#64748B`).
- **UX Design:** Touch targets must be at least 44x44px.
- **UX Design:** Use Segmented Controls for standard/tontine toggles instead of full route transitions.
- **UX Design:** Provide explicit "Serveur Indisponible" visual error state.

### FR Coverage Map

- **FR1:** Epic 1 (Unified dashboard UI)
- **FR2:** Epic 1 (Standard/Tontine context toggle)
- **FR3:** Epic 1 (View Stock Requests lists)
- **FR4:** Epic 1 (View Stock Returns lists)
- **FR5:** Epic 1 (View operation details)
- **FR6:** Epic 2 & 3 (Cancel pending operations)
- **FR7:** Epic 2 (Create Standard Request)
- **FR8:** Epic 3 (Create Tontine Request)
- **FR9:** Epic 2 (Create Standard Return)
- **FR10:** Epic 3 (Create Tontine Return)
- **FR11:** Epic 2 & 3 (Idempotency and duplicate prevention)

## Epic List

### Epic 1: Mobile Stock Dashboard & Viewer Foundation
**Goal:** Establish the offline-ready base application context, allowing field agents to securely open the stock dashboard, switch between operational modes, and view all historical stock movements.
**FRs covered:** FR1, FR2, FR3, FR4, FR5

### Story 1.1: Dashboard Scaffold & Interceptors (Foundation)

As a mobile developer,
I want to create the StockModule, Dashboard Container, and global interceptors,
So that the application has a secure, offline-aware foundation for stock features.

**Acceptance Criteria:**

**Given** a logged-in user
**When** they navigate to `/stock`
**Then** the `StockDashboardComponent` loads successfully
**And** the component is declared in a `standalone: false` NgModule.

**Given** a network failure (status `0` or `503`)
**When** an API call is made
**Then** the user is immediately routed to the "Serveur Indisponible" screen.

**Given** an outbound API call
**When** the payload is sent
**Then** the `commercialUsername` is injected automatically by the `SecurityContextInterceptor`.

### Story 1.2: Context Toggle State Management (FR1, FR2)

As a field agent,
I want to toggle between "Standard" and "Tontine" modes using a segmented control,
So that I can easily view the correct stock operations without leaving the page.

**Acceptance Criteria:**

**Given** the dashboard is loaded
**When** I click the "Tontine" segment
**Then** the `StockStateService` updates its `BehaviorSubject` to 'TONTINE'.

**Given** the context changes
**When** the child presenters are rendered
**Then** they receive the correct context state via an `@Input()` binding.

### Story 1.3: Stock Requests List View (FR3)

As a field agent,
I want to view a list of my historical Stock Requests,
So that I can track pending and completed requests.

**Acceptance Criteria:**

**Given** the dashboard is set to "Standard"
**When** the list loads
**Then** it fetches data exclusively from `/api/stock-requests`.

**Given** the dashboard is set to "Tontine"
**When** the list loads
**Then** it fetches data exclusively from `/api/v1/stock-tontine-request`.

**Given** the API is experiencing latency
**When** the list is loading
**Then** a Skeleton loader (compliant with 200ms NFR) is displayed instead of a full-page blocking spinner.

### Story 1.4: Stock Returns List View (FR4)

As a field agent,
I want to view a list of my historical Stock Returns,
So that I know what equipment I have officially returned.

**Acceptance Criteria:**

**Given** the active context (Standard or Tontine)
**When** the returns tab is selected
**Then** it fetches data from the respective Returns API endpoint.

**Given** the list is loaded with many items
**When** I scroll
**Then** the list supports smooth native scrolling with tap targets of at least 44x44px.

### Story 1.5: Detailed Operation View (FR5)

As a field agent,
I want to tap on a request or return to see its detailed contents,
So that I know exactly what items and quantities were involved.

**Acceptance Criteria:**

**Given** the populated list view
**When** I tap a specific list item
**Then** a detailed modal/view opens showing itemized quantities and the current status.

### Epic 2: Standard Stock Operations
**Goal:** Enable agents to actively create and cancel standard stock requests and returns directly from the field, ensuring they don't accidentally submit duplicates.
**FRs covered:** FR6 (Standard), FR7, FR9, FR11

### Story 2.1: Cancel Pending Standard Operations (FR6)

As a field agent,
I want to cancel a standard stock request or return that is still pending,
So that I can correct mistakes before the agency processes the items.

**Acceptance Criteria:**

**Given** a pending stock operation in the list view
**When** I tap "Cancel"
**Then** a confirmation dialog appears to prevent accidental touches.

**Given** I confirm the cancellation
**When** the API successfully processes it
**Then** the list updates optimistically.

**Given** a cancellation action
**When** the user confirms
**Then** the action is dual-logged locally (max 5MB storage overall).

### Story 2.2: Create Standard Stock Request (FR7)

As a field agent,
I want to fill out a form to request standard stock,
So that I can replenish my inventory.

**Acceptance Criteria:**

**Given** I tap "New Request" in standard mode
**When** the form opens
**Then** I can select an Agency, add item variations, and set quantities.

**Given** a completed form
**When** I submit
**Then** a POST is sent to `/api/stock-requests` with the correct JSON schema.

**Given** a submission
**When** it begins
**Then** the submit button enters a disabled loading state.

### Story 2.3: Create Standard Stock Return (FR9)

As a field agent,
I want to document a standard stock return to the agency,
So that I can formally release liability for the items.

**Acceptance Criteria:**

**Given** I tap "New Return" in standard mode
**When** the form opens
**Then** I must be able to select the target Agency, list the specific returned items, and log comments.

**Given** a completed form
**When** I submit
**Then** a POST is sent to `/api/stock-returns`.

### Story 2.4: Prevent Duplicate Submissions (FR11)

As a field agent,
I want the system to prevent me from accidentally submitting the same form twice,
So that I don't accidentally request double inventory due to a slow network.

**Acceptance Criteria:**

**Given** I tap submit on any creation form
**When** the request is inflight
**Then** the UI entirely prevents secondary submissions.

**Given** a submission fails with a network error
**When** I am routed to the "Serveur Indisponible" screen
**Then** my form state is preserved so I can manually retry later.

### Epic 3: Tontine Stock Operations
**Goal:** Enable agents to manage specialized Tontine stock requests and returns, seamlessly linking stock to specific clients and contracts.
**FRs covered:** FR6 (Tontine), FR8, FR10

<!-- Repeat for each epic in epics_list (N = 1, 2, 3...) -->

## Epic {{N}}: {{epic_title_N}}

{{epic_goal_N}}

### Story 3.1: Cancel Pending Tontine Operations (FR6)

As a field agent,
I want to cancel a Tontine stock request or return that is still pending,
So that I can correct mistakes before the agency processes the client's items.

**Acceptance Criteria:**

**Given** a pending Tontine operation in the list view
**When** I tap "Cancel"
**Then** a confirmation dialog appears to prevent accidental touches.

**Given** I confirm the cancellation
**When** the API successfully processes it
**Then** the list updates optimistically.

### Story 3.2: Create Tontine Stock Request (FR8)

As a field agent,
I want to fill out a form to request Tontine stock,
So that I can fulfill specific client contracts.

**Acceptance Criteria:**

**Given** I tap "New Request" in Tontine mode
**When** the form opens
**Then** I must select a specific Client and Contract reference, along with item variations and quantities.

**Given** a completed form
**When** I submit
**Then** a POST is sent to `/api/v1/stock-tontine-request`.

**Given** the submission completes
**When** it succeeds
**Then** I am routed back to the main Tontine dashboard view.

### Story 3.3: Create Tontine Stock Return (FR10)

As a field agent,
I want to document a Tontine stock return,
So that I can officially release liability for specific client items.

**Acceptance Criteria:**

**Given** I tap "New Return" in Tontine mode
**When** the form opens
**Then** I must select the client context and list the specific returned items.

**Given** a completed form
**When** I submit
**Then** a POST is sent to `/api/v1/stock-tontine-return`.
