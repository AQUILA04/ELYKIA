# Plan multi-agence ELYKIA (`1fb9bc2c`)

**Status:** IN PROGRESS — user decisions locked; implementing by waves.

## Locked decisions

1. `agency_assignment.user_id` = `USERS.USEID`
2. Migrate assignments + `current_agency_id` for Profil_Terrain only; Global JWT `agencyId = null`
3. Terrain without agencyId → **HTTP 403**
4. Option A: `active` business source; DELETE → deactivate; sync `visibility`
5. `agency_id` on Req 4.1 tables **+ `credit`**
6. **MAJOR version bumps from first PRs** (not only at chantier end)
7. Focused PRs per wave

## Wave 1 (current branch `cursor/multi-agency-wave1-ddl-f6e3`)

- Flyway `V102__multi_agency_management.sql` (BaseEntity columns, USEID, terrain-only backfill, credit.agency_id)
- Entities: Agency enrich, AgencyAssignment, UserAccount.currentAgencyId, agencyId on operational entities
- AI `schema-catalog.json` sync
- MAJOR: backend 2.0.0, frontend 3.0.0, mobile 3.0.0, common-securities 2.0.0
- CHANGELOG

## Later waves

JWT/filter → services/API → mobile → frontend+guide → tests

## Store

`/cursor/stores/bc-fbdc0dac-2b34-4a43-a4bd-57c4441d9067/docs/multi-agency-plan.md`
