# Spec — Chef de Recouvrement Mobile (écrans + contrats API)

**Statut :** Draft validé métier  
**Composant :** Mobile (shell `RECOVERY_MANAGER`) + Backend  
**Couleur primaire :** Navy `#003366` (alignée frontend ELYKIA)  
**Mode écriture :** Hybrid-first (`OnlineFirstWriteCoordinator`)

---

## 0. Décisions verrouillées

| ID | Décision |
|----|----------|
| D1 | Filtre localité / plan = `Client.quarter` (string) |
| D2 | Contrôles tontine = **V2** (modèle + stubs pack préparés en V1) |
| D3 | Max **3 commerciaux** par plan du jour + warning volume pack |
| D4 | Conflit commercial/chef → refus serveur + erreur métier mobile |
| D5 | Édition client RM : **`phone`**, **`latitude`**, **`longitude`**, **`mll`** (pas `quarter`) |
| D6 | Hybrid : online → API immédiate ; offline / network fail → SQLite `isSync=false` + sync ultérieure |
| D7 | APK unique, shell profil séparé (pas de SSO forcé vers le web) |

### Clarification D5 — géolocalisation

| Champ | Rôle |
|-------|------|
| `latitude` / `longitude` | Coordonnées GPS |
| `mll` | Lien Maps généré : `https://www.google.com/maps/search/?api=1&query={lat},{lng}` |
| `quarter` | Quartier / localité métier — **filtre plan & regroupement liste**, lecture seule côté édition RM V1 |

---

## 1. Design system — premium mobile navy

### 1.1 Tokens

```scss
:root, .rm-shell {
  --rm-navy:        #003366;
  --rm-navy-dark:   #002244;
  --rm-navy-mid:    #004080;
  --rm-navy-pale:   #e8eef6;
  --rm-navy-xpale:  #f0f4f9;
  --rm-bg:          #f2f4f8;
  --rm-surface:     #ffffff;
  --rm-border:      #dde3ec;
  --rm-text:        #1a2332;
  --rm-muted:       #6b7a99;
  --rm-light:       #9aacc4;
  --rm-green:       #1d8a3c;
  --rm-green-pale:  #e6f5eb;
  --rm-orange:      #c75000;
  --rm-orange-pale: #fff3e6;
  --rm-red:         #b91c1c;
  --rm-red-pale:    #fef2f2;
  --rm-cyan:        #0095c8;
  --rm-radius:      16px;
  --rm-radius-sm:   12px;
  --rm-radius-xs:   8px;
  --rm-shadow:      0 8px 24px rgba(0, 51, 102, 0.08);
  --rm-shadow-sm:   0 2px 8px rgba(0, 51, 102, 0.06);
}
```

### 1.2 Typographie

| Usage | Style |
|-------|--------|
| Police UI | Inter |
| Montants / KPI | DM Mono (ou tabulaire) |
| Sur-titre | 11px, uppercase, letter-spacing 0.1em, `--rm-light` |
| Titre écran | 22–24px, weight 800, `--rm-navy` |
| Corps | 14–15px, `--rm-text` |
| Meta | 12–13px, `--rm-muted` |

### 1.3 Patterns UI (obligatoires)

- **Fond page** `#f2f4f8`, surfaces blanches en cartes radius 16, ombre soft navy.
- **Header immersif** : bandeau navy dégradé `#003366 → #002244`, titre blanc, chips statut connectivité.
- **KPI strip** : 2×2 ou scroll horizontal, accent gauche 4px (navy / orange / red / green).
- **CTA primaire** : fond navy, radius 12, hauteur 48–52, label bold.
- **CTA secondaire** : outline navy pale / texte navy.
- **FAB / barre flottante** : navy, blur backdrop, safe-area bottom.
- **États** : skeleton shimmer navy-pale ; empty state illustration + 1 CTA ; offline badge ambre.
- **Motion** : fade-up 180–240ms à l’entrée ; press scale 0.98 sur boutons ; progress linéaire navy sur sync.
- **Interdit** : purple gradients, dark mode forcé, pills multi-couches, cards dans un hero déjà cardé, Material raised bruts.

