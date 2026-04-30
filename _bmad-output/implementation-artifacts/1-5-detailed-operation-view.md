# Story 1.5: Detailed Operation View (FR5)

Status: in-progress

## Story

As a field agent,
I want to tap on a request or return to see its detailed contents,
so that I know exactly what items and quantities were involved.

## Acceptance Criteria

1. **Given** the populated list view **When** I tap a specific list item **Then** a detailed modal/view opens showing itemized quantities and the current status.

## Tasks / Subtasks

- [ ] Task 1: Detail Modal Component (AC: 1)
  - [ ] Generate `StockDetailModalComponent` (`mobile/src/app/stock/components/detail-modal/stock-detail-modal.component.ts`).
  - [ ] Configure it to accept an operation object via modal props / `@Input()`.
  - [ ] Display the itemized list, exact quantities, status badge, and dates.
- [ ] Task 2: List Integration (AC: 1)
  - [ ] Update `StockRequestListComponent` and `StockReturnListComponent` to emit a tap event (`@Output()`).
  - [ ] Update the `StockDashboardComponent` (Container) to catch the tap event and launch the `StockDetailModalComponent` using Ionic's `ModalController`.

## Dev Notes

- **Architecture Constraint:** The Container (`StockDashboardComponent`) must orchestrate the opening of the modal to keep presenters strictly focused on rendering. Presenters should just emit the clicked item via an `@Output()`.
- **Framework Constraints:** `standalone: false`

### References

- [Source: PRD FR5]
- [Source: Architecture - Container-Presenter pattern orchestration]
