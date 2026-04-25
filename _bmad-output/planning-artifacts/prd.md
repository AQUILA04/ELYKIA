---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
inputDocuments:
  - 'c:\Users\kahonsu\Documents\GitHub\ELYKIA\docs\cahier_charges_stock_mobile.md'
  - 'c:\Users\kahonsu\Documents\GitHub\ELYKIA\docs\Spécification Visuelle - Module de Gestion des Stocks ELYKIA (Application Mobile).md'
workflowType: 'prd'
classification:
  projectType: 'Mobile Application (Ionic/Angular)'
  domain: 'Enterprise Logistics / Fintech (Stock Management & Tontines)'
  complexity: 'Medium-High'
  projectContext: 'Brownfield'
---

# Product Requirements Document: ELYKIA Mobile Stock Management

**Author:** Francis
**Date:** 2026-04-25

## Executive Summary
This document outlines the requirements for integrating a comprehensive Stock Management module into the existing ELYKIA mobile application. Built using Ionic and Angular, the module allows field agents (collectors) to request and return both Standard and Tontine stock items directly from their tablets or smartphones. The primary objective is to replace manual communication (like WhatsApp) with a premium, real-time, "Online-First" mobile interface that ensures strict data segregation and flawless operation even in areas with unreliable network coverage.

## Success Criteria

### User Success
- **Streamlined Navigation:** Field agents access the stock module via a single dashboard menu and toggle effortlessly between "Standard" and "Tontine" contexts using an intuitive tab or select box system.
- **Device Flexibility:** The interface provides a perfectly responsive experience, scaling fluidly from mobile phones to larger tablet devices.
- **Immediate Feedback:** Agents are never left guessing; clear, color-coded badges display real-time request statuses, and a distinct "Serveur Indisponible" state prevents confusion when connectivity is lost.

### Business & Technical Success
- **Traceability & Security:** Complete real-time tracking of stock movements. Strict data segregation guarantees that commercial agents only interact with their own records.
- **Architectural Efficiency:** Standard and Tontine flows share 100% of their underlying UI components (Container-Presenter pattern), drastically reducing code duplication.
- **Framework Adherence:** All new Angular components strictly maintain the `standalone: false` decorator property, and all actions utilize the dual-logging system (`this.log.log` and `console.log`).

## Product Scope & Phased Development

### MVP Strategy & Philosophy
**Approach:** Experience MVP. The backend APIs already exist; the objective is to deliver a premium, frictionless mobile interface that drives field agent adoption.

### Phase 1: Minimum Viable Product
- **Unified Dashboard:** A single UI handling 4 core flows: List, Create, and Cancel for both Stock Requests (Sorties) and Stock Returns (Retours), covering Standard and Tontine contexts.
- **Premium UI Components:** Use of Floating Action Buttons (FAB), Bottom Sheets for item selection, and numeric Steppers.
- **Global Error Handling:** The app strictly relies on `health-check.service.ts` (`pingBackend()`) as the absolute source of network truth, overriding native device network status. This ensures seamless operation across both local private servers and future cloud deployments.
- **Implicit Security:** Automatic injection of the authenticated `commercialUsername` into all payloads.

### Phase 2: Growth
- Advanced search and historical filtering by date or category.
- Push notifications for Back-Office validation events.
- Device camera integration for barcode/QR code scanning.

### Phase 3: Vision
- Full offline-first synchronization capabilities (via local SQLite) if network reliability proves too restrictive.
- AI-driven smart restocking suggestions based on historical request velocity.

## User Journeys

### Journey 1: The Fast-Paced Field Request (Success Path)
**Persona:** Jean (Field Agent / Collecteur)
Jean is at an agency preparing for his route. A priority Tontine client needs a hardware item. Jean opens the ELYKIA app on his tablet, accesses the unified Stock menu, and toggles to "Tontine". He taps the FAB, selects the item via the bottom sheet, sets the quantity, and taps "Soumettre". A success toast appears instantly, and his request shows a yellow `[EN ATTENTE]` badge. Minutes later, the back-office approves it, and the badge turns blue `[VALIDÉ]`. Jean grabs the item and leaves, fully compliant.

### Journey 2: The Connectivity Blackout (Edge Case)
**Persona:** Amina (Field Agent)
Amina is in a remote area and needs to declare a defective stock return. She submits the form, but the network drops. Instead of a silent crash, the global HTTP interceptor catches the timeout. The screen transitions to a premium empty state: "Serveur Indisponible. Veuillez vérifier votre connexion." Amina keeps the app open, drives to a 4G zone, taps "Réessayer", and the request succeeds.

### Journey 3: The Operations Sync (Admin Lens)
**Persona:** Marc (Logistics Manager)
Marc reviews requests at the central warehouse. Because the mobile app automatically attaches the `commercialUsername` to every API call invisibly, Marc sees perfectly segregated data on his dashboard. He validates requests securely, knowing the mobile app's architecture prevents any agent from manipulating another's data.

