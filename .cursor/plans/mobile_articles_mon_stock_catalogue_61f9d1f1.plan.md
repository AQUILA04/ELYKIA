---
name: Mobile Articles Mon Stock / Catalogue
overview: "Ajouter un ion-segment Mon Stock | Catalogue sur la liste articles mobile. Mon Stock conserve la liste stock commercial actuelle (qty + prix). Catalogue liste tous les articles actifs avec prix crédit uniquement (sans quantité). Les deux listes restent hybrides (SWR + cache SQLite) avec infinite scroll. PLAN ONLY — attendre validation avant implémentation."
todos:
  - id: validate-plan
    content: "Validation utilisateur du plan (endpoint ENABLED, UX segment, périmètre catalogue)"
    status: pending
  - id: segment-ux
    content: "ion-segment Mon Stock | Catalogue dans article-list (+ SCSS elyk-segment)"
    status: pending
  - id: mon-stock-keep
    content: "Conserver parcours DistributionActions + commercial stock paginé pour Mon Stock"
    status: pending
  - id: catalogue-data
    content: "Source Catalogue = table articles + refresh API /articles/enabled (SWR + pagination)"
    status: pending
  - id: hybrid-swr
    content: "Étendre OnlineListRefreshService + effets NgRx pagination catalogue"
    status: pending
  - id: init-gap
    content: "Décider si initializeArticles passe de /articles à /articles/enabled (+ pagination >1000)"
    status: pending
  - id: tests-guide
    content: "Specs article-list + maj user-guide mobile_app + index RAG + bump version mobile"
    status: pending
isProject: false
---

# Plan — Articles mobile : Mon Stock / Catalogue

**Statut :** brouillon — **attendre validation utilisateur avant tout code feature**  
**Périmètre :** `mobile/` (écran Articles + services/repos/NgRx associés) ; éventuellement endpoint d’init articles  
**Hors périmètre (cette itération) :** magasinier / dashboard stock web ; sélecteur articles dans nouvelle distribution (sauf impact partagé non voulu)

---

## 1. Vérification initial-loading (finding principal)

**Oui : le chargement des articles catalogue est déjà séparé du stock commercial.**

Dans [`initial-loading.page.ts`](mobile/src/app/features/initial-loading/initial-loading.page.ts), les étapes pertinentes sont distinctes :

| Étape UI | Méthode | Rôle |
|---|---|---|
| « Chargement des articles... » | `dataInitService.initializeArticles()` | Catalogue référence → SQLite `articles` |
| « Sync du stock commercial... » | `dataInitService.initializeCommercialStock()` | Quantités du commercial → `commercial_stock_items` |
| « Calcul des stocks... » | `dataInitService.calculateArticleStocks()` | Recalcule `articles.stockQuantity` (sorties / logique locale) |

### 1.1 Ce que `initializeArticles` synchronise aujourd’hui

[`ArticleService.initializeArticles()`](mobile/src/app/core/services/article.service.ts) :

1. Ping backend
2. Si online : `GET ${apiUrl}/api/v1/articles?page=0&size=1000`
3. Force `stockQuantity: 0` sur chaque article avant `articleRepository.saveAll(...)`
4. Si offline / erreur API : retourne `[]` (pas de relecture locale dans cette méthode)

Côté backend, `GET /api/v1/articles` → [`ArticlesService.getAll(pageable)`](backend/src/main/java/com/optimize/elykia/core/service/store/ArticlesService.java) = **tous les articles sauf `DELETED`** (donc **ENABLED + DISABLED**), **pas** uniquement les actifs.

Endpoints déjà disponibles pour le catalogue actif :

- `GET /api/v1/articles/enabled` (pageable)
- `GET /api/v1/articles/enabled/all` (liste complète)
- Recherche : `elasticSearchEnabled`

Le DTO [`ArticleListItemDto`](backend/src/main/java/com/optimize/elykia/core/dto/ArticleListItemDto.java) expose bien `creditSalePrice`, `name`, `commercialName`, `marque`, `model`, `type`, `state`, etc.

### 1.2 Ce que le stock commercial synchronise

[`CommercialStockService.syncCommercialStock(username)`](mobile/src/app/core/services/commercial-stock.service.ts) :

- `GET /api/commercial-stocks/available/{username}`
- Persist dans `commercial_stock_items` + snapshot valeur stock
- **Indépendant** du seed catalogue (mais la liste « disponibles » joint ensuite `articles`)

### 1.3 Écarts / gaps sur l’init actuelle

1. **Pas filtré « actifs only »** : init utilise `/articles` (non-DELETED) au lieu de `/articles/enabled`.
2. **Plafond `size=1000`** : catalogue > 1000 articles → sync incomplète.
3. **Offline init** : si hors ligne au démarrage, `skipInitializationForOfflineMode` s’appuie sur le cache SQLite déjà présent (pas de re-fetch).
4. La table locale `articles` **n’a pas de colonne `state`/`status`** : une fois syncés, articles désactivés ne sont pas distinguables côté mobile sans évolution schéma ou purge.

