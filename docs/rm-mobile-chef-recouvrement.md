# Chef de Recouvrement (RM) — Implémentation mobile & estimation

**Objectif du document :** décrire l’implémentation réelle du shell mobile *Chef de Recouvrement* (`RECOVERY_MANAGER`) et fournir une grille d’estimation **jour/homme (jh)** pour un développeur qui devrait reconstruire un équivalent.

**Composants :** Mobile Ionic/Angular + Backend Spring Boot  
**Couleur / UI :** Navy `#003366` (shell dédié)  
**Mode écriture :** Hybrid online-first (`OnlineFirstWriteCoordinator`)  
**Spec de référence :** `.kiro/specs/recovery-manager-mobile/screens-and-api.md`  
**Périmètre versions :** Mobile **2.15.0 → 2.22.0** (noyau RM) ; backend associé **1.6.0 → 1.12.x**

---

## 1. Résumé exécutif

Le RM dispose d’un **shell mobile séparé** (`/rm`), distinct de l’app commercial (pas de SQLite commercial, pas de bootstrap `initial-loading`).

Flux métier :

1. Login → wizard **Plan du jour** (1–3 commerciaux + localités)  
2. Téléchargement d’un **pack offline** (retards, clients, tontines, contrôles du jour)  
3. Travail terrain sur 4 onglets : **Retards / Terrain / Clients / Plus**  
4. Écritures **online-first** ; si réseau KO → files Ionic Storage + sync ordonnée depuis Plus  

| Indicateur | Valeur indicative |
|------------|-------------------|
| Écrans / modules UI | ~12 (shell, 4 tabs, plan, 5+ sheets/overlays) |
| Services RM dédiés | ~37 fichiers sous `mobile/.../services/rm/` |
| Files offline | 6 domaines |
| Endpoints backend RM / associés | ~15+ |
| Estimation nominale full-stack | **38–45 jh** |
| Fourchette (junior → senior connu codebase) | **32–55 jh** |

---

## 2. Hypothèses d’estimation

Les jh ci-dessous supposent :

| Hypothèse | Détail |
|-----------|--------|
| Profil | Développeur mid (Angular/Ionic + Spring Boot), **familier** d’ELYKIA commercial |
| Cadence | 1 jh = ~7–8 h productives |
| Inclus | Conception fine, code, tests unitaires ciblés, smoke manuel |
| Exclus | Recette métier formelle, formation terrain, déploiement prod, design Figma from scratch |
| Socle déjà présent | Auth JWT, feature flags, `OnlineFirstWriteCoordinator`, Connectivity, AppUpdate, navy tokens partiels, APIs close-credits / field-controls **web** déjà existantes ou à construire (noté par lot) |
| Complexité | Hybrid offline + mutations optimistes du pack = principal risque de dérive |

Si le développeur **ne connaît pas** le repo : +20–30 % sur chaque lot.

Si les APIs field-control / close / plan **n’existent pas** côté backend : utiliser la colonne « Backend » des lots (sinon la réduire de ~40–60 %).

---

## 3. Architecture cible

```
┌─────────────────────────────────────────────────────────────┐
│  Auth (profil RECOVERY_MANAGER + flag recoveryManagerMobile) │
└────────────────────────────┬────────────────────────────────┘
                             ▼
                    /rm/plan  (wizard)
                             │ POST field-plans + GET offline-pack
                             ▼
              Ionic Storage: plan + pack + 6 queues
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   /rm/dashboard        /rm/field           /rm/clients
     Retards             Terrain             Clients
   close + FC crédit   tontine FC + carnet   contact + assign
         └───────────────────┬───────────────────┘
                             ▼
                         /rm/more (Plus)
              refresh pack · sync ordonnée · logout
```

### 3.1 Principes techniques verrouillés

