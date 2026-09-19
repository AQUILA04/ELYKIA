---
name: Mobile Articles Mon Stock / Catalogue
overview: "VALIDATED — ion-segment Mon Stock | Catalogue sur la liste articles mobile. Mon Stock = stock commercial actuel (qty + prix). Catalogue = articles filtrés par state (actifs à l’affichage), prix crédit seul, sans quantité. Init API inchangée (garder DISABLED syncés pour refs distribution). Hybride SWR + infinite scroll. Implémentation sur un autre agent."
todos:
  - id: validate-plan
    content: "Validation utilisateur — décisions §7 figées"
    status: completed
  - id: segment-ux
    content: "ion-segment Mon Stock | Catalogue ; titre hero Articles ; empty states toujours visibles"
    status: pending
  - id: mon-stock-keep
    content: "Conserver parcours DistributionActions + commercial stock paginé pour Mon Stock"
    status: pending
  - id: catalogue-state
    content: "Persister state (ENABLED/DISABLED) en local ; Catalogue filtre ENABLED ; DISABLED restant syncés pour refs distribution"
    status: pending
  - id: catalogue-data
    content: "Catalogue local = articles WHERE state=ENABLED (+ search) ; SWR upsert nouveaux + retirer DELETED de l’affichage catalogue"
    status: pending
  - id: hybrid-swr
    content: "Étendre OnlineListRefreshService + effets NgRx pagination catalogue (init API inchangée)"
    status: pending
  - id: shared-search
    content: "Une searchbar partagée filtre le segment actif uniquement"
    status: pending
  - id: tests-guide
    content: "Specs article-list + maj user-guide mobile_app + index RAG + bump version mobile"
    status: pending
isProject: false
---

# Plan — Articles mobile : Mon Stock / Catalogue

**Statut :** VALIDATED (2026-09-19) — décisions utilisateur figées ci-dessous  
**Périmètre :** `mobile/` (écran Articles + services/repos/NgRx associés ; colonne `state` locale si absente)  
**Hors périmètre :** changer l’endpoint d’init vers `/articles/enabled` ; magasinier / dashboard stock web ; sélecteur articles nouvelle distribution (sauf lecture refs DISABLED déjà syncées)  
**Implémentation :** autre agent — ce document est la spec validée

---

## Décisions utilisateur (figées)

| # | Décision |
|---|---|
| 1 | **Garder** l’API/endpoint d’init actuel (`GET /api/v1/articles`). **Ajouter** le champ `state` en local pour filtrer le Catalogue. **Conserver** les articles DISABLED syncés (références distributions / historique). |
| 2 | **Pas** de bascule init vers `/articles/enabled`. |
| 3 | **Une** searchbar partagée ; elle filtre **uniquement le segment actif**. |
| 4 | **Offline :** afficher le cache catalogue complet (filtré ENABLED pour l’onglet Catalogue). **Online :** sync des nouveaux + **retirer les DELETED** de l’affichage catalogue. |
| 5 | **Toujours** les deux onglets Mon Stock \| Catalogue + empty states dédiés. |
| 6 | Titre hero reste **Articles** ; segments **Mon Stock \| Catalogue**. |

---

## 1. Vérification initial-loading (finding — inchangé)

**Oui : le chargement des articles catalogue est déjà séparé du stock commercial.**

Dans [`initial-loading.page.ts`](mobile/src/app/features/initial-loading/initial-loading.page.ts) :

| Étape UI | Méthode | Rôle |
|---|---|---|
| « Chargement des articles... » | `dataInitService.initializeArticles()` | Catalogue référence → SQLite `articles` |
| « Sync du stock commercial... » | `dataInitService.initializeCommercialStock()` | Quantités du commercial → `commercial_stock_items` |
| « Calcul des stocks... » | `dataInitService.calculateArticleStocks()` | Recalcule `articles.stockQuantity` |

### 1.1 Init articles (à conserver telle quelle côté endpoint)

[`ArticleService.initializeArticles()`](mobile/src/app/core/services/article.service.ts) :

1. Ping backend
2. Online : `GET ${apiUrl}/api/v1/articles?page=0&size=1000`
3. Force `stockQuantity: 0` puis `articleRepository.saveAll(...)`
4. Offline / erreur API : `[]`

