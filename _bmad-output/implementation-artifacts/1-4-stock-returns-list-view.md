# Story 1.4: Stock Returns List View (FR4)

Status: done

## Story

As a field agent,
I want to view a list of my historical Stock Returns,
so that I know what equipment I have officially returned.

## Acceptance Criteria

1. **Given** the active context (Standard or Tontine) **When** the returns tab is selected **Then** it fetches data from the respective Returns API endpoint.
2. **Given** the list is loaded with many items **When** I scroll **Then** the list supports smooth native scrolling with tap targets of at least 44x44px.

## Tasks / Subtasks

- [x] Task 1: API Service Integration (AC: 1)
  - [x] Add `getStandardReturns()` to `StockApiService` mapped to `/api/stock-returns`.
  - [x] Add `getTontineReturns()` to `StockApiService` mapped to `/api/v1/stock-tontine-return`.
- [x] Task 2: List Presenter Component (AC: 1, 2)
  - [x] Generate `StockReturnListComponent` (`mobile/src/app/stock/components/return-list/stock-return-list.component.ts`).
  - [x] Configure `@Input()` to accept the current context and data.
  - [x] Style the `<ion-item>` elements to ensure minimum touch targets of 44x44px.

### Review Follow-ups (AI) — Applied

- [x] [AI-Review][HIGH] Register `StockReturnListComponent` in `StockModule` declarations/exports. [stock.module.ts]
- [x] [AI-Review][HIGH] Wire `StockReturnListComponent` into `StockDashboardComponent` with Returns tab (content segment). [stock-dashboard.component.html, stock-dashboard.component.ts]
- [x] [AI-Review][HIGH] Create missing `stock-return-list.component.scss` with `min-touch-target` definition. [return-list/]
- [x] [AI-Review][HIGH] Make `StockReturn.reference` optional (`reference?: string`), remove index signature. [stock-return.model.ts]
- [x] [AI-Review][MEDIUM] Add integration tests for context-driven returns fetch (AC1 coverage). [stock-dashboard.component.spec.ts]
- [x] [AI-Review][MEDIUM] Fix YAML indentation error on story key. [sprint-status.yaml]
- [x] [AI-Review][LOW] Replace hardcoded French empty-state string with English. [stock-return-list.component.html]

## Dev Notes

- **UX Alignment:** Adhere to NFR5 (44x44px minimum touch targets) for all clickable list rows.
- **Framework Constraints:** `standalone: false`
- **Architecture:** Returns are fetched eagerly on context change (same as requests), so the data is ready when the user switches to the Returns tab — no second API call needed on tab switch.

### References

- [Source: PRD FR4, NFR5]

## Dev Agent Record

### File List

- `mobile/src/app/stock/services/stock-api.service.ts` — Added `getStandardReturns()` and `getTontineReturns()` methods.
- `mobile/src/app/stock/services/stock-api.service.spec.ts` — Added tests for both returns API methods.
- `mobile/src/app/stock/models/stock-return.model.ts` — New model; `reference` optional, no index signature.
- `mobile/src/app/stock/components/return-list/stock-return-list.component.ts` — New presenter component.
- `mobile/src/app/stock/components/return-list/stock-return-list.component.html` — New template.
- `mobile/src/app/stock/components/return-list/stock-return-list.component.scss` — New styles (min-touch-target, status badges).
- `mobile/src/app/stock/components/return-list/stock-return-list.component.spec.ts` — Component unit tests.
- `mobile/src/app/stock/stock.module.ts` — Declared and exported `StockReturnListComponent`.
- `mobile/src/app/stock/dashboard/stock-dashboard.component.ts` — Added `returns[]`, `returnsLoading`, `activeTab`, `onTabChange()`, returns fetch pipeline.
- `mobile/src/app/stock/dashboard/stock-dashboard.component.html` — Added content-tab segment and `<app-stock-return-list>` rendering.
- `mobile/src/app/stock/dashboard/stock-dashboard.component.spec.ts` — Extended with AC1 integration tests and tab-switching tests.