### 1.4 Indicateurs hybrid / sync

| Badge | Signification |
|-------|----------------|
| ● En ligne (cyan/vert) | Backend joignable |
| ● Hors ligne (ambre) | File locale active |
| ↻ Sync… | Upload en cours |
| ! En attente (n) | n ops `isSync=false` |

---

## 2. Navigation shell RM

```
┌─────────────────────────────────────┐
│  Header navy (titre contexte)       │
│  Contenu scroll                     │
├─────────────────────────────────────┤
│  Retards │ Terrain │ Clients │ Plus │
└─────────────────────────────────────┘
```

| Tab | Route | Contenu |
|-----|-------|---------|
| Retards | `/rm/dashboard` | Dashboard KPI + liste retards |
| Terrain | `/rm/field` | Plan du jour + parcours |
| Clients | `/rm/clients` | Clients du pack (edit phone/geo) |
| Plus | `/rm/more` | Sync, rapport à remettre, prefs, logout |

Routes secondaires (stack) : plan wizard, détail retard, clôture, contrôle carnet, edit client, sync détail.

**Gate :** si aucun `FieldDayPlan` ACTIVE pour aujourd’hui → redirection forcée `/rm/plan` avant tabs.

---

## 3. Écrans

### RM-01 — Plan du jour (gate)

**Objectif :** borner le pack offline (1–3 commerciaux + quarters optionnels).

**Layout**

```
┌──────────────────────────────────────┐
│ ████ HEADER NAVY ████                │
│  PLAN DU JOUR                        │
│  Mardi 11 août 2026                  │
│  Choisissez votre périmètre terrain  │
├──────────────────────────────────────┤
│  Étape ●──○──○  Commerciaux          │
│                                      │
│  ┌ Carte select ─────────────────┐   │
│  │ ☑ Kouassi Jean    48 retards  │   │
│  │ ☐ Diabaté Awa     22 retards  │   │
│  │ ☑ Traoré Moussa   31 retards  │   │
│  └───────────────────────────────┘   │
│  Compteur 2 / 3                      │
│                                      │
│  [ Continuer → ]  CTA navy full      │
└──────────────────────────────────────┘
```

**Étapes**

1. **Commerciaux** — multi-select max 3 ; source `GET /credits/late/collectors` (+ count retards). Disable 4ᵉ sélection + toast.
2. **Quartiers** — chips multi-select optionnels (`quarter` distincts des retards des commerciaux choisis). « Tous » = pas de filtre quarter.
3. **Estimation & download** — résumé (n retards, n clients, Mo estimés) ; warning si volume > seuil ; CTA « Télécharger le pack ».

**États**

- Chargement collectors skeleton.
- Erreur réseau : retry + impossible de continuer offline sans plan déjà caché.
- Pack en cours : progress navy + étapes (crédits → clients → timelines → contrôles).

**Règles**

- Soft warning : `lateCount > 400` ou taille estimée > 25 Mo.
- Hard : `commercials.length` ∈ [1, 3].
- Succès → `ACTIVE` plan + navigation dashboard.

---

### RM-02 — Dashboard Retards

**Objectif :** vue opérationnelle du jour, orientée retards.

**Layout**

```
┌──────────────────────────────────────┐
│ HEADER NAVY                          │
│  Recouvrement          ● En ligne    │
│  2 commerciaux · 5 quartiers         │
│  [Sync] icon                         │
├──────────────────────────────────────┤
│ KPI scroll                           │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│ │ 71 │ │2.4M│ │ 12 │ │850k│          │
│ │Ret.│ │Due │ │Clos│ │Rem.│          │
│ └────┘ └────┘ └────┘ └────┘          │
├──────────────────────────────────────┤
│ Filtres chips: Tous · Com1 · Com2    │
│                · Quartier ▾ · Search │
├──────────────────────────────────────┤
│ Section KOUMASSI                     │
│ ┌ Client card ───────────────────┐   │
│ │ Aya K. · ··· 07 · 3j retard    │   │
│ │ Restant 45 000 · CR-20441      │   │
│ │ Commercial: Kouassi            │   │
│ │ [Clôturer] [Contrôle] [Client] │   │
│ └────────────────────────────────┘   │
│ …                                    │
└──────────────────────────────────────┘
```