**Conclusion finding :** le seed catalogue existe déjà et est séparé du stock. Pour un onglet « Catalogue = articles actifs », il faudra **aligner** l’endpoint d’init (et/ou le refresh SWR) sur `/enabled`, et idéalement paginer au-delà de 1000.

---

## 2. Comportement actuel de l’écran Articles

Fichiers : [`article-list.page.ts`](mobile/src/app/features/articles/pages/article-list/article-list.page.ts) / [`.html`](mobile/src/app/features/articles/pages/article-list/article-list.page.html)

- Entrée menu : **Plus → Articles** (`/tabs/article-list`)
- Données : NgRx `DistributionActions.loadFirstPageAvailableArticles` / `loadNextPageAvailableArticles`
- Selectors : `selectAvailableArticles`, pagination loading / hasMore
- Source locale : [`CommercialStockRepository.findAvailableArticlesPaginated`](mobile/src/app/core/repositories/commercial-stock.repository.ts) — `quantityRemaining > 0`, jointure `articles`, `stockQuantity` = qty restante
- Affichage carte : nom, type · marque, **Stock disponible: N unités**, **prix crédit**
- Infinite scroll déjà en place
- Hybrid SWR déjà branché dans [`distribution.effects.ts`](mobile/src/app/store/distribution/distribution.effects.ts) via [`OnlineListRefreshService.refreshCommercialStockPage`](mobile/src/app/core/services/online-list-refresh.service.ts) (local first → refresh serveur stock → re-query locale)

**Point clé :** l’écran « Articles » affiche aujourd’hui **Mon Stock** (stock commercial > 0), **pas** le catalogue complet déjà seedé en SQLite.

Le store NgRx `article` (`loadArticles` → `articleService.getArticles()` = `findAll`) charge tout le catalogue en mémoire **sans pagination** — inadapté pour l’UI liste Catalogue.

---

## 3. UX proposée

Réutiliser le pattern `ion-segment` + `elyk-segment` (ex. [`sync-manual.page.html`](mobile/src/app/features/sync/sync-manual/sync-manual.page.html), [`client-detail.page.html`](mobile/src/app/features/clients/pages/client-detail/client-detail.page.html)).

```
[hero] Articles
[searchbar]  (partagée ou reset au switch — à valider)
[ion-segment]
  Mon Stock  |  Catalogue
[liste + ion-infinite-scroll]
```

### Mon Stock (défaut)

- Comportement **inchangé** : qty + prix crédit (prix unitaire stock si déjà appliqué via `stockUnitPrice`)
- Empty state : « Aucun article en stock »

### Catalogue

- Liste **tous les articles actifs** (cible produit)
- Afficher : nom commercial / name, type · marque, **uniquement `creditSalePrice`**
- **Ne pas** afficher de quantité / « Stock disponible »
- Empty state : « Aucun article dans le catalogue »
- Même infinite scroll (threshold / spinner alignés app)

Switch segment :

- Reset page 0 + éventuellement terme de recherche
- États pagination **séparés** (évite mélange Mon Stock / Catalogue dans le reducer distribution)

---

## 4. Sources de données & patterns à réutiliser

### 4.1 Mon Stock

| Couche | Réutiliser |
|---|---|
| UI | Liste + infinite scroll actuels |
| NgRx | `loadFirst/NextPageAvailableArticles` + selectors distribution |
| Local | `commercialStockRepository.findAvailableArticlesPaginated` |
| SWR | `OnlineListRefreshService.refreshCommercialStockPage` |

Pas de changement métier attendu hors encapsulation sous le segment.

### 4.2 Catalogue (à ajouter)

| Couche | Proposition |
|---|---|
| Local first | `ArticleRepository.searchArticles(query, page, size)` (existe déjà) — étendre si besoin (tri, empty query = page complète) |
| SWR online | Nouveau `OnlineListRefreshService.refreshArticlesCataloguePage(page, size, filters)` |
| API | `GET /api/v1/articles/enabled?page=&size=` (+ search enabled si dispo) |
| Upsert | `articleRepository.saveAll` **sans écraser** les `stockQuantity` locales utiles à d’autres flux — attention : `saveAll` écrit déjà `stockQuantity` ; pour le catalogue, mapper avec qty 0 **seulement à l’insert**, ou préserver qty existante à l’update (gap à traiter à l’implémentation) |
| NgRx | Soit slice dédié `catalogueArticlesPagination` dans `article` store, soit état local au composant + service — **préférence** : étendre `article` store (symétrie clients/localities) plutôt que surcharger `distribution` |