Backend : `GET /api/v1/articles` → non-DELETED (**ENABLED + DISABLED**).  
**Décision :** ne pas basculer vers `/enabled` — les DISABLED restent nécessaires pour les refs distribution.

**Évolution requise à l’implémentation (sans changer l’URL) :**

- Persister `state` (depuis `ArticleListItemDto.state` / `status`) dans SQLite `articles`
- À l’upsert init / SWR : écrire `state` ; ne pas purge les DISABLED du cache
- Catalogue UI : `WHERE state = 'ENABLED'` (ou équivalent)
- Articles passés DELETED côté serveur : ne plus les afficher dans Catalogue (retirer / marquer après sync online)

### 1.2 Stock commercial (inchangé)

[`CommercialStockService.syncCommercialStock`](mobile/src/app/core/services/commercial-stock.service.ts) → `/api/commercial-stocks/available/{username}` — indépendant du seed catalogue.

### 1.3 Gaps restants (non bloquants pour la validation)

1. Plafond init `size=1000` (hors décision ; à traiter si volume réel le justifie, sans changer vers `/enabled`).
2. Table locale sans `state` aujourd’hui → **à ajouter** (décision 1).
3. Offline init skip → cache SQLite existant.

---

## 2. Comportement actuel de l’écran Articles

Fichiers : [`article-list.page.ts`](mobile/src/app/features/articles/pages/article-list/article-list.page.ts) / [`.html`](mobile/src/app/features/articles/pages/article-list/article-list.page.html)

- Plus → Articles (`/tabs/article-list`)
- NgRx distribution : `loadFirst/NextPageAvailableArticles` = stock commercial `quantityRemaining > 0`
- Affiche qty + prix ; infinite scroll + SWR `refreshCommercialStockPage`
- **Pas** encore de segment ni de vue catalogue

---

## 3. UX validée

```
[hero] Articles          ← titre fixe
[searchbar]              ← partagée ; filtre le segment actif
[ion-segment elyk-segment]
  Mon Stock  |  Catalogue
[liste + ion-infinite-scroll]
[empty states par segment]
```

### Mon Stock (défaut)

- Liste actuelle inchangée : qty + prix (unit price stock si déjà appliqué)
- Empty : « Aucun article en stock »
- Onglet **toujours** visible même si vide

### Catalogue

- Articles **ENABLED** uniquement à l’affichage (DISABLED restent en DB pour refs)
- Afficher : nom / commercialName, type · marque, **`creditSalePrice` seul**
- **Pas** de quantité
- Empty : « Aucun article dans le catalogue »
- Onglet **toujours** visible

### Search & switch

- Searchbar unique → filtre le segment courant
- Switch segment : reset page 0 ; **conserver** le terme de recherche et l’appliquer au nouvel onglet (comportement naturel d’une barre partagée)
- Paginations NgRx **séparées** Mon Stock / Catalogue

---

## 4. Sources de données & patterns

### 4.1 Mon Stock

Réutiliser tel quel : DistributionActions + `commercialStockRepository.findAvailableArticlesPaginated` + `refreshCommercialStockPage`.

### 4.2 Catalogue

| Couche | Spec validée |
|---|---|
| Local first | `ArticleRepository` paginé + search, filtre `state = ENABLED` |
| Offline | Cache local complet (ENABLED pour l’UI) ; DISABLED non listés mais toujours en SQLite |
| SWR online | `OnlineListRefreshService.refreshArticlesCataloguePage` — upsert nouveaux / maj ; **drop DELETED** de l’affichage catalogue (soft-delete local ou exclusion par `state`) |
| API refresh | Même famille que l’init : `GET /api/v1/articles` (pageable / search), **pas** `/enabled` pour rester aligné décision 1–2. Option : consommer `state` du DTO pour filtrer côté client après upsert |
| Upsert | Préserver `stockQuantity` existante à l’update ; écrire `state` ; ne pas supprimer les DISABLED du cache |
| NgRx | Slice pagination catalogue dédié (préféré dans store `article`) |

Pattern SWR (réf. hybrid sync mobile) :

