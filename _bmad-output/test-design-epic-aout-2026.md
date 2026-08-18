# Test Design: Epic Août 2026 — Campagne pré-prod (web + mobile)

**Date:** 2026-08-17
**Author:** Francis / Murat (TEA)
**Status:** Approved
**Mode:** Epic-level (standalone, plans août + changelog)

---

## Executive Summary

**Scope:** `full` — 13 plans `.cursor/plans` (11–17 août) **plus** le shell Chef de recouvrement mobile (`/rm`, changelog Mobile 2.15.0→2.20.1, spec `.kiro/specs/recovery-manager-mobile/screens-and-api.md`). Croisé avec `docs/CHANGELOG.md` (Frontend 2.14.8→2.16.17, Backend 1.6.0→1.10.6, Mobile 2.15.0→2.20.1).

**Intent:** concevoir une suite **rejouable** (même commande, mêmes tags, données isolées) pour (1) valider la mise en prod d’août et (2) servir de **régression** après les développements suivants.

**Risk Summary:**

- Total risks identified: 21
- High-priority risks (≥6): 11 (dont 2 score 9 = BLOCK tant que non exécutés)
- Critical categories: SEC, DATA, BUS, TECH

**Coverage Summary:**

- P0 scenarios: 24 (~36-60 hours)
- P1 scenarios: 33 (~25-50 hours)
- P2/P3 scenarios: 14 (~4-10 hours)
- **Total effort**: ~65-120 hours (~2-4 weeks, 1 QA) — **implémentation Playwright + 1ère exécution locale**
- **Rejeu ultérieur**: ~15-25 min web + ~20-30 min mobile (workers=1, déjà en place ; le shell RM allonge le mobile)

**Constat couverture actuelle (gap):**

| Suite | Ce qu’elle couvre | Ce qu’août n’a pas |
| --- | --- | --- |
| `frontend/e2e` smoke + golden-path | Login, nav, stock→vente→tontine V1, rattrapage | Permissions, KPI, V2, bilan, PDF, réception PENDING, remise net, recherche `RAT-*` |
| `mobile/e2e` smoke / offline / tontine-hybrid | Login mock, dashboard tontine **commercial** joignable | Shell `/rm`, plan du jour, clôture, contrôles carnet, clients RM, V1/V2 replay, sync |
| Backend JUnit | V2 policy, réception, remise, search SQL, yearly tontine | Contrats UI, rôles JWT, PDF bytes, cache clients, field-plans / close-credits RM |

Les tests unitaires backend **restent la source de vérité du calcul**. L’E2E ne rejoue pas la mathématique : il vérifie le **parcours utilisateur + autorisation + persistance visible**.

---

## Replayability Contract (non négociable)

Chaque scénario de cette campagne doit pouvoir être relancé **sans connaissance du run précédent**.

### Règles

1. **Isolation des données** — préfixe `E2E_` + `uniqueE2eLabel()` / `uniqueE2ePhone()` déjà dans `frontend/e2e/fixtures/test-data.ts`. Jamais d’assertion sur « la première ligne » d’une liste métier existante.
2. **Indépendance** — un spec ne dépend pas de l’ordre d’un autre spec. Fixtures pures → helpers → `test.extend` (pas d’héritage de page objects).
3. **Restauration d’état global** — tout paramètre muté (`TONTINE_SOCIETY_SHARE_VERSION`) est **restauré en `finally`**. Interdiction de laisser V2 actif sur la base locale partagée.
4. **Idempotence des writes** — retries (sync mobile, transfert async) : même référence = pas de double écriture. Assert count before/after.
5. **Tags stables** — `@p0` `@p1` `@p2` `@web` `@mobile` `@rm` `@august-2026` `@regression`. Un futur sprint ajoute des specs, **ne retire pas** ces tags.
6. **Sélecteurs** — `data-testid` (`e2e-*`). Pas de CSS Material / texte fragile sauf libellé métier figé dans le plan.
7. **Comptes** — identifiants via env (`E2E_*_PASSWORD`), jamais hardcodés dans les specs. Comptes manquants (secrétaire, chef de recouvrement) = **blocker d’exécution**, pas un skip silencieux.

### Commandes de rejeu (après implémentation des specs)

```bash
# Smoke pré-prod (<5 min)
cd frontend && npx playwright test --project=smoke
cd mobile && npm run test:e2e:smoke

# Campagne août / régression fonctionnelle
cd frontend && npx playwright test --project=august-2026
cd mobile && npx playwright test --grep @august-2026

# P0 only (fail-fast)
cd frontend && npx playwright test --project=august-2026 --grep @p0
cd mobile && npx playwright test --grep "@august-2026 @p0"
cd mobile && npx playwright test --grep @rm

# Backend (math + transitions d’état)
cd backend && mvn -q test -Dtest=V2TontineAllocationPolicyTest,TontineCollectionAllocationTest,StockReceptionServiceTest,CashPeriodRemittanceServiceTest,CreditSearchSqlFilterTest,CommercialTontineYearlySummaryServiceTest
```

**Gap tooling à combler avant le 1er run E2E août** : `frontend/playwright.config.ts` n’a que les projects `smoke` et `golden-path`. Ajouter un project `august-2026` (`testMatch: /august-2026\/.*\.spec\.ts/`). Sans ça, les nouveaux specs ne sont **jamais** exécutés.