| ID | Décision |
|----|----------|
| D1 | Filtre localité = `Client.quarter` (string) |
| D2 | Contrôles tontine = modèle mois-par-mois (V2) |
| D3 | Max **3** commerciaux / plan + warning volume (>400 retards / ~25 Mo) |
| D4 | Scoping serveur : client doit appartenir au plan ACTIVE |
| D5 | Édition client RM : `phone`, `lat`, `lng`, `mll` — **pas** `quarter` |
| D6 | Hybrid : online immédiat ; offline → file + sync |
| D7 | APK unique, shell profil séparé (pas de SSO web forcé) |

### 3.2 Stockage offline (important)

| Couche | Usage RM |
|--------|----------|
| **Ionic Storage** | Plan, pack, toutes les files d’ops, cache promoteurs |
| **SQLite commercial** | **Non utilisé** par le shell RM |
| **Postgres** | `recovery_field_day_plan`, field controls, carnet_verified, opérations RM |

> La spec D6 mentionnait SQLite `isSync=false` ; l’implémentation réelle utilise **Ionic Storage + mutations du pack en mémoire**.

### 3.3 Pattern d’écriture hybride

Chaque domaine suit le même schéma :

1. `*ApiService` — HTTP  
2. `*QueueService` — persistance file (Ionic Storage)  
3. `*WriteService` — online-first + mutation optimiste du pack  
4. `*SyncService` — flush file depuis Plus  

Coordinateur partagé : `mobile/src/app/core/services/online-first-write.coordinator.ts`

---

## 4. Parcours utilisateur (implémentés)

### 4.1 Plan du jour — `/rm/plan`

1. Login RM → redirection `/rm/plan` (bypass commercial init).  
2. Étape 1 : `GET .../collector-stats` → sélection **1–3** commerciaux.  
3. Étape 2 : multi-select **Localités** (modal + recherche) ; vide = toutes.  
4. Étape 3 : estimation volume ; confirmation si gros pack.  
5. `POST /field-plans` + `GET .../offline-pack?includeTontine=true` → Storage → `/rm/dashboard`.  
6. Si plan ACTIVE + pack du jour déjà présents → redirect auto dashboard (`RmPlanGuard`).

### 4.2 Retards — `/rm/dashboard`

- Liste `lateCredits` du pack, groupée localité, filtre commercial.  
- KPI : nb retards, montant dû, clôturé du jour, badge file close.  
- Actions : **Clôturer** (sheet total/partiel), **Contrôle** carnet crédit.  
- Barre de session (username + online/offline).

### 4.3 Terrain — `/rm/field`

- Retards (accès Maps via `mll` / lat-lng).  
- Membres tontine (par `tontineCollector` → localité).  
- Contrôle carnet tontine (sheet mois 2–11).  
- Vérification carnet (unitaire + masse) + badge Vérifié.  
- Pas de barre de session (retirée après 2.19.6).

### 4.4 Clients — `/rm/clients`

- Clients du pack ; recherche ; avatars MinIO (`profilPhotoThumbUrl`).  
- Édition contact (tél + GPS).  
- Multi-sélection → **transfert commercial** crédit et/ou tontine (+ ventes en cours).

### 4.5 Plus — `/rm/more`

- Infos plan/pack, compteurs files.  
- **Actualiser pack**, **Synchroniser**, **Changer de plan**, MAJ app, logout.  
- Barre de session.

### 4.6 Ordre de sync (Plus)

1. Transferts commerciaux (assign)  
2. Contacts  
3. Contrôles carnet crédit  
4. Contrôles carnet tontine  
5. Vérifications carnet  
6. Clôtures  

Idempotence via `reference` côté close / field-controls.

---

## 5. Lots de travail & estimation jh

Légende : **M** = Mobile, **B** = Backend, **T** = Tests/QA ciblés.

### Lot A — Shell, auth, routing, design system  
**Livrable :** app RM navigable, séparée du commercial.