**KPI**

| KPI | Source |
|-----|--------|
| Retards ouverts | pack late non clôturés jour |
| Montant dû | sum `totalAmountRemaining` (net reliquat si applicable) |
| Clôturés aujourd’hui | ops RM du jour (sync + local) |
| À remettre | sum collectes jour par commercial |

**Carte retard**

- Avatar initiales navy-pale.
- Nom, téléphone masqué partiel, badge jours de retard (orange/red).
- Montant restant DM Mono.
- Actions : Clôturer (primaire), Contrôle carnet, Fiche client.
- Badge « ↻ local » si clôture/contrôle pending sync.

**Pull-to-refresh :** si online → SWR late list du plan ; sinon toast hors ligne.

---

### RM-03 — Clôture terrain (sheet / page)

**Objectif :** encaisser total ou partiel, hybrid.

**Layout**

```
┌──────────────────────────────────────┐
│  Clôturer le retard                  │
│  Aya Kone · CR-20441                 │
│  Commercial Kouassi · Koumassi       │
├──────────────────────────────────────┤
│  Restant dû          45 000 FCFA     │
│  Reliquat client      5 000 FCFA     │
│  Net à encaisser     40 000 FCFA     │
├──────────────────────────────────────┤
│  ○ Total   ● Partiel                 │
│  Montant [ 20 000 ]                  │
│  Chips: 10k · 20k · Net              │
├──────────────────────────────────────┤
│  Consent / confirmation (réutilise   │
│  pattern commercial si requis)       │
│                                      │
│  [ Confirmer la clôture ]            │
│  Mode: Envoi direct / Hors ligne     │
└──────────────────────────────────────┘
```

**Hybrid**

1. Connectivity UP → `POST /recovery-manager/close-credits` avec `reference` idempotente.
2. Succès → cache local `isSync=true`, maj remaining, toast succès.
3. DOWN / network → persist `rm_close_ops` `isSync=false`, maj UI optimiste, badge pending.
4. BUSINESS 4xx → message serveur ; pas de fallback silencieux ; option « Enregistrer hors ligne » (`forceOffline`).

**Validation :** `0 < amount ≤ remaining` (sauf cas soldé par reliquat déjà géré côté web — aligner même règle net).

---

### RM-04 — Contrôle carnet crédit

**Objectif :** comparer montant carnet vs système.

**Layout**

```
┌──────────────────────────────────────┐
│  Contrôle carnet                     │
│  CR-20441 · Aya Kone                 │
├──────────────────────────────────────┤
│  Système (payé)      180 000 FCFA    │
│  Carnet observé  [ ________ ]        │
│                                      │
│  Écart               + / −           │
│  Status chip CONFORME | ECART        │
│  Note (optionnelle)                  │
│  [ Capturer le contrôle ]            │
└──────────────────────────────────────┘
```

**Hybrid** → `POST /api/v1/credits/{id}/field-controls` (`reference`, `notebookTotalAmount`, `note?`, `observedAt?`).

V2 tontine : écran mois-par-mois (prévoir route `/rm/field-control/tontine/:memberId` inactive V1).

---

### RM-05 — Clients du pack

**Objectif :** consulter / corriger téléphone & géoloc.

**Liste**

- Search + filtre commercial / quarter.
- Carte : nom, phone, quarter (lecture), pin geo (oui/non), commercial.
- Tap → détail.

**Détail + édition (RM-05b)**