Fichiers cibles (à créer au workflow `*atdd` / `*automate`, pas dans TD) :

```
frontend/e2e/specs/august-2026/
  permissions-kpi.spec.ts
  permissions-collector.spec.ts
  stock-reception.spec.ts
  remittance-expenses.spec.ts
  tontine-v2-parameter.spec.ts
  yearly-bilan.spec.ts
  remaining-clients-modal.spec.ts
  pdf-exports.spec.ts
  credit-search-stock.spec.ts
mobile/e2e/specs/august-2026/
  hybrid-writes.spec.ts
  tontine-v2-offline.spec.ts
  tontine-sync-reconcile.spec.ts
  rm-shell-plan.spec.ts
  rm-close-credits.spec.ts
  rm-field-controls.spec.ts
  rm-clients-contact.spec.ts
```

---

## Split métier : Web vs Mobile vs Transversal

Les 13 plans de `.cursor/plans` (aperçu 11–17 août) :

| # | Plan | Web E2E | Mobile E2E | API / Unit (déjà là ou à garder) |
| --- | --- | --- | --- | --- |
| 1 | Permissions changement commercial | **Oui** — UI + 403 | Non (pas d’UI mobile) | `@PreAuthorize` + cache eviction |
| 2 | Permissions KPI financiers | **Oui** — masquage + skip API | Non (pas de bandeaux KPI web) | 403 agrégats |
| 3 | Tontine part société V2 | **Oui** — paramètre, bandeau, lock écriture | Indirect (param sync) | `V2TontineAllocationPolicyTest` |
| 4 | Mobile tontine V2 hybride | Non | **Oui** — replay local, badge, reconcile | Unit `tontine-calculation.service.spec` |
| 5 | Bilan annuel option B | **Oui** — KPI + formules | Non | Yearly summary service tests |
| 6 | Modal reste clients | **Oui** — modal, lien fiche, PDF | Non | PDF remaining-at-clients |
| 7 | Fix stock dashboard PDF | **Oui** — blob PDF vs panneau | Non | `StockExportService` |
| 8 | Client PDF navy | **Oui** — bouton si commercial sélectionné | Non | `ClientListPdfService` |
| 9 | Recherche crédit + stock source | **Oui** — `RAT-*`, checkbox, lien stock | Non | `CreditSpecification` / SQL filter |
| 10 | Validation réception stock | **Oui** — PENDING→VALIDATED/REFUSED/CANCELLED | Non | `StockReceptionServiceTest` |
| 11 | Remise dépenses net | **Oui** — sélection, net, freeze | Non | `CashPeriodRemittanceServiceTest` |
| 12 | Hybrid sync phase 1 | Non | **Oui** — client, encaissement, distribution, commande | Unit coordinator / scheduler |
| 13 | Hybrid sync phase 2 tontine | Non | **Oui** — membre/collecte/livraison online-first + SWR + init safe | Unit sync tontine |
| 14 | **Shell Chef de recouvrement `/rm`** (changelog 2.15.0–2.20.1, spec kiro) | Non (SSO web historique, hors shell) | **Oui — cluster dédié** : gate plan, tabs Retards/Terrain/Clients/Plus, clôture, contrôles crédit+tontine, contact, sync Plus | `field-plans`, `offline-pack`, `close-credits` |

