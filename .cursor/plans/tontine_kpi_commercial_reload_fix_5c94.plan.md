# Fix tontine KPI/members commercial filter overwrite

## Root cause

Selecting a commercial (e.g. COM005) still showed global KPIs and `706 membre(s)` because:

1. `getCurrentSession(commercial)` nested an unfiltered/stale `getSessionStats` that could finish **after** the filtered refresh and overwrite KPIs.
2. Concurrent `loadMembers()` calls without `switchMap` allowed an older unfiltered response to win.
3. Backend optional `(:commercial IS NULL OR …)` aggregates were replaced with strict `tontineCollector = :commercial` queries when a commercial is present.

## Fix

- Frontend: session load no longer nests stats; members/KPIs use `switchMap` subjects; commercial passed explicitly on filter change.
- Backend: branch filtered vs global aggregates with dedicated repository methods.