```
┌──────────────────────────────────────┐
│  Aya Kone                            │
│  Quarter Koumassi (lecture)          │
│  Commercial Kouassi                  │
├──────────────────────────────────────┤
│  Téléphone                           │
│  [ 07 XX XX XX XX ]                  │
├──────────────────────────────────────┤
│  Géolocalisation                     │
│  Lat / Lng affichés                  │
│  [ 📍 Mettre à jour ma position ]    │
│  Lien MLL (ouvrir Maps)              │
├──────────────────────────────────────┤
│  [ Enregistrer ]                     │
└──────────────────────────────────────┘
```

**Champs éditables :** `phone`, `latitude`, `longitude` ; `mll` dérivé côté client à la sauvegarde.  
**Non éditables V1 :** identité, pièce, `quarter`, collector, photos (sauf besoin ultérieur).

**Hybrid**

- Online → `PATCH .../recovery-manager/clients/{id}/contact` (ou composition location-update + phone — voir §4.5).
- Offline → client local dirty flags / `isSync=false` sur patch contact ; sync upload.

---

### RM-06 — Terrain (parcours)

**Objectif :** vue terrain par commercial puis par `quarter`.

- Accordion commercial → sections quarter → cards retards non traités.
- CTA « Naviguer » si `mll` / lat-lng présents (ouvre Maps).
- Compteur restants / faits.

---

### RM-07 — Plus / Sync / Rapport jour

- Toggle hybrid (hérite prefs globales si partagées).
- Auto-sync intervalle foreground.
- Bouton « Synchroniser maintenant » + détail file (closes, contrôles, contact patches).
- Bloc **À remettre** : liste commercials → montant (from report summary day).
- Lien modifier plan (online only).
- Déconnexion.

---

### RM-08 — États globaux / empty / erreur

| État | UI |
|------|-----|
| Empty retards | Illustration + « Aucun retard dans le périmètre » |
| Pack vide | Revoir plan |
| Conflit sync | Carte erreur rouge-pale, crédit, message API, dismiss / retry |
| Volume warning | Banner orange avant download |

---

## 4. Contrats API

Base auth : Bearer JWT, rôle `ROLE_RECOVERY_MANAGER` sauf endpoints déjà multi-rôles.

### 4.1 Plan du jour — **nouveau**

#### `POST /api/v1/recovery-manager/field-plans`

Crée ou remplace le plan du jour (1 ACTIVE / RM / date).

```json
{
  "planDate": "2026-08-11",
  "commercialUsernames": ["kouassi", "traore"],
  "quarters": ["KOUMASSI", "MARCORY"]
}
```

| Règle | Détail |
|-------|--------|
| `commercialUsernames` | size 1..3, usernames PROMOTER valides |
| `quarters` | optionnel ; match exact `Client.quarter` |
| Réponse | `FieldDayPlanDto` statut `ACTIVE` |

#### `GET /api/v1/recovery-manager/field-plans/today`

Plan ACTIVE du RM connecté pour `LocalDate.now()` (timezone app/serveur à documenter : Africa/Abidjan).

#### `PATCH /api/v1/recovery-manager/field-plans/{id}`

Update commercials/quarters — **uniquement si online** ; invalide pack mobile (client doit re-download).

#### `POST /api/v1/recovery-manager/field-plans/{id}/close`

Passe `CLOSED` (fin de journée optionnelle).

---

### 4.2 Offline pack — **nouveau**

#### `GET /api/v1/recovery-manager/field-plans/{id}/offline-pack`

Pack agrégé borné.

**Query optionnelle :** `includeTontine=false` (défaut V1).

**Réponse (shape) :**

```json
{
  "planId": 12,
  "planDate": "2026-08-11",
  "generatedAt": "2026-08-11T08:12:00Z",
  "stats": {
    "lateCredits": 71,
    "clients": 68,
    "estimatedBytes": 4200000
  },
  "commercials": [
    { "username": "kouassi", "displayName": "Kouassi Jean" }
  ],
  "lateCredits": [ /* CreditLateDto enrichi */ ],
  "clients": [ /* ClientRespDto subset */ ],
  "creditTimelines": [ /* historiques utiles */ ],
  "creditFieldControlsToday": [ /* anti-doublon */ ],
  "tontineMembers": [],
  "tontineFieldControlsToday": []
}
```