**Hors image mais dans le changelog août (même fenêtre)** — P2 si le temps le permet : photos MinIO (fiche client web), rattrapage datepicker. Les remises multiples par période restent P1 (W-P1-16, lié à #11).

**Cluster 14 n’est pas optionnel.** C’est le livrable mobile le plus large d’août (APK unique, shell profil séparé, hybrid-first). Le reléguer en P3 casserait le gate prod : un chef de recouvrement qui tombe sur le shell commercial, ou un plan du jour inopérant, bloque le terrain.

**Règle de non-duplication :**

- Calcul V1/V2 → **unit backend + unit mobile**, pas E2E.
- E2E web = boutons, permissions, PDF, transitions visibles.
- E2E mobile commercial = online-first vs offline, sync, pas de perte de file.
- E2E mobile **RM** = shell `/rm` ≠ `/tabs`, plan du jour, pack, clôture/contrôles/contact, sync Plus.

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | SEC | Chef de recouvrement voit encore CA/marges/bilans (UI ou API sans `ROLE_KPI_FINANCIER_*`) | 3 | 3 | **9** | E2E RM + API 403 sur agrégats ; skip `loadReports` sans rôle | QA + Francis | Avant prod |
| R-002 | SEC | Changement de commercial ventes/clients sans `ROLE_ASSIGN_*` (UI visible ou endpoint ouvert) | 2 | 3 | **6** | E2E promoteur vs gestionnaire + 403 PreAuthorize | QA | Avant prod |
| R-003 | DATA | Réception stock impacte FIFO/stock alors qu’elle est encore `PENDING` | 2 | 3 | **6** | E2E magasinier create → qty inchangée ; gestionnaire validate → qty + | QA | Avant prod |
| R-004 | DATA | Politique tontine V2 prélève des mois sans collecte (régression V1 trop agressive) | 2 | 3 | **6** | JUnit V2 (source de vérité) + E2E bandeau/lock ; **ne pas basculer V2 sur une grosse base locale sans restore** | QA / Dev | Avant prod |
| R-005 | DATA | Remise : net faux, dépense double-comptée, ou édition après `RECEIVED` | 2 | 3 | **6** | E2E secrétaire+gestionnaire ; JUnit net négatif refusé | QA | Avant prod |
| R-006 | DATA | Collecte tontine mobile offline : double POST à la sync, ou calcul local ≠ serveur sans reconcile | 3 | 3 | **9** | E2E offline persist + sync ; assert `isSync` + id serveur unique | QA | Avant prod |
| R-008 | BUS | Bilan annuel option B : reste commercial / reste client faux (reporting direction) | 2 | 3 | **6** | E2E KPI après vente+versement connus ; croiser yearly-summary API | QA | Avant prod |
| R-010 | TECH | Init mobile (`forceCleanup`) efface des collectes `isSync=false` | 2 | 3 | **6** | E2E init safe : unsynced survit au relance | QA | Avant prod |
| R-014 | OPS | Project Playwright `august-2026` absent → specs jamais jouées en CI/local | 3 | 2 | **6** | Ajouter project + script `test:e2e:august` | QA | Avant 1er run |
| R-017 | SEC | Mauvais shell : commercial entre dans `/rm`, ou RM reste/redirige vers `/tabs` (SSO web, flag `recoveryManagerMobile`) | 2 | 3 | **6** | E2E login RM vs COM020 ; guards `RmProfilGuard` / `RmPlanGuard` | QA | Avant prod |
| R-018 | DATA | Clôture terrain RM : double encaissement si retry sans idempotence `reference` | 2 | 3 | **6** | E2E close online + replay même référence ; assert remaining inchangé au 2e POST | QA | Avant prod |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-007 | DATA | Transfert async ventes `INPROGRESS` : historique OK mais liste clients stale (cache) | 2 | 2 | 4 | E2E checkbox transfert + refresh liste ; changelog 1.10.6 | QA |
| R-009 | BUS | Keyword `RAT-*` : tiret parse comme plage de dates → liste complète | 2 | 2 | 4 | E2E search + KPI alignés | QA |
| R-011 | BUS | PDF stock mensuel ≠ tableau du panneau | 2 | 2 | 4 | E2E export + parse texte PDF (qté article) | QA |
| R-012 | OPS | Job migration V1↔V2 : écritures tontine encore possibles, bandeau absent | 2 | 2 | 4 | E2E status RUNNING (si déclenchable) ou API status | QA |
| R-015 | SEC | UI masquée mais l’appel API KPI part quand même (403 bruyant / fuite timing) | 2 | 2 | 4 | `page.waitForResponse` : aucun GET agrégat sans rôle | QA |
| R-019 | DATA | Contrôle carnet crédit/tontine perdu offline ou doublé à la sync | 2 | 2 | 4 | E2E file `rm_*_field_controls` + retry Plus | QA |
| R-020 | BUS | Plan du jour : 0 ou 4+ commerciaux, pack vide, gate tabs contournée | 2 | 2 | 4 | E2E wizard 1–3 + redirect `/rm/plan` | QA |
| R-021 | OPS | Sync Plus dans le mauvais ordre (clôtures avant contacts/contrôles) | 2 | 2 | 4 | E2E ordre : contacts → contrôles crédit → tontine → clôtures | QA |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| --- | --- | --- | --- | --- | --- | --- |
| R-013 | PERF | Yearly remaining-credits / indexes V90-V91 lents en local | 1 | 2 | 2 | Monitor durée E2E ; pas de k6 dans cette campagne |
| R-016 | BUS | Pagination `n/N` PDF navy cosmétique | 1 | 1 | 1 | P3 visuel |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## Test Coverage Plan

### P0 (Critical) — bloquant prod + score ≥6 + pas de workaround

| ID | Requirement | Surface | Test Level | Risk Link | Count | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| W-P0-01 | RM : listes ventes/tontine visibles, bandeaux KPI financiers **absents** | Web | E2E | R-001 | 1 | Compte chef recouvrement **requis** |
| W-P0-02 | RM : `GET` agrégats yearly/list-summary → 403 | Web/API | API via Playwright `request` | R-001 | 1 | Même session JWT |
| W-P0-03 | Rapport journalier sans KPI : seul onglet Recouvrement, pas d’appel `loadReports` | Web | E2E | R-001, R-015 | 1 | |
| W-P0-04 | Promoteur : pas de bulk/bouton change-collector ventes | Web | E2E | R-002 | 1 | COM020 = PROMOTER |
| W-P0-05 | Gestionnaire : change-collector ventes + clients visible ; 403 si rôle retiré (si compte test dédié) | Web | E2E | R-002 | 1 | ges003 |
| W-P0-05b/c | Chef de recouvrement : `CONSULT_CLIENT` / `EDIT_CLIENT` / `ASSIGN_*_COLLECTOR` par défaut (JWT + UI) | Web | E2E | R-002 | 1 | recov001 — demande métier 2026-08-17 |
| W-P0-06 | Magasinier crée entrée → statut `PENDING`, stock article **inchangé** | Web | E2E | R-003 | 1 | |
| W-P0-07 | Gestionnaire **valide** → stock + FIFO + historique ; **refuse** → pas d’impact | Web | E2E | R-003 | 1 | 2 cas dans le même spec, données distinctes |
| W-P0-08 | Magasinier **abandonne** PENDING ; ADMIN seul reverse VALIDATED (assert UI magasinier sans Annuler VALIDATED) | Web | E2E | R-003 | 1 | |
| W-P0-09 | Remise : dépenses sélectionnées, net = versé − dépenses ; net négatif refusé | Web | E2E | R-005 | 1 | |
| W-P0-10 | Remise `RECEIVED` : dépenses figées, édition dépense bloquée + badge Comptabilisée | Web | E2E | R-005 | 1 | |
| W-P0-11 | Paramètre tontine : UI V1/V2 seulement (pas saisie libre) | Web | E2E | R-004 | 1 | **Ne pas basculer** si membres nombreux — assert options only si restore impossible |
| W-P0-12 | Recherche `RAT-<ref>` retourne **ce** crédit, pas toute la liste | Web | E2E | R-009 | 1 | Créer un rattrapage E2E ou crédit à ref connue |
| M-P0-01 | Collecte tontine **online** : POST serveur puis SQLite réconcilié (id serveur, `isSync`) | Mobile | E2E | R-006 | 1 | Backend local up |
| M-P0-02 | Collecte **offline** : persist locale, badge estimation, **un seul** POST à la reconnexion | Mobile | E2E | R-006 | 1 | Intercept / offline fixture |
| M-P0-03 | Init / relance app : collectes `isSync=false` **non** effacées | Mobile | E2E | R-010 | 1 | |
| M-P0-04 | Calcul local V1 vs V2 selon paramètre SQLite (cas trou de mois) | Mobile | Unit | R-004, R-006 | 1 | Déjà `tontine-calculation.service.spec` — **étendre** si gap V2 trou |
| B-P0-01 | V2 : inscrit fév, collectes mars+mai → parts mars+mai seulement | Backend | Unit | R-004 | 1 | `V2TontineAllocationPolicyTest` — **rejeu obligatoire** |
| B-P0-02 | V1 inchangé (non-régression) sur le même scénario calendaire | Backend | Unit | R-004 | 1 | |
| RM-P0-01 | Login `RECOVERY_MANAGER` → shell `/rm` (pas `/tabs`, pas SSO web) | Mobile | E2E | R-017 | 1 | Flag `recoveryManagerMobile` ON |
| RM-P0-02 | Login commercial → `/tabs` ; navigation `/rm` refusée | Mobile | E2E | R-017 | 1 | COM020 |
| RM-P0-03 | Sans plan ACTIVE du jour → tabs inaccessibles, redirect `/rm/plan` | Mobile | E2E | R-017, R-020 | 1 | `RmPlanGuard` |
| RM-P0-04 | Wizard plan : 1–3 commerciaux + localités + download pack → `/rm/dashboard` | Mobile | E2E | R-020 | 1 | Backend field-plans + offline-pack |
| RM-P0-05 | Clôture online : `POST close-credits` + `reference` ; retry = pas de double écriture | Mobile | E2E | R-018 | 1 | Changelog 1.6.1 |
| RM-P0-06 | Clôture offline → file `rm_close_ops` ; sync Plus = **un** POST ; KPI Clôturé | Mobile | E2E | R-018 | 1 | |

**Total P0**: 24 tests, ~36-60 hours (incl. comptes RM/secrétaire + fixtures + pack terrain)

### P1 (High) — parcours fréquents, score 3-4 ou workaround difficile

| ID | Requirement | Surface | Test Level | Risk Link | Count | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| W-P1-01 | Bilan crédit : 2 rangées KPI (stock 01/01, ventes, reçues, cédées ; portefeuille, versements, restes) | Web | E2E | R-008 | 1 | **PASS** `yearly-bilan.spec.ts` |
| W-P1-02 | Formule reste commercial = portefeuille − versements (valeurs API = UI) | Web | E2E+API | R-008 | 1 | **PASS** |
| W-P1-03 | Reste client = somme live (pas filtrée `beginDate` année) | Web | E2E+API | R-008 | 1 | **PASS** (année 2025 = 2026) |
| W-P1-04 | Modal reste clients : infinite scroll, lien fiche, totaux distincts du KPI | Web | E2E | R-008 | 1 | **PASS** (scroll si `salesCount` > 25) |
| W-P1-05 | Export PDF reste clients : 200 + `%PDF` + pas d’erreur 500 Thymeleaf | Web | E2E | R-011 | 1 | **PASS** `pdf-exports.spec.ts` |
| W-P1-06 | PDF stock mensuel : collector/année/mois, qté d’un article E2E = panneau | Web | E2E | R-011 | 1 | **PASS** |
| W-P1-07 | PDF fiche client : bouton seulement si commercial sélectionné ; blob PDF navy | Web | E2E | R-011 | 1 | **PASS** (AMENOUVEVE-YAVEH) |
| W-P1-08 | Case « rechercher uniquement par référence » | Web | E2E | R-009 | 1 | **PASS** |
| W-P1-09 | Fiche crédit : stock mensuel source cliquable → modal ventes dashboard | Web | E2E | R-009 | 1 | **PASS** |
| W-P1-10 | Liste clients : checkbox transfert `INPROGRESS` async ; historique collector | Web | E2E | R-007 | 1 | **PASS** (restore COM020) |
| W-P1-11 | Édition client : champs commerciaux gated `ROLE_ASSIGN_CLIENT_COLLECTOR` | Web | E2E | R-002 | 1 | **PASS** ges003 vs COM020 |
| W-P1-12 | KPI financiers gestionnaire **visibles** sur ventes + dashboard (contrôle positif) | Web | E2E | R-001 | 1 | |
| W-P1-13 | Bilan tontine rapport journalier (collectes, versements, reste annuel) | Web | E2E | R-008 | 1 | **PASS** |
| W-P1-14 | Fiche membre : répartition cotisé par commercial + badge Actuel | Web | E2E | R-008 | 1 | **PASS** |
| W-P1-15 | Gestionnaire retire une dépense en PENDING → net recalculé | Web | E2E | R-005 | 1 | **PASS** |
| W-P1-16 | Plusieurs remises par période ; seuls versements `remittance_id` null proposés | Web | E2E | R-005 | 1 | **PASS** (août 2026, 2 remises) |
| M-P1-01 | Online-first client create : API OK → pas de file `isSync=false` | Mobile | E2E | R-006 | 1 | **PASS** |
| M-P1-02 | Fallback offline client/distribution si API down + UX erreur | Mobile | E2E | R-006 | 1 | **PASS** (alerte 4xx + Local) |
| M-P1-03 | Encaissement + reliquat couplés (un write, pas d’orphelin) | Mobile | E2E | R-006 | 1 | **SKIP** (pas de crédit actif COM020) |
| M-P1-04 | SWR liste clients/tontine : cache immédiat puis refresh | Mobile | E2E | R-006 | 1 | **PASS** |
| M-P1-05 | Livraison tontine utilise budget V1/V2 local ; badge si unsynced | Mobile | E2E | R-006 | 1 | **PASS** (Part société V1) |
| M-P1-06 | Retry manuel erreur sync `tontine-collection` | Mobile | E2E | R-006 | 1 | **Hors navigateur** (pile tontine) |
| RM-P1-01 | 4ᵉ commercial désactivé + toast ; hard rule size ∈ [1, 3] | Mobile | E2E | R-020 | 1 | **PASS** |
| RM-P1-02 | Localités via modal multi-select + recherche (plus de chips exhaustifs) | Mobile | E2E | R-020 | 1 | **PASS** |
| RM-P1-03 | Contrôle carnet crédit CONFORME/ECART hybrid + badge du jour | Mobile | E2E | R-019 | 1 | **PASS** |
| RM-P1-04 | Contrôle tontine V2 mois-par-mois ; badge Terrain CONFORME/ECART | Mobile | E2E | R-019 | 1 | **PASS** (arrange COM020) |
| RM-P1-05 | Édition client RM : phone + GPS ; `quarter` lecture seule ; `mll` dérivé | Mobile | E2E | R-019 | 1 | **PASS** |
| RM-P1-06 | Sync Plus ordre : contacts → contrôles crédit → tontine → clôtures | Mobile | E2E | R-021 | 1 | **PASS** |
| RM-P1-07 | Barre session (username + online/offline) **seulement** Retards et Plus | Mobile | E2E | R-017 | 1 | **PASS** |
| RM-P1-08 | KPI Clôturé du jour + badge file d’attente sur Retards | Mobile | E2E | R-018 | 1 | **PASS** |
| RM-P1-09 | Tab Terrain : liste tontine par commercial/quartier | Mobile | E2E | R-019 | 1 | |
| RM-P1-10 | Plus : version app + bouton « Mettre à jour l'application » | Mobile | E2E | — | 1 | **Hors périmètre** (technique, pas métier) |
| RM-P1-11 | Liste Clients RM : avatar thumb MinIO, fallback initiales | Mobile | E2E | — | 1 | **Hors périmètre** (technique / UI, pas métier) |

**Total P1**: 33 tests, ~25-50 hours

### P2 (Medium) — secondaire / edge

| ID | Requirement | Surface | Test Level | Risk | Count |
| --- | --- | --- | --- | --- | --- |
| W-P2-01 | Pagination historique remises `id DESC` | Web | E2E | R-005 | 1 |
| W-P2-02 | Datepicker rattrapage limité au mois du stock source | Web | E2E | — | 1 |
| W-P2-03 | Bandeau tontine si `GET /allocation-migration/status` RUNNING | Web | E2E | R-012 | 1 |
| W-P2-04 | Photos fiche client MinIO prioritaire | Web | E2E smoke visuel | — | 1 |
| M-P2-01 | Sync photos thumbs MinIO | Mobile | E2E | — | 1 |
| M-P2-02 | Ping connectivity TTL 120s (pas un ping par action) | Mobile | Unit | — | 1 |
| M-P2-03 | Chef recouvrement : bouton MAJ app sur Plus | Mobile | E2E | — | 1 |
| B-P2-01 | Cycle beans tontine migration `@Lazy` (contexte Spring) | Backend | Unit/context | — | 1 |
| RM-P2-01 | Scroll `ion-content` Retards / Terrain / Clients / Plus | Mobile | E2E | — | 1 |
| RM-P2-02 | Conflit commercial/chef → refus serveur, pas de fallback silencieux | Mobile | E2E | R-018 | 1 | D4 spec |
| RM-P2-03 | Pack `includeTontine=true` : membres `SESSION_INPROGRESS` filtrés collector+quarters | Mobile/API | API | R-019 | 1 | |
| RM-P2-04 | Recherche Clients RM barre navy ; groupes « Localité · … » | Mobile | E2E | — | 1 |

**Total P2**: 12 tests, ~3-8 hours

### P3 (Low)

| ID | Requirement | Surface | Count |
| --- | --- | --- | --- |
| W-P3-01 | Pied de page PDF `n/N` navy | Web visuel | 1 |
| W-P3-02 | Lazy-loading `/home` dashboard inchangé | Web smoke | 1 |

**Total P3**: 2 tests, ~0.5-1 hours

Le shell RM (tabs navy, barre session) n’est **plus** P3 : il est couvert par RM-P0-* et RM-P1-07.

---

## Scénarios P0 atomiques (recette exécutable)

Format : indépendant, Given/When/Then, tag, donnée.

### Web — SEC / stock / caisse

**W-P0-01** `@p0 @web @august-2026 @regression`  
Given un JWT chef de recouvrement sans `ROLE_KPI_FINANCIER_*`  
When il ouvre `/credit/list` et `/home`  
Then les bandeaux KPI montants sont absents ; les tableaux de listes restent.

**W-P0-02**  
Given le même JWT  
When `GET /api/v1/credits/list-summary` et yearly-summary rapport  
Then HTTP 403.

**W-P0-06**  
Given magasinier `mag001` et un article E2E dont la qté stock est lue avant  
When il saisit une entrée stock (inventory-add)  
Then réception `PENDING`, redirection `/stock/receptions`, qté stock **égale** à avant.

**W-P0-07a**  
Given réception E2E `PENDING`  
When ges003 clique Valider  
Then statut `VALIDATED`, qté stock **augmente**.

**W-P0-07b**  
Given une **autre** réception E2E `PENDING`  
When ges003 clique Refuser  
Then `REFUSED`, qté stock inchangée.

**W-P0-09**  
Given versements non remis + une dépense période E2E  
When secrétaire soumet remise avec cette dépense  
Then UI affiche Dépenses et Net = total − dépense ; API refuse si dépense > total.

**W-P0-10**  
Given remise `RECEIVED` liée à la dépense  
When on ouvre la fiche dépense  
Then lecture seule + badge Comptabilisée ; update/delete API refusé.

### Mobile — DATA sync

**M-P0-01**  
Given mobile online, membre tontine E2E, backend up  
When collecte enregistrée  
Then POST collections 2xx, SQLite `isSync=true`, `societyShareAmount` serveur persisté.

**M-P0-02**  
Given login online (init complète) puis **arrêt réel du backend**  
When collecte tontine hors-ligne, relance backend, sync manuelle Plus  
Then badge « estimation hors-ligne », file unsynced persistée, **un** POST collections 2xx, ligne visible via GET API.

**M-P0-03**  
Given unsynced collection en SQLite  
When `initializeAllData` / reload  
Then la ligne unsynced existe toujours.

### Mobile — shell Chef de recouvrement (`@rm`)

**RM-P0-01** `@p0 @mobile @rm @august-2026 @regression`  
Given un compte profil `RECOVERY_MANAGER` et flag `recoveryManagerMobile` actif  
When login sur l’app mobile  
Then URL `/rm/plan` ou `/rm/dashboard` ; **pas** `/tabs` ; **pas** de redirection SSO vers le frontend web.

**RM-P0-02**  
Given COM020 (PROMOTER)  
When login puis `goto('/rm/dashboard')`  
Then redirect `/tabs/dashboard` (RmProfilGuard).

**RM-P0-03**  
Given RM sans `FieldDayPlan` ACTIVE aujourd’hui  
When `goto('/rm/dashboard')` ou tab Retards  
Then redirect `/rm/plan` (RmPlanGuard).

**RM-P0-04**  
Given RM sur `/rm/plan`  
When sélection 1 à 3 commerciaux, localités (modal), téléchargement pack  
Then plan `ACTIVE`, navigation `/rm/dashboard`, KPI retards visibles, tabs Retards/Terrain/Clients/Plus présents.

**RM-P0-05**  
Given un retard du pack, online  
When clôture totale/partielle puis **même** `reference` renvoyée  
Then un seul encaissement ; remaining inchangé au replay ; HTTP succès idempotent.

**RM-P0-06**  
Given offline (intercept)  
When clôture + fallback  
Then `rm_close_ops` unsynced, badge file ; au restore, sync Plus : **un** POST `close-credits`.

---

## Execution Strategy

**Philosophy**: Playwright web/mobile = cheap → tout le fonctionnel en local / PR. k6 hors scope août.

Organisé par **outil**, pas par priorité d’étiquette :

### Every PR / rejeu local : Playwright + JUnit

- Frontend : `smoke` puis `august-2026` (P0→P1 dans les fichiers, grep `@p0` en fail-fast)
- Mobile : `--grep @august-2026` puis fail-fast `--grep @rm` pour le shell chef de recouvrement
- Backend : tests listés plus haut
- Golden-path **inchangé** : non-régression parcours cœur V1 (stock, vente, tontine). Le jouer **après** P0 août, pas à la place.

### Nightly

- Rien de nouveau (pas de perf dédiée). Option : golden-path + august-2026 complets.

### Weekly / manuel

- Bascule réelle V1→V2 sur **copie** de base (job async, lock, bandeau) — trop dangereux sur la base de travail quotidienne.
- PDFs navy visuels (P3).

`workers: 1` déjà configuré web : les specs août restent séquentiels (SweetAlert, stock partagé). Mobile : garder sequential pour SQLite.

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
| --- | --- | --- | --- | --- |
| P0 | 24 | 1.5-2.5 | 36-60 | Comptes extra, pack RM, intercept mobile, restore param |
| P1 | 33 | 0.75-1.5 | 25-50 | PDF parse, yearly math, contrôles carnet, sync ordre |
| P2 | 12 | 0.25-0.75 | 3-8 | |
| P3 | 2 | 0.1-0.5 | 0.5-1 | |
| **Total** | **71** | **—** | **~65-120** | **~2-4 weeks** |

Première exécution manuelle assistée (browser MCP) **sans specs encore écrits** : ~10-16 hours P0 only (web + shell RM) — utile pour le go-live, **ne remplace pas** la suite rejouable.

### Prerequisites

**Test Data / factories:**

- Étendre `USER_ACCOUNTS` : `secretaire`, `recoveryManager` (env `E2E_SEC_*`, `E2E_RM_*`)
- Helpers web : `createPendingReception`, `submitRemittanceWithExpenses`, `createE2eCreditWithReference`, `setSocietyShareVersion(restore)`
- Helpers mobile RM : `loginAsRecoveryManager`, `ensureTodayFieldPlan(commercials[])`, `downloadOfflinePack()`, `closeCreditOnce(reference)`
- Mobile commercial : étendre `offline-test` avec `goOffline()` / `goOnline()` et compteur POST collections
- **Testabilité RM** : aucun `data-testid` aujourd’hui sous `mobile/src/app/rm-tabs` / `features/rm`. ATDD devra les poser (`e2e-rm-tab-dashboard`, `e2e-rm-plan-continue`, `e2e-rm-close-confirm`, …) sinon les specs seront cassantes.

**Tooling:**

- Playwright 1.60 (frontend + mobile) — déjà là
- `pdf-parse` ou assert `response.headers()['content-type']` + buffer `%PDF` (éviter OCR)
- JUnit Maven backend

**Environment:**

- Frontend `http://localhost:4200`, API `http://localhost:8081`, Mobile `http://localhost:8100`
- Postgres local avec migrations **V86–V94** appliquées
- Feature flags : `clientBulkAssignCollector` retiré — ne plus en dépendre
- `E2E_SKIP_WEB_SERVER=1` si Francis a déjà `ng serve` / Ionic up

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions) — R-001 et R-006 inclus
- **P1 pass rate**: ≥95% (waiver écrit pour tout échec)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% exécutées ou waiver daté par Francis
- **Score 9 OPEN**: **FAIL** gate prod