| Travail | Détail | jh |
|---------|--------|----|
| M | Routes `/rm`, `/rm/plan`, tabs host, modules Ionic | 1.0 |
| M | `RmProfilGuard`, `RmPlanGuard`, branchements `AuthGuard` / `AuthEffects` | 1.5 |
| M | Feature flag `recoveryManagerMobile` | 0.5 |
| M | Design tokens navy + layout tabs (Retards/Terrain/Clients/Plus) | 1.5 |
| T | Smoke login → plan → tabs ; non-RM bloqué | 0.5 |

**Sous-total Lot A :** **5.0 jh** (fourchette 4–6)

Fichiers clés : `rm-tabs/`, `rm-profil.guard.ts`, `rm-plan.guard.ts`, `auth.effects.ts`, `feature-flag.service.ts`

---

### Lot B — Plan du jour + API field-plans + pack squelette  
**Livrable :** wizard 3 étapes + plan ACTIVE en base + pack téléchargeable (retards/clients a minima).

| Travail | Détail | jh |
|---------|--------|----|
| B | Entity `RecoveryFieldDayPlan`, migration V85, CRUD plan (create/today/patch/close) | 2.0 |
| B | `GET collector-stats` (agrégats retards par commercial) | 1.0 |
| B | `GET offline-pack` (filtre commercials + quarters, lateCredits, clients, stats) | 2.5 |
| M | Wizard UI (stats, multi-select localités, sticky CTA, warning volume) | 2.5 |
| M | `RmFieldPlanApiService`, `RmOfflinePackService`, `RmScopeService` (Storage) | 1.5 |
| T | E2E plan + pack | 1.0 |

**Sous-total Lot B :** **10.5 jh** (fourchette 9–13)

Fichiers : `RecoveryFieldPlanService`, `RecoveryManagerController` (field-plans*), `features/rm/plan/`

---

### Lot C — Clôture crédits hybride  
**Livrable :** sheet clôture total/partiel offline-capable.

| Travail | Détail | jh |
|---------|--------|----|
| B | `reference` idempotente sur `close-credits`, `@PositiveOrZero`, replay | 1.0 |
| M | Sheet close + API/queue/write/sync | 2.5 |
| M | Mutation pack (retirer/mettre à jour late), KPI « Clôturé », badge file | 1.0 |
| T | E2E close online + offline | 1.0 |

**Sous-total Lot C :** **5.5 jh** (fourchette 4.5–7)

---

### Lot D — Édition contact client  
**Livrable :** patch téléphone + géoloc scopé au plan.

| Travail | Détail | jh |
|---------|--------|----|
| B | `PATCH /recovery-manager/clients/{id}/contact` + assert plan scope + `mll` | 1.5 |
| M | Sheet client-edit + stack contact hybrid | 2.0 |
| M | Sync contacts dans Plus (avant closes) | 0.5 |
| T | Smoke édition + scoping | 0.5 |

**Sous-total Lot D :** **4.5 jh** (fourchette 3.5–5.5)

---

### Lot E — Contrôle carnet crédit  
**Livrable :** CONFORME / ECART sur Retards.

| Travail | Détail | jh |
|---------|--------|----|
| B | API `POST/GET /credits/{id}/field-controls` (+ `reference` V84) si absente | 1.5–2.5 |
| M | Sheet field-control + queue/write/sync | 2.5 |
| M | Badges du jour depuis `creditFieldControlsToday` | 0.5 |
| T | E2E contrôle | 0.5 |

**Sous-total Lot E :** **5.0 jh** (si API déjà là côté web : **3.5 jh**)

---

### Lot F — Pack tontine + contrôle carnet tontine  
**Livrable :** Terrain opérationnel sur tontines.

| Travail | Détail | jh |
|---------|--------|----|
| B | Peuplement pack `includeTontine` (membres SESSION_INPROGRESS, mois 2–11, contrôles du jour) | 2.5 |
| B | API tontine field-controls (lignes mois) si absente | 2.0 |
| M | Modèles pack tontine, UI Terrain listes + sheet mois-par-mois | 3.5 |
| M | Queue/write/sync tontine FC + ordre sync Plus | 1.5 |
| T | Typage + smoke Terrain | 1.0 |

