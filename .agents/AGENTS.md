# ELYKIA Project Rules (Antigravity & Cursor Shared Context)

These rules apply to all agent interactions across the project to ensure consistency with Cursor's rules.

## Infrastructure & Deployments
- **Contabo Patching (`contabo-patch-must-be-in-repo`)**: Any change applied to Contabo (VPS) must FIRST be committed to the repository (compose, Dockerfile, scripts, etc.). Hotfixing directly on the VPS without a Git commit is forbidden because the CD (`install.sh`, `deploy.sh`) will overwrite it.

## Frontend
- **Lazy Loading & Standalone (`frontend-lazy-loading-migration`)**: Frontend `3.0.0` (Angular 21) uses standalone bootstrap (`app.config.ts`, `app.routes.ts`, `MainLayoutComponent` — no `AppModule`, see `docs/adr/ADR-001-frontend-angular-21-architecture.md`) and 100% lazy-loaded domains. Create any new domain under `frontend/src/app/features/{domaine}/` with **standalone components**, `{domaine}.routes.ts` (`loadChildren`/`loadComponent`), `index.ts`, path aliases (`@core/*`, `@layout/*`, `@shared/*`, `@features/*`, `@env/*`), native control flow (`@if`/`@for`/`@switch`), `AlertService` (`ngx-sonner` + `@angular/cdk/dialog`), and Vitest unit tests (`npm run test:ci`).
- **UI Style (`frontend-ui-style`)**: Apply the standard ELYKIA UI style for any angular page modification (breadcrumb, KPI strip, toolbar, table-card). Do NOT use raw material buttons for primary actions. Refer to the skill `frontend-ui-style`.

## Mobile
- **Local-First Architecture (`mobile-local-first-architecture`)**: When developing new features for mobile, ensure that data initialization (fetching from API) and synchronization logic are preserved. New CRUD operations must interact directly with the local database. APIs are used only for explicit syncing.
- **Version Bump (`mobile-version-bump`)**: Any change to the `mobile/` directory requires a version increment in `package.json`, `environment.ts`, and `environment.prod.ts` simultaneously. Use PATCH by default or MINOR for large features.
- **User Specific Data Access (`user-specific-data-access`)**: All data requests in mobile must be filtered by the logged-in user (e.g. `commercialUsername`).

## Backend & AI
- **AI Schema Catalog (`update-ai-schema-catalog-on-ddl-change`)**: If the database schema changes (Flyway DDL, JPA Entities exposed to AI), you MUST update `backend/src/main/resources/ai/schema-catalog.json` and optionally `sql-examples.json`. The Elykia IA Text-to-SQL relies on this snapshot.

## Documentation & Changelog
- **Memory Bank (`memory-bank`)**: At the start of a task, read `memory-bank/` (`projectbrief.md`, `activeContext.md`, `systemPatterns.md`, `techContext.md`) before exploring code. After a significant change, update the relevant files in the same PR. Protocol: `memory-bank/README.md` and `.cursor/rules/memory-bank.mdc`.
- **Keep Changelog (`keep-changelog`)**: Update `docs/CHANGELOG.md` after any task that modifies code, config, or docs. Increment the corresponding component's version (Frontend, Backend, Mobile, Customer-space) in its source file and document under the new version.
- **User Guide Updates (`update-user-guide-on-ui-or-business-change`)**: If a change impacts the UI of any client or a business rule, the User Guide (`user-guide/docs/**/*.md`) MUST be updated before delivery.
- **RAG Index Sync (`user-guide-rag-index-sync`)**: Whenever the User Guide is updated, the AI RAG index must be regenerated (`python user-guide/generate_rag_index.py`) and committed (`backend/src/main/resources/ai/user-guide-index.json`).

## Quality & Workflow
- **Senior Developer Rigor (`senior-developer-rigor-and-code-verification`)**: Prioritize quality over speed. Meticulously verify all code, variable usage, and method references. Never make assumptions. Conduct a thorough code review after implementation.
- **Include Plans in Commits (`include-cursor-plans-in-commits`)**: When creating commits, always include `.cursor/plans/` and other relevant `.cursor/` artifacts. Do NOT ignore the plans in `.gitignore` or exclude them during staging.