### Coverage Targets

- Critical paths (permissions, stock PENDING, remise RECEIVED, tontine sync) : 100% des P0
- Security scenarios (SEC) : 100%
- Business logic V2 : couvert **unit**, pas E2E math
- Edge cases : P2 best-effort

### Non-Negotiable Requirements

- [ ] Tous les P0 passent (y compris RM-P0-01..06)
- [ ] Aucun risque ≥6 sans test exécuté ou waiver
- [ ] SEC (R-001, R-002, R-017) 100%
- [ ] Project Playwright `august-2026` existe et `npm run test:e2e:august` est documenté
- [ ] Paramètre tontine restauré après run
- [ ] Golden-path web toujours vert (non-régression cœur)
- [ ] Login RM n’ouvre jamais le shell commercial `/tabs`

---

## Mitigation Plans

### R-001: Fuite KPI financier vers le chef de recouvrement (Score: 9)

**Mitigation Strategy:** Compte RM réel en local. E2E UI + 403 API. Contrôle positif ges003.  
**Owner:** QA (Murat) / Francis (credentials)  
**Timeline:** 2026-08-17/18  
**Status:** Planned  
**Verification:** W-P0-01, W-P0-02, W-P0-03, W-P1-12

### R-006: Double collecte / drift V2 mobile (Score: 9)