Pattern SWR de référence (déjà en prod mobile) :

1. Afficher page locale immédiatement
2. Si hybrid sync ON + backend joignable → fetch page serveur → upsert SQLite → re-émettre succès first page
3. `loadNext` : local next page + refresh best-effort en background (comme commercial stock / clients)

Références : [`mobile_hybrid_sync_dad3be1e.plan.md`](.cursor/plans/mobile_hybrid_sync_dad3be1e.plan.md), effets client / locality / distribution.

### 4.3 Init (option recommandée, même lot ou suivi immédiat)

- Remplacer `GET /api/v1/articles?page=0&size=1000` par boucle sur `/api/v1/articles/enabled` (pages) **ou** `/enabled/all` si volume acceptable
- Documenter le choix dans le commit d’implémentation

---

## 5. Impacts transverses

| Domaine | Impact |
|---|---|
| Version mobile | Bump **mineur** (nouvelle UX écran) — skill `mobile-version-bump` |
| User-guide | Maj [`user-guide/docs/commercial/mobile_app.md`](user-guide/docs/commercial/mobile_app.md) (Plus → Articles : Mon Stock / Catalogue) + régénérer index RAG |
| CHANGELOG | Entrée keep-changelog |
| Backend | Aucune migration obligatoire si on consomme `/enabled` existant |
| Magasinier / RM | Hors scope ; RM skip déjà l’init commerciale |

---

## 6. Risques

1. **Écrasement `stockQuantity`** lors d’un upsert catalogue (init force déjà 0 ; refresh commercial stock aussi mappe qty 0 sur `articles` puis s’appuie sur `commercial_stock_items` pour l’UI stock — rester cohérent).
2. **Articles DISABLED** déjà en cache local : sans filtre `state`, le Catalogue offline pourrait les afficher tant que l’init n’a pas basculé sur `/enabled` + stratégie de purge.
3. **Pagination init 1000** : risque de catalogue incomplet offline.
4. **Deux paginations** dans le même écran : fuite d’état si un seul reducer `articlesPagination` de distribution est réutilisé sans isolation.
5. **Prix Mon Stock** : aujourd’hui peut différer du prix catalogue (`stockUnitPrice` vs `creditSalePrice`) — volontaire pour Mon Stock ; Catalogue = prix catalogue uniquement.

---

## 7. Questions ouvertes (bloquantes validation)

1. **« Actifs » = `State.ENABLED` uniquement ?** (recommandé : oui → `/articles/enabled`)
2. **Faut-il corriger `initializeArticles` dans le même lot** (passer à `/enabled` + pagination) ou seulement le refresh SWR Catalogue ?
3. **Recherche** : une barre partagée qui filtre le segment actif, ou deux comportements ?
4. **Catalogue hors ligne** : afficher tout le cache `articles`, ou seulement ceux encore présents après dernière sync enabled ?
5. **Faut-il masquer Mon Stock** si l’utilisateur n’a aucun stock (segment Catalogue seul) — ou toujours les deux onglets ?
6. **Titre hero** : rester « Articles » ou devenir dynamique (« Mon Stock » / « Catalogue ») ?

---

## 8. Plan d’implémentation (après validation — ne pas démarrer maintenant)

1. Confirmer les réponses §7
2. Segment UX + empty states + SCSS
3. Isoler pagination Catalogue (actions/effects/selectors)
4. `refreshArticlesCataloguePage` + éventuel fix `saveAll` préservation qty
5. Option : aligner `initializeArticles` sur `/enabled` paginé
6. Tests unitaires page + service refresh
7. User-guide + RAG index + CHANGELOG + bump version
8. Tests manuels : online SWR, offline cache, infinite scroll, switch segment, recherche

---

## 9. Critères d’acceptation (cible post-validation)

- [ ] Segment **Mon Stock** | **Catalogue** visible sur `/tabs/article-list`
- [ ] Mon Stock = liste actuelle (qty + prix), infinite scroll + SWR stock
- [ ] Catalogue = articles actifs, **prix crédit seul**, **sans quantité**, infinite scroll + SWR
- [ ] Hors ligne : chaque onglet lit son cache local
- [ ] Online : refresh serveur sans bloquer l’affichage local initial
- [ ] Guide utilisateur + index RAG à jour
- [ ] Version mobile alignée (3 fichiers)

---

## 10. Livrables de cette tâche (plan only)

- Plan Cursor : `.cursor/plans/mobile_articles_mon_stock_catalogue_61f9d1f1.plan.md`
- Copie store : `/cursor/stores/bc-fbdc0dac-2b34-4a43-a4bd-57c4441d9067/docs/mobile-articles-mon-stock-catalogue-plan.md`
- **Aucun code feature** tant que l’utilisateur n’a pas validé