**Sous-total Lot F :** **10.5 jh** (fourchette 8–13) — **lot le plus dense**

---

### Lot G — UX polish (session, scroll, localités, avatars)  
**Livrable :** ergonomie terrain.

| Travail | Détail | jh |
|---------|--------|----|
| M | Session bar (ping 30s) puis restriction Retards/Plus | 1.0 |
| M | `ion-content` scroll, searchbar, libellés Localités | 1.0 |
| M | Avatars MinIO thumbs sur Clients | 0.5 |
| M | Version + MAJ in-app sur Plus | 0.5 |

**Sous-total Lot G :** **3.0 jh** (fourchette 2–4)

---

### Lot H — Vérification carnets tontine  
**Livrable :** badge Vérifié unitaire + masse.

| Travail | Détail | jh |
|---------|--------|----|
| B | Colonnes `carnet_verified` + PATCH/POST bulk | 1.5 |
| M | Actions Terrain + queue/sync | 2.0 |
| T | E2E carnet | 0.5 |

**Sous-total Lot H :** **4.0 jh** (fourchette 3–5)

---

### Lot I — Transfert commercial (bulk assign)  
**Livrable :** réaffectation crédit/tontine (+ ventes en cours) depuis Clients.

| Travail | Détail | jh |
|---------|--------|----|
| B | `POST /clients/bulk-assign-collectors` + permissions + transfert crédits en cours | 2.0 |
| M | Sheet multi-select + cache promoteurs + hybrid queue (sync prioritaire) | 2.5 |
| M | Mutation pack collectors | 0.5 |
| T | Smoke assign online/offline | 0.5 |

**Sous-total Lot I :** **5.5 jh** (fourchette 4.5–7)

---

### Lot J — Intégration, E2E, durcissement  
**Livrable :** suite E2E RM + correctifs logout/timezone/refresh pack.

| Travail | Détail | jh |
|---------|--------|----|
| T | Suite Playwright RM (shell, plan, close online/offline, clients, carnet, sync order) | 2.5 |
| M/B | Gaps connus : logout queues incomplètes, timezone UTC vs serveur, refresh pack vs état local | 1.5 |
| T | Buffer bugs intégration | 1.5 |

**Sous-total Lot J :** **5.5 jh** (fourchette 4–7)

---

## 6. Synthèse estimation

### 6.1 Par lot (nominal)

| Lot | Intitulé | jh nominal |
|-----|----------|------------|
| A | Shell / auth / design | 5.0 |
| B | Plan + pack | 10.5 |
| C | Clôture | 5.5 |
| D | Contact client | 4.5 |
| E | Contrôle crédit | 5.0 |
| F | Tontine pack + contrôle | 10.5 |
| G | UX polish | 3.0 |
| H | Vérif carnet | 4.0 |
| I | Transfert commercial | 5.5 |
| J | E2E + durcissement | 5.5 |
| **Total** | | **59.0 jh** |

> Ce total **empile** backend + mobile + tests. En pratique beaucoup de lots ont été faits en parallèle / en s’appuyant sur des APIs web déjà là.

### 6.2 Scénarios réalistes

| Scénario | Hypothèse | jh | ≈ semaines (1 dev) |
|----------|-----------|----|---------------------|
| **Optimistic** | Dev senior ELYKIA ; APIs field-control/close déjà en place ; peu de QA formelle | **32–36** | 6.5–7.5 |
| **Nominal** | Mid ; backend plan/pack + hybrid à construire ; E2E ciblés | **38–45** | 8–9 |
| **Pessimistic** | Junior / nouveau sur repo ; APIs tontine + assign from scratch ; beaucoup de rework offline | **50–60** | 10–12 |