**Mitigation Strategy:** E2E online + offline + init safe ; unit calcul V2 trou de mois ; assert un seul POST.  
**Owner:** QA  
**Timeline:** 2026-08-17/18  
**Status:** Planned  
**Verification:** M-P0-01..04, B-P0-01

### R-003: Stock PENDING (Score: 6)

**Mitigation Strategy:** E2E transitions + JUnit `StockReceptionServiceTest` en rejeu.  
**Owner:** QA  
**Verification:** W-P0-06..08

### R-004: V2 allocation (Score: 6)

**Mitigation Strategy:** JUnit = gate math. E2E = UI paramètre + bandeau. Jamais de bascule V2 non restaurée sur la base de travail.  
**Owner:** QA  
**Verification:** B-P0-01/02, W-P0-11, W-P2-03

### R-014: Specs invisibles (Score: 6)

**Mitigation Strategy:** Project Playwright + scripts npm avant d’écrire le 2e spec.  
**Owner:** QA  
**Verification:** `npx playwright test --list --project=august-2026` non vide

### R-017: Mauvais shell profil (Score: 6)

**Mitigation Strategy:** E2E croisé RM vs commercial. Flag `recoveryManagerMobile` ON pour la campagne. D7 spec : APK unique, pas de SSO forcé vers le web.  
**Owner:** QA  
**Verification:** RM-P0-01, RM-P0-02, RM-P0-03

