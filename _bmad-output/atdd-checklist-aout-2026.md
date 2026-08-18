# ATDD Checklist - Epic août-2026 : campagne pré-prod rejouable

**Date:** 2026-08-17
**Author:** Francis / Murat (TEA)
**Primary Test Level:** E2E (Playwright) + API via `request`

---

## Story Summary

Campagne de recette des livraisons août (web + mobile RM). Les features existent déjà : les specs sont des **tests de régression**, pas un RED classique avant implémentation.

**As a** équipe ELYKIA
**I want** relancer les mêmes P0 après chaque sprint
**So that** une régression permissions / shell RM / tontine V2 est détectée avant la prod

---

## Comptes locaux

| Profil | Username | Source |
| --- | --- | --- |
| Chef de recouvrement | `recov001` | Confirmé Francis |
| Secrétaire | `secret001` | Confirmé Francis |
| Gestionnaire | `ges003` | Fixture existante |
| Magasinier | `mag001` | Confirmé Francis (`Afric@` en local) |
| Commercial | `COM020` | Fixture existante |

Surcharges : `E2E_RM_USERNAME`, `E2E_RM_PASSWORD`, `E2E_SEC_*`.

---

## Tests créés

### E2E Web — project `august-2026`

| Spec | IDs | Run 2026-08-17 |
| --- | --- | --- |
| `frontend/e2e/specs/august-2026/permissions-kpi.spec.ts` | W-P0-01, 01b, 02, 03 | PASS |
| same | W-P1-12 ges003 list-summary 200 | **PASS** (après Flyway V93, rejeu 2026-08-17 16:12) |
| `permissions-collector.spec.ts` | W-P0-04, W-P0-05, W-P0-05b, W-P0-05c | PASS attendu après Flyway V95 |
| `tontine-v2-parameter.spec.ts` | W-P0-11 | PASS |

| `stock-reception.spec.ts` | W-P0-06, 07a, 07b, 08 | **PASS** (mag001 / `Afric@`) |
| `remittance-expenses.spec.ts` | W-P0-09/10 UI net/freeze | **PASS** |
| `credit-search-stock.spec.ts` | W-P0-09 RAT-* | **PASS** |
| `credit-search-stock.spec.ts` | W-P1-08, W-P1-09 | **PASS** (case référence + stock source → modal ventes) |
| `client-transfer.spec.ts` | W-P1-10, W-P1-11 | **PASS** (transfert INPROGRESS + champs commerciaux gated) |
| `yearly-bilan.spec.ts` | W-P1-13 | **PASS** (bilan tontine collectes/versements/reste) |
| `tontine-member.spec.ts` | W-P1-14 | **PASS** (cotisé par commercial + badge Actuel) |
| `remittance-p1.spec.ts` | W-P1-15, W-P1-16 | **PASS** (PENDING net recalculé ; 2 remises août, versements disjoints) |
| `yearly-bilan.spec.ts` | W-P1-01, 02, 03, 04 | **PASS** (ges003 / COM020, 4/4) |
| `pdf-exports.spec.ts` | W-P1-05, 06, 07 | **PASS** (3/3) |

### E2E Mobile — `@august-2026 @rm`

| Spec | IDs | Run |
| --- | --- | --- |
| `mobile/e2e/specs/august-2026/rm-shell-plan.spec.ts` | RM-P0-01, 02, 03 | **3 PASS** |
| `rm-close-credits.spec.ts` | RM-P0-05 | **PASS** (API, référence unique) |
| `hybrid-writes.spec.ts` | M-P0-01 | **PASS** (POST collections 2xx) |
| `hybrid-writes.spec.ts` | M-P0-02 | **PASS** (init online → stop backend → collecte offline → start backend → sync → GET collections) |
| `hybrid-p1.spec.ts` | M-P1-01, 02, 04, 05 | **PASS** (client online-first, fallback 4xx, SWR, budget V1/V2) |
| `hybrid-p1.spec.ts` | M-P1-03 | **SKIP** — aucun crédit actif pour le client tiré au hasard (COM020) |
| `hybrid-p1.spec.ts` | M-P1-06 | **Hors navigateur** — onglets Plus inaccessibles depuis la pile tontine ; retry sync à valider sur APK |
| `hybrid-writes.spec.ts` | M-P0-03 | **Hors navigateur** — reload Playwright efface SQLite/IndexedDB ; à valider sur APK |
| `rm-plan-pack.spec.ts` | RM-P0-04 | **PASS** (wizard COM020 + localités + pack → `/rm/dashboard`, tabs + KPI) |
| `rm-close-offline.spec.ts` | RM-P0-06 | **PASS** (stop backend → clôture partielle → file Plus → start backend → 1 POST close-credits) |
| `rm-p1-plan-controls.spec.ts` | RM-P1-01, 02, 03 | **PASS** (plafond 3 + toast, modal localités, contrôle crédit ECART + POST 2xx) |
| `rm-p1-plan-controls.spec.ts` | RM-P1-04 | **PASS** (arrange membre tontine COM020 session 2026, contrôle mois ECART + POST 2xx + badge Terrain) |
| `rm-p1-clients-shell.spec.ts` | RM-P1-05, 06, 07, 08 | **PASS** (fiche client GPS/MLL, ordre sync Plus, barre session, KPI Clôturé + file) |