## Technical & Domain Constraints

### Compliance & Risk Mitigation
- **Financial Auditability:** Tontine stock requests directly impact financial balances. All movements are strictly logged with immutable timestamps.
- **State Immutability:** Agents cannot alter requests once they reach a terminal state (`VALIDATED`, `DELIVERED`, `REFUSED`, `CANCELLED`).
- **Data Segregation Risk:** To prevent cross-contamination, the backend independently verifies that requested item IDs belong to the logged-in `commercialUsername`.
- **Idempotency:** Given flaky networks, creation endpoints or frontend state management must aggressively prevent duplicate submissions from frustrated "double-taps".

### Mobile Platform Architecture
- **Online-First Focus:** This module relies on real-time data API calls rather than local SQLite synchronization.
- **Responsive Scaling:** CSS Flexbox/Grid ensures UI scales elegantly without horizontal scrolling from 375px up to iPad resolutions.

## Functional Requirements

### Navigation & Context Management
- FR1: Field Agents can access the Stock module from a unified entry point on the main dashboard.
- FR2: Field Agents can seamlessly toggle the active data context between "Standard" stock and "Tontine" stock.
- FR3: Field Agents can experience fully responsive interactions whether using a small mobile phone or a larger tablet device.

### Stock Request Management (Sorties)
- FR4: Field Agents can view a historical list of their own submitted stock requests.
- FR5: Field Agents can instantly recognize the real-time status of their requests (e.g., Pending, Validated, Delivered, Refused).
- FR6: Field Agents can initiate a new stock request.
- FR7: Field Agents can search for and select specific items from an available catalog when creating a request.
- FR8: Field Agents can specify the exact numerical quantity for the requested item.
- FR9: Field Agents can cancel a pending stock request before it is processed by the back-office.
- FR10: The system prevents Field Agents from modifying or cancelling a request once it reaches a terminal or processed state.

### Stock Return Management (Retours)
- FR11: Field Agents can view a historical list of their own submitted stock returns.
- FR12: Field Agents can instantly recognize the status of their returns.
- FR13: Field Agents can initiate a new stock return.
- FR14: Field Agents can search, select the item, and specify the quantity to return.
- FR15: Field Agents can cancel a pending stock return before it is processed.

### System Resilience & Error Recovery
- FR16: The system can reliably determine if the backend server is reachable, strictly prioritizing the `health-check.service.ts` ping response over the device's generic internet connection status.
- FR17: The system gracefully intercepts all server unreachability events (e.g., timeouts, 503s) without crashing.
- FR18: Field Agents are immediately notified with a clear "Server Unavailable" block when the backend is unreachable.
- FR19: Field Agents can manually trigger a retry action from the error state once they regain connectivity.
- FR20: The system automatically prevents duplicate record creation if an agent attempts multiple submissions during high network latency (Idempotency control).

### Traceability & Security
- FR21: The system securely associates all interactions and data requests with the authenticated Field Agent's identity implicitly, without requiring manual ID entry.
- FR22: The system strictly filters all displayed data to ensure Field Agents only view and interact with their own stock records.
- FR23: The system comprehensively records all critical user actions, state changes, and API responses to local system logs for strict field auditability.

## Non-Functional Requirements

### Performance
- **NFR1:** The user interface must provide immediate visual feedback (e.g., Skeleton loaders, spinners, or button disabling) within **200ms** of any user interaction (tap, submit, segment switch) to ensure the app feels highly responsive.
- **NFR2:** The "Serveur Indisponible" empty state must render in under **500ms** after the `health-check.service.ts` ping registers a failure, preventing infinite loading screens.

### Security
- **NFR3:** The `commercialUsername` used for data segregation must be extracted securely from local secure storage or the authenticated JWT payload; it must *never* be exposed as an editable or manipulable field in the UI or local storage.
- **NFR4:** All local activity logs generated by the dual-logging system (`this.log.log`) must be retained securely on the device up to a maximum file size of **5MB** before log rotation occurs, preventing local storage exhaustion.

### Accessibility (Mobile UX)
- **NFR5:** All interactive elements (FABs, buttons, list items, segment toggles) must have a minimum touch target size of **44x44 pixels** to ensure flawless operation by agents in the field.
- **NFR6:** All input fields must use a minimum font size of **16px** to guarantee readability in outdoor environments and to prevent automatic screen zooming on iOS devices.
- **NFR7:** The contrast ratio for all text elements against the updated brand colors (Primary `#1E40AF`, Secondary `#64748B`) must meet or exceed the **WCAG AA standard (4.5:1)**.

### Integration (Network Reliability)
- **NFR8:** The `health-check.service.ts` must execute its `pingBackend()` connectivity check immediately upon intercepting any `status 0` or `status 503` API failure, serving as the absolute source of truth for the UI state.
