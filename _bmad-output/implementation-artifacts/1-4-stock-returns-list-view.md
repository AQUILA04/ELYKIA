# Story 1.4: Stock Returns List View (FR4)

Status: ready-for-dev

## Story

As a field agent,
I want to view a list of my historical Stock Returns,
so that I know what equipment I have officially returned.

## Acceptance Criteria

1. **Given** the active context (Standard or Tontine) **When** the returns tab is selected **Then** it fetches data from the respective Returns API endpoint.
2. **Given** the list is loaded with many items **When** I scroll **Then** the list supports smooth native scrolling with tap targets of at least 44x44px.

## Tasks / Subtasks

- [ ] Task 1: API Service Integration (AC: 1)
  - [ ] Add `getStandardReturns()` to `StockApiService` mapped to `/api/stock-returns`.
  - [ ] Add `getTontineReturns()` to `StockApiService` mapped to `/api/v1/stock-tontine-return`.
- [ ] Task 2: List Presenter Component (AC: 1, 2)
  - [ ] Generate `StockReturnListComponent` (`mobile/src/app/stock/components/return-list/stock-return-list.component.ts`).
  - [ ] Configure `@Input()` to accept the current context and data.
  - [ ] Style the `<ion-item>` elements to ensure minimum touch targets of 44x44px.

## Dev Notes

- **UX Alignment:** Adhere to NFR5 (44x44px minimum touch targets) for all clickable list rows.
- **Framework Constraints:** `standalone: false`

### References

- [Source: PRD FR4, NFR5]