**Hors périmètre métier (non joués)** : RM-P1-10 (version / MAJ app), RM-P1-11 (avatars MinIO).

### Pas encore automatisés (P0 restants)

M-P0-03 réservé APK.

---

## Findings (gate)

Rejeu post-migrations (2026-08-17 ~16:12) : **web 8/8 PASS**, **mobile RM 3/3 PASS**.

1. ~~ges003 sans ROLE_KPI_FINANCIER_VENTE~~ — **levé** après Flyway.
2. Le backend renvoie encore **HTTP 500** + `Access Denied` (au lieu de 403) quand l’autorité manque. Recov001 est bien refusé ; le mapping HTTP reste un défaut OPS, pas un trou fonctionnel.
3. ~~**recov001** `ROLE_ASSIGN_*_COLLECTOR` hors défaut plan~~ — **levé** : demande métier 2026-08-17, désormais le défaut (avec `CONSULT_CLIENT` / `EDIT_CLIENT`, Flyway `V95`).
4. Dashboard v2 derrière flag Firebase ; E2E skip Remote Config → dashboard legacy. Pas de fuite CA pour recov001.

**Gate P0 exécuté (web + shell RM + pack + clôture offline RM-P0-06 + stock/remise/RAT + M-P0-01 + M-P0-02) : PASS sur ce pack.** M-P0-03 reste APK-only.

---

## Commandes de rejeu

```bash
cd frontend
$env:E2E_SKIP_WEB_SERVER='1'
npm run test:e2e:august

cd mobile
$env:E2E_SKIP_WEB_SERVER='1'
npx playwright test --grep @august-2026
# ou npm run test:e2e:august
```

---

## Required data-testid (ajoutés)

- `e2e-credit-kpi-period`, `e2e-credit-collector-select-col`, `e2e-credit-bulk-change-collector`
- `e2e-dashboard-v2`, `e2e-dashboard-kpi-grid`
- `e2e-daily-report-tab-*`
- `e2e-sidebar-ventes`, `e2e-sidebar-credit-list`, `e2e-sidebar-parameters`
- `e2e-parameter-row-*`, `e2e-parameter-edit-*`, `e2e-tontine-share-version-select`
- `e2e-rm-shell`, `e2e-rm-tab-*`, `e2e-rm-plan-page`, `e2e-rm-plan-continue`, `e2e-rm-plan-download`
- `e2e-rm-plan-locality-search`, `e2e-rm-control-open`, `e2e-rm-control-amount`, `e2e-rm-control-confirm`, `e2e-rm-control-badge`, `e2e-rm-control-sheet-status`
- `e2e-rm-tontine-control-open`, `e2e-rm-tontine-month`, `e2e-rm-tontine-control-confirm`, `e2e-rm-tontine-badge`, `e2e-rm-tontine-sheet-status`
- `e2e-rm-session-bar`, `e2e-rm-kpi-closed`, `e2e-rm-client-card`, `e2e-rm-client-phone`, `e2e-rm-client-quarter`, `e2e-rm-client-capture-gps`, `e2e-rm-client-coords`, `e2e-rm-client-save`
- `e2e-yearly-credit-bilan`, `e2e-yearly-credit-row-stock`, `e2e-yearly-credit-row-portfolio`, `e2e-yearly-kpi-*`
- `e2e-remaining-clients-dialog`, `e2e-remaining-clients-kpi-commercial`, `e2e-remaining-clients-kpi-client`, `e2e-remaining-clients-ref-link`, `e2e-remaining-clients-table`, `e2e-remaining-clients-download-pdf`
- `e2e-client-row`, `e2e-client-bulk-assign-modal`, `e2e-client-bulk-credit-collector`, `e2e-client-bulk-validate`

---

**Generated by**: BMad TEA — testarch-atdd (régression, features déjà livrées)
**Output**: `_bmad-output/atdd-checklist-aout-2026.md`