### 6.3 Découpage recommandé (phases)

| Phase | Lots | jh nominal | Milestone métier |
|-------|------|------------|------------------|
| **P0** | A + B | 15.5 | Plan + lecture retards offline |
| **P1** | C + D | 10.0 | Clôture + édition contact |
| **P2** | E | 5.0 | Contrôle carnet crédit |
| **P3** | F + G | 13.5 | Terrain tontine + polish |
| **P4** | H + I + J | 15.0 | Carnet verify + assign + E2E |

Aligné avec la livraison réelle (P0–P4 puis itérations 2.19–2.22).

### 6.4 Répartition Mobile / Backend (nominal)

| Couche | jh approx. | % |
|--------|------------|---|
| Mobile (UI + hybrid + queues) | 28–32 | ~55 % |
| Backend (plan, pack, endpoints, migrations) | 18–22 | ~35 % |
| Tests E2E / durcissement | 5–7 | ~10 % |

---

## 7. Inventaire fonctionnel détaillé

### 7.1 Modules mobile

| Zone | Chemin | Rôle |
|------|--------|------|
| Shell tabs | `mobile/src/app/rm-tabs/` | Host + routing + 4 pages |
| Plan | `mobile/src/app/features/rm/plan/` | Wizard 3 steps |
| Session | `.../session-bar/` | Identité + ping online |
| Close | `.../close/` | Sheet clôture |
| FC crédit | `.../field-control/` | Sheet CONFORME/ECART |
| FC tontine | `.../tontine-field-control/` | Sheet mois-par-mois |
| Contact | `.../client-edit/` | Tél + GPS |
| Assign | `.../collector-assign/` | Bulk transfert |
| Services | `mobile/src/app/core/services/rm/` | API / queue / write / sync / models |
| Guards | `mobile/src/app/core/guards/rm-*.guard.ts` | Profil + plan |

### 7.2 Files Ionic Storage

| Clé | Domaine |
|-----|---------|
| `rm_field_plan` | Plan du jour |
| `rm_offline_pack` | Pack offline |
| `rm_pack_downloaded_at` | Horodatage |
| `rm_close_ops` | Clôtures |
| `rm_client_contact_patches` | Contacts |
| `rm_field_controls` | Contrôles crédit |
| `rm_tontine_field_controls` | Contrôles tontine |
| `rm_tontine_carnet_verifications` | Vérifs carnet |
| `rm_collector_assign_ops` | Transferts |
| `rm_collectors_cache` | Liste promoteurs |

### 7.3 APIs backend

#### `api/v1/recovery-manager`

| Méthode | Path | Usage |
|---------|------|--------|
| POST | `/close-credits` | Clôture (idempotente via `reference`) |
| GET | `/field-plans/collector-stats` | Wizard |
| POST | `/field-plans` | Créer / remplacer plan ACTIVE |
| GET | `/field-plans/today` | Plan du jour |
| PATCH | `/field-plans/{id}` | MAJ plan |
| POST | `/field-plans/{id}/close` | Clôturer plan |
| GET | `/field-plans/{id}/offline-pack?includeTontine=` | Pack |
| PATCH | `/clients/{id}/contact` | Contact scopé |
| GET | `/operations`, `/report/*` | Historique / PDF (surtout web) |

#### Associées

| Méthode | Path | Usage |
|---------|------|--------|
| POST | `/api/v1/credits/{id}/field-controls` | Contrôle crédit |
| POST | `/api/v1/tontines/members/{id}/field-controls` | Contrôle tontine |
| PATCH | `/api/v1/tontines/members/{id}/carnet-verification` | Vérif unitaire |
| POST | `/api/v1/tontines/members/carnet-verifications` | Vérif masse |
| POST | `/api/v1/clients/bulk-assign-collectors` | Transfert |
| GET | `/api/v1/promoters/all` | Liste commerciaux |

