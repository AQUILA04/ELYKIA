---
name: Mobile Articles Mon Stock / Catalogue
overview: "Ajouter un ion-segment Mon Stock | Catalogue sur la liste articles mobile. Mon Stock conserve la liste stock commercial actuelle (qty + prix). Catalogue liste les articles ENABLED (filtre state local) avec prix crédit uniquement (sans quantité). Les deux listes restent hybrides (SWR + cache SQLite) avec infinite scroll. Init /articles inchangé — colonne state ajoutée pour filtrer."
todos:
  - id: validate-plan
    content: "Validation utilisateur du plan (endpoint ENABLED, UX segment, périmètre catalogue)"
    status: completed
  - id: segment-ux
    content: "ion-segment Mon Stock | Catalogue dans article-list (+ SCSS elyk-segment)"
    status: completed
  - id: mon-stock-keep
    content: "Conserver parcours DistributionActions + commercial stock paginé pour Mon Stock"
    status: completed
  - id: catalogue-data
    content: "Source Catalogue = table articles filtrée state=ENABLED + refresh API /articles/enabled (SWR + pagination)"
    status: completed
  - id: hybrid-swr
    content: "Étendre OnlineListRefreshService + effets NgRx pagination catalogue"
    status: completed
  - id: init-gap
    content: "NE PAS changer initializeArticles (/articles). Ajouter colonne state locale + sync state depuis le DTO existant"
    status: completed
  - id: tests-guide
    content: "Specs article-list + maj user-guide mobile_app + index RAG + bump version mobile"
    status: completed
isProject: false
---

# Plan — Articles mobile : Mon Stock / Catalogue

**Statut :** VALIDÉ — implémenté (feature PR)  
**Périmètre :** `mobile/` (écran Articles + services/repos/NgRx associés) ; colonne `state` SQLite ; pas de changement d’endpoint d’init  
**Hors périmètre (cette itération) :** magasinier / dashboard stock web ; sélecteur articles dans nouvelle distribution (sauf impact partagé non voulu)

---

## Décisions validées (utilisateur)

1. **Ne pas changer l’init / API d’init** — garder `GET /api/v1/articles` tel quel. Ajouter uniquement une **colonne / champ `state`** pour que le Catalogue puisse filtrer. L’app **doit continuer à synchroniser les articles désactivés** (les distributions les référencent avant désactivation — article manquant = bug). Le Catalogue filtre par `state` ; les DISABLED restent en DB pour référence.
2. Pas de bascule init vers `/articles/enabled` (conséquence de 1).
3. **Barre de recherche partagée** : filtre uniquement le **segment actif**.
4. Hybride : **offline** = cache local complet ; **online** = refresh serveur — upsert des nouveaux articles ; les articles retirés/supprimés côté serveur ne doivent plus apparaître dans le Catalogue (réconciliation state via refresh enabled).
5. **Toujours afficher les deux onglets**, avec empty states si listes vides.
6. Titre de page inchangé : **« Articles »** ; `ion-segment` = **Mon Stock** | **Catalogue**.

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
2. Si online : `GET ${apiUrl}/api/v1/articles?page=0&size=1000` (**inchangé** après validation)
3. Persist via `articleRepository.saveAll(...)` en forçant `stockQuantity: 0` à l’insert / update métier stock, **en mappant désormais `state`/`status` du DTO**
4. Si offline / erreur API : retourne `[]` (cache SQLite déjà présent)

Côté backend, `GET /api/v1/articles` → **tous les articles sauf `DELETED`** (ENABLED + DISABLED).

Endpoints catalogue actif (utilisés par le **refresh SWR Catalogue**, pas par l’init) :

- `GET /api/v1/articles/enabled` (pageable)
- `GET /api/v1/articles/enabled/all`
- Recherche : `elasticSearchEnabled`

### 1.2 Écarts traités sans changer l’init

1. Colonne locale `articles.state` + migration SQLite (filtre Catalogue = `ENABLED`).
2. Refresh online Catalogue via `/articles/enabled` (+ reconcile pour retirer du Catalogue les articles plus ENABLED / absents).
3. Plafond init `size=1000` : **hors scope** de ce lot (décision : ne pas toucher l’init).

---

## 2. UX

```
[hero] Articles
[searchbar]  partagée → filtre le segment actif
[ion-segment]
  Mon Stock  |  Catalogue
[liste + ion-infinite-scroll]
```

### Mon Stock (défaut)

- Comportement **inchangé** : qty + prix crédit
- Empty state : « Aucun article en stock »

### Catalogue

- Articles locaux avec `state = ENABLED`
- Afficher : nom, type · marque, **uniquement `creditSalePrice`** (pas de quantité)
- Empty state : « Aucun article dans le catalogue »

---

## 3. Implémentation (post-validation)

1. Migration v32 : `articles.state TEXT` (défaut `ENABLED` pour lignes existantes)
2. Segment UX + empty states + SCSS
3. Pagination Catalogue dans le store `article` (actions/effects/selectors)
4. `refreshArticlesCataloguePage` + `searchCatalogueArticles` + reconcile states
5. Init : mapper `state` depuis le DTO, **sans changer l’URL**
6. Tests + user-guide + RAG + CHANGELOG + bump version mineur

---

## 4. Critères d’acceptation

- [x] Segment **Mon Stock** | **Catalogue** sur `/tabs/article-list`
- [x] Mon Stock = liste actuelle (qty + prix), infinite scroll + SWR stock
- [x] Catalogue = articles ENABLED, prix crédit seul, sans quantité, infinite scroll + SWR
- [x] Init toujours sur `/articles` (DISABLED syncés)
- [x] Hors ligne : chaque onglet lit son cache local
- [x] Online : refresh serveur sans bloquer l’affichage local initial
- [x] Guide utilisateur + index RAG à jour
- [x] Version mobile alignée (3 fichiers)