**Filtre serveur :**

```
credit.collector ∈ plan.commercials
AND credit is late (règle existante CreditLateService)
AND (plan.quarters empty OR client.quarter ∈ plan.quarters)
```

**Clients :** uniquement ceux liés aux crédits du pack (+ champs phone, lat, lng, mll, quarter, collector).

**V2 :** si `includeTontine=true`, peupler `tontineMembers` du même filtre collector/quarter.

---

### 4.3 Clôture — **existant à étendre (idempotence)**

#### `POST /api/v1/recovery-manager/close-credits`

```json
{
  "items": [
    {
      "creditId": 20441,
      "amount": 20000,
      "isPartial": true,
      "reference": "RMO-20260811-RMUSER-20441-01"
    }
  ]
}
```

| Champ | Notes |
|-------|--------|
| `reference` | **À ajouter** (obligatoire mobile) ; unique ; replay = no-op succès ou 409 métier |
| Comportement | inchangé : timeline + `RecoveryManagerOperation` + report commercial |

Erreurs métier stables (codes/messages) pour mobile : crédit non en retard, déjà clôturé jour, amount invalide, conflit concurrent commercial.

---

### 4.4 Contrôle carnet crédit — **existant**

#### `POST /api/v1/credits/{id}/field-controls`

```json
{
  "reference": "CFC-20260811-RMUSER-20441-01",
  "notebookTotalAmount": 180000,
  "observedAt": "2026-08-11T10:22:00",
  "note": "Écart page 4"
}
```

Rôles déjà : `RECOVERY_MANAGER`, `MANAGER`, `ADMIN`.  
Idempotence via `reference` déjà prévue.

#### `GET /api/v1/credits/{id}/field-controls/latest`

Pour préremplir / afficher dernier contrôle.

---

### 4.5 Contact client (phone + géoloc) — **nouveau dédié RM**

Évite le payload lourd `info-update` et complète `location-update` (qui ne set pas `mll` aujourd’hui).

#### `PATCH /api/v1/recovery-manager/clients/{id}/contact`

```json
{
  "phone": "0700000000",
  "latitude": 5.35995,
  "longitude": -4.00826,
  "mll": "https://www.google.com/maps/search/?api=1&query=5.35995,-4.00826",
  "reference": "RCC-20260811-RMUSER-991-01"
}
```

| Règle | Détail |
|-------|--------|
| Auth | `ROLE_RECOVERY_MANAGER` |
| Scope | Client doit appartenir au plan ACTIVE du jour (collector ∈ plan et quarter si filtré) — **sinon 403** |
| Partial | champs optionnels ; au moins un fourni |
| `mll` | si lat/lng fournis et mll omis → serveur génère le lien Maps |
| `reference` | idempotence sync offline |
| Effet | update `phone` (+ event phone si existant) ; update lat/lng/mll |

**Alternative transition :** composer `PATCH /clients/location-update` + endpoint phone — **déconseillé** ; préférer endpoint unique pour hybrid.

---

### 4.6 Collectors / late (réutilisation)

| Endpoint | Usage |
|----------|--------|
| `GET /api/v1/credits/late/collectors` | Étape plan (commerciaux) |
| `GET /api/v1/credits/late?collector=&locality=` | SWR online (locality = quarter name) |
| `GET /api/v1/recovery-manager/report/summary?startDate&endDate` | Bloc « à remettre » |
| `GET /api/v1/recovery-manager/operations?...` | Historique jour |

**Extension souhaitée :** `GET /credits/late?collectors=a,b,c&localities=q1,q2` multi-valeurs pour SWR dashboard sans re-download pack complet.

---

### 4.7 Tontine field control — **V2 (contrat figé)**