### R-018: Double clôture terrain (Score: 6)

**Mitigation Strategy:** E2E close + replay `reference` ; file offline `rm_close_ops` ; KPI Clôturé. Backend `@PositiveOrZero` + idempotence 1.6.1.  
**Owner:** QA  
**Verification:** RM-P0-05, RM-P0-06, RM-P1-08

---

## Assumptions and Dependencies

### Assumptions

1. La base locale de Francis contient déjà des commerciaux / articles ; les tests **créent** leurs propres clients/crédits/réceptions.
2. `ges003`, `mag001`, `COM020` fonctionnent comme aujourd’hui dans `test-data.ts`.
3. Un compte **chef de recouvrement** (profil `RECOVERY_MANAGER`, **sans** rôles KPI V93) et un compte **secrétaire** existent ou seront fournis. Sans RM : **P0 shell + clôture bloqués** (plus un simple skip).
4. Le stack local (API 8081, UI 4200, mobile 8100) sera démarré par Francis avant l’exécution.
5. On ne bascule pas `TONTINE_SOCIETY_SHARE_VERSION` en V2 sur cette base sans restore explicite.
6. Customer-space n’est **pas** dans le périmètre août fonctionnel métier → hors campagne.
7. Au moins **un** commercial avec des retards (crédits late) est nécessaire pour RM-P0-04..06 ; sinon seed E2E via API avant le pack.