1. Page locale immédiate  
2. Si hybrid ON + backend UP → fetch → upsert → re-émettre  
3. `loadNext` : local + refresh best-effort  

### 4.3 Init

- **Endpoint inchangé** : `/api/v1/articles?page=0&size=1000`
- **Ajouter** mapping + persist de `state` lors du seed
- Pas de migration vers `/articles/enabled`

---

## 5. Impacts transverses

| Domaine | Impact |
|---|---|
| SQLite / modèle | Colonne `state` (ou équivalent) sur `articles` + migration schema mobile |
| Version mobile | Bump **mineur** — skill `mobile-version-bump` |
| User-guide | [`mobile_app.md`](user-guide/docs/commercial/mobile_app.md) : Plus → Articles, Mon Stock / Catalogue + index RAG |
| CHANGELOG | keep-changelog |
| Backend | Aucune nouvelle API obligatoire |
| RM / magasinier | Hors scope |

---

## 6. Risques (mis à jour)

1. **Écrasement `stockQuantity`** à l’upsert catalogue — préserver qty à l’update.
2. **Articles DISABLED** : doivent rester en cache mais **hors** liste Catalogue ; les jointures distribution / historique doivent continuer à résoudre le nom via `findByIds`.
3. **DELETED online** : définir purge ou `state=DELETED` + filtre affichage ; ne pas casser les lignes d’historique qui référencent l’id.
4. **Pagination init 1000** toujours un risque volume.
5. **Deux paginations** : isoler les reducers.
6. **Prix Mon Stock** vs catalogue : écart `stockUnitPrice` / `creditSalePrice` volontaire.

---

## 7. Questions ouvertes — RÉSOLUES

1. ~~Actifs = ENABLED ?~~ → **Oui pour l’affichage Catalogue** ; sync garde ENABLED+DISABLED via init actuelle ; filtre local par `state`.
2. ~~Corriger init vers `/enabled` ?~~ → **Non.**
3. ~~Recherche ?~~ → **Partagée, filtre le segment actif.**
4. ~~Catalogue offline ?~~ → **Cache complet (ENABLED à l’UI)** ; online : sync nouveaux + drop DELETED de l’affichage.
5. ~~Masquer Mon Stock si vide ?~~ → **Non — toujours les deux onglets + empty states.**
6. ~~Titre hero ?~~ → **Reste « Articles ».**

---

## 8. Plan d’implémentation (autre agent)

1. Migration SQLite + modèle : `state` sur `articles` ; maj `saveAll` / mapping DTO
2. Segment UX + empty states + search partagée (titre Articles fixe)
3. Isoler pagination Catalogue (actions/effects/selectors)
4. `refreshArticlesCataloguePage` : upsert + exclusion DELETED affichage ; préserver qty ; écrire `state`
5. Init : même URL, persister `state` (pas `/enabled`)
6. Tests unitaires + manuels (online/offline, DISABLED non listés mais résolvables, infinite scroll, switch + search)
7. User-guide + RAG + CHANGELOG + bump version

---

## 9. Critères d’acceptation

- [ ] Segment **Mon Stock \| Catalogue** ; hero **Articles**
- [ ] Mon Stock = liste actuelle (qty + prix), infinite scroll + SWR stock
- [ ] Catalogue = ENABLED only à l’UI, prix crédit seul, sans qty, infinite scroll + SWR
- [ ] DISABLED syncés / conservés en local pour refs distribution ; absents du Catalogue
- [ ] Search partagée filtre le segment actif
- [ ] Offline : cache local ; Online : nouveaux syncés, DELETED retirés de l’affichage catalogue
- [ ] Les deux onglets toujours présents + empty states
- [ ] Init endpoint **inchangé** (`/api/v1/articles`)
- [ ] Guide + index RAG + version mobile alignée

---

## 10. Livrables docs

- Plan Cursor : `.cursor/plans/mobile_articles_mon_stock_catalogue_61f9d1f1.plan.md` (**VALIDATED**)
- Store : `/cursor/stores/bc-fbdc0dac-2b34-4a43-a4bd-57c4441d9067/docs/mobile-articles-mon-stock-catalogue-plan.md`
- PR plan (docs) : https://github.com/AQUILA04/ELYKIA/pull/109