`POST /api/v1/tontines/members/{id}/field-controls` (existant) — UI + inclusion pack en V2 uniquement.

---

## 5. Contrats mobile locaux (SQLite / sync)

### 5.1 Tables / files dédiées RM

| Store | Contenu |
|-------|---------|
| `rm_field_plan` | Plan actif + commercials + quarters |
| `rm_close_ops` | Clôtures pending / synced (`reference`, payload, `isSync`) |
| `rm_field_controls` | Contrôles crédit pending |
| `rm_client_contact_patches` | Patches phone/geo pending |
| Réutilise | `clients`, `distributions`/`credits`, recoveries/timelines — **requêtes filtrées par scope plan** |

### 5.2 Ordre sync upload RM

1. `rm_client_contact_patches`
2. `rm_field_controls`
3. `rm_close_ops`

Chaque item : si `reference` déjà connue serveur → marquer sync OK.

### 5.3 Hybrid write adapters

| Adapter | Online API | Offline table |
|---------|------------|---------------|
| `RmCloseWriteAdapter` | `close-credits` | `rm_close_ops` |
| `RmFieldControlWriteAdapter` | credit field-controls | `rm_field_controls` |
| `RmClientContactWriteAdapter` | contact PATCH | `rm_client_contact_patches` |

Tous passent par `OnlineFirstWriteCoordinator` + `ConnectivityService` (TTL 120s).

---

## 6. Mapping écrans ↔ API

| Écran | Lecture | Écriture |
|-------|---------|----------|
| RM-01 Plan | collectors, (quarters dérivés) | `POST field-plans` + `GET offline-pack` |
| RM-02 Dashboard | pack local + SWR late multi | — |
| RM-03 Clôture | crédit local | hybrid close-credits |
| RM-04 Contrôle | crédit + latest control | hybrid field-controls |
| RM-05 Clients | clients pack | hybrid contact |
| RM-06 Terrain | même pack | navigation externe Maps |
| RM-07 Plus | report/summary, file sync | sync master RM, patch plan |

---

## 7. Permissions & sécurité

- Entrée mobile RM : retirer redirect SSO web ; garder web accessible pour reporting large.
- Toute query locale RM **doit** appliquer le scope plan (équivalent `commercial-filter` multi-IN).
- Contact PATCH : refus si client hors plan.
- Pas d’accès shell commercial (stock, nouvelle distribution, tontine collecte) pour ce profil.

---

## 8. Phases & critères d’acceptation UI

| Phase | Écrans | Done when |
|-------|--------|-----------|
| P0 | Shell + gate auth | RM ouvre tabs navy, plus de SSO forcé |
| P1 | RM-01 | Pack download ≤ 3 com, filtre quarter |
| P2 | RM-02 + RM-03 | Clôture online + offline + sync |
| P3 | RM-05 | Phone + lat/lng/mll hybrid |
| P4 | RM-04 | Contrôle crédit hybrid |
| P5 | RM-06 + RM-07 | Parcours + à remettre + harden |
| V2 | Contrôle tontine | Pack + UI mois |

**Critères design**

- [ ] Primary actions navy `#003366`
- [ ] Header immersif + KPI strip + cards radius 16
- [ ] Badge connectivité visible sur dashboard
- [ ] Empty / loading / offline states soignés
- [ ] Safe-area + tab bar non conflictuelle avec CTA flottants

---

## 9. Hors scope V1

- Édition `quarter` / identité / photos client
- Création client ou crédit
- Contrôle tontine (préparé seulement)
- Background sync OS
- Multi-jours de plan sans re-téléchargement

---

## 10. Références

- Web ops terrain : `.kiro/specs/recovery-manager-field-operations/`
- Hybrid commercial : `.cursor/plans/mobile_hybrid_sync_dad3be1e.plan.md`
- Palette frontend : `credit-late` / tokens `--navy: #003366`
- Entité client : `latitude`, `longitude`, `mll`, `quarter`, `phone`