### Dependencies

1. Identifiants RM + secrétaire — **blocker P0** — Francis
2. Project Playwright `august-2026` — avant 1er commit de specs
3. `data-testid` manquants — web (KPI, modal reste clients, Valider réception, checkbox transfert) **et mobile RM** (`rm-tabs`, plan, sheets clôture/contrôle) — à ajouter au fil de `*atdd`
4. Mobile E2E actuel est **très mocké** (login mock). Les P0 sync **et le shell RM** **exigent** un vrai backend ; si le mock reste, M-P0 / RM-P0 sont **FAIL** (faux vert). Décision : intercept sélectif, pas mock total, pour `@august-2026` / `@rm`.

### Risks to Plan

- **Risk**: Compte RM indisponible **ou** aucun retard dans le périmètre  
  - **Impact**: Gate SEC R-001 (web) **et** cluster `/rm` (mobile) impossibles  
  - **Contingency**: créer le compte (profil RECOVERY_MANAGER, sans copy V93 KPI) + seed 1 crédit late E2E sur un commercial du plan
- **Risk**: E2E mobile contre API réelle flaky (SQLite + Ionic + pack RM)  
  - **Impact**: M-P0 / RM-P0 instables  
  - **Contingency**: unit + E2E narrow (routing shell, un close, un pack) plutôt que 20 E2E larges