### 7.4 Migrations SQL liées

| Migration | Contenu |
|-----------|---------|
| V82 | `credit_field_control` |
| V83 | `tontine_member_field_control` (+ lines) |
| V84 | Idempotency `reference` |
| V85 | `recovery_field_day_plan` |
| V95 | Permissions RM client / assign |
| V96 | Colonnes carnet_verified + rôles |

---

## 8. Points de complexité (risques d’estimation)

| # | Risque | Impact jh | Mitigation |
|---|--------|-----------|------------|
| 1 | Mutations optimistes pack vs refresh serveur | +2–4 | Rejouer files après refresh ; tests sync |
| 2 | Dual listes Terrain (crédit + tontine) | +1–2 | UX claire ; pas de contrôle crédit sur Terrain |
| 3 | Timezone planDate (`toISOString` UTC vs `LocalDate` serveur) | +0.5–1 | Aligner date locale |
| 4 | Logout : files carnet/assign parfois non vidées | +0.5 | Harmoniser `AuthEffects` / Plus |
| 5 | Pack clients surtout issus des retards (tontine-only partiel) | +1–2 | Clarifier règles pack |
| 6 | Idempotence `reference` (longueur, collisions) | +0.5 | Convention préfixe + truncate |
| 7 | Volume pack (>400 retards) perf mobile | +1–2 | Warning + pagination/filtre côté UI |
| 8 | Photos MinIO (CORS / public URL) sur avatars | +0.5–1 | Thumbs publics + fallback initiales |

---

## 9. Ce qui n’est **pas** dans le shell RM

À ne pas compter dans l’estimation RM :

- Distributions / stock / commandes / tontine **commercial** (SQLite)  
- SSO web forcé  
- Reporting PDF RM web (endpoints existent, UI mobile Plus = sync/MAJ seulement)  
- Migration MinIO globale (hors avatars clients pack)  

---

## 10. Checklist de recette (pour valider un devis)

- [ ] Login RM → `/rm/plan` (pas commercial)  
- [ ] Non-RM → `/rm` refusé  
- [ ] Plan 1–3 commerciaux + localités + pack  
- [ ] Guard : sans pack du jour → retour plan  
- [ ] Clôture online + offline + sync Plus  
- [ ] Contrôle crédit CONFORME/ECART  
- [ ] Terrain : contrôle tontine mois + badges  
- [ ] Vérif carnet unitaire / masse  
- [ ] Édition contact + Maps  
- [ ] Transfert commercial + sync prioritaire  
- [ ] Logout nettoie plan/pack/files  
- [ ] Mode avion : files + reprise  

---

## 11. Recommandation pour chiffrage commercial

Pour un **devis client / planning interne** :

1. Annoncer **40 jh** full-stack (1 mid) comme baseline.  
2. Découper en **P0–P4** avec jalons démo.  
3. Prévoir **+15 %** buffer offline/hybrid.  
4. Si backend field-control / close déjà livrés (web) : basculer vers **34–38 jh**.  
5. Si 2 personnes (1 mobile + 1 backend) en parallèle : calendrier **~5–6 semaines** (pas 20 jh calendaires — coordination + intégration).

---

## 12. Références code

```
mobile/src/app/rm-tabs/
mobile/src/app/features/rm/
mobile/src/app/core/services/rm/
mobile/src/app/core/guards/rm-profil.guard.ts
mobile/src/app/core/guards/rm-plan.guard.ts
backend/.../controller/sale/RecoveryManagerController.java
backend/.../service/sale/RecoveryFieldPlanService.java
.kiro/specs/recovery-manager-mobile/screens-and-api.md
docs/CHANGELOG.md  (Mobile 2.15.0 → 2.22.0)
mobile/e2e/specs/august-2026/rm-*.spec.ts
```

---

*Document généré pour estimation. Refléte l’état implémenté dans le dépôt ELYKIA (août 2026).*