---

## Follow-on Workflows (Manual)

- Run `*atdd` pour générer les specs Playwright **failing-first** des P0 (fichiers `august-2026/*.spec.ts` + project config).
- Run `*automate` pour élargir P1 une fois P0 verts.
- Run `*trace` Phase 2 pour le quality gate prod (PASS / CONCERNS / FAIL).

Cette session TD **ne lance pas** ATDD toute seule.

---

## Approval

**Test Design Approved By:**

- [x] Product Owner: Francis Date: 2026-08-17
- [ ] Tech Lead: Date:
- [x] QA Lead: Murat (TEA) Date: 2026-08-17

**Comments:** Validé par Francis le 2026-08-17, y compris le cluster shell Chef de recouvrement `/rm`. Suite conçue pour être relancée via tags `@august-2026` / `@rm` / `@regression`. Prochaine étape manuelle : `*atdd` (P0 web + RM), puis exécution locale. Credentials RM + secrétaire + stack up toujours requis.

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — classification + gate score 9 = FAIL
- `probability-impact.md` — P×I
- `test-levels-framework.md` — unit calcul, E2E parcours
- `test-priorities-matrix.md` — P0 revenue/security/data
- `fixture-architecture.md` — helpers purs + isolation

### Related Documents

- Plans: `.cursor/plans/*` (13 fichiers 11–17 août)
- Spec RM: `.kiro/specs/recovery-manager-mobile/screens-and-api.md`
- Changelog: `docs/CHANGELOG.md` (Mobile 2.15.0–2.20.1)
- E2E existant: `frontend/e2e`, `mobile/e2e` (aucun spec RM aujourd’hui)
- Code RM: `mobile/src/app/rm-tabs/`, `mobile/src/app/features/rm/`
- Backend tests: `V2TontineAllocationPolicyTest`, `StockReceptionServiceTest`, `CashPeriodRemittanceServiceTest`, `CreditSearchSqlFilterTest`

---

**Generated by**: BMad TEA Agent - Test Architect Module  
**Workflow**: `_bmad/bmm/testarch/test-design`  
**Version**: 4.0 (BMad v6)
