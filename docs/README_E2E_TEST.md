# Tests E2E — ELYKIA (Web Admin)

Documentation des tests end-to-end Playwright pour l'interface web d'administration ELYKIA.

## Objectif

Valider automatiquement les parcours métier critiques de l'application web (Angular) contre l'API backend (Spring Boot), sans intervention manuelle.

Les tests couvrent :

- **Smoke** : connexion, navigation, garde d'authentification.
- **Golden path** : enchaînement séquentiel de 31 étapes sur le flux métier complet (stock → crédit → tontine → rattrapage).

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Runner | [Playwright](https://playwright.dev/) `@playwright/test` |
| Cible | Frontend Angular (`http://localhost:4200`) |
| API | Backend Spring Boot (`http://localhost:8081`) |
| Workers | 1 (séquentiel — état partagé entre étapes) |
| Sélecteurs | `data-testid` sur les écrans clés |

## Structure des fichiers

```
frontend/
├── playwright.config.ts          # Configuration Playwright
├── e2e/
│   ├── specs/
│   │   ├── smoke/
│   │   │   ├── login.spec.ts           # Auth ges003 / mag001
│   │   │   └── navigation.spec.ts      # Sidebar, routes protégées
│   │   └── golden-path.spec.ts         # 31 étapes séquentielles
│   └── fixtures/
│       ├── auth.ts                     # loginAs*, logout
│       ├── api-client.ts               # Client HTTP (seed, vérifications API)
│       ├── test-data.ts                # Comptes, constantes, labels uniques
│       ├── ui-helpers.ts                 # ng-select, SweetAlert, autocomplete
│       ├── credit-helpers.ts
│       ├── stock-request-helpers.ts
│       ├── stock-return-helpers.ts
│       ├── stock-tontine-helpers.ts
│       ├── tontine-helpers.ts
│       └── rattrapage-helpers.ts
```

## Comptes de test

Comptes initialisés par le backend (`application.yml`, profil `prod`) :

| Rôle | Username | Mot de passe par défaut | Usage golden path |
|------|----------|-------------------------|-------------------|
| Gestionnaire | `ges003` | `Abcd1234` | Validation stock, tontine, rapports |
| Magasinier | `mag001` | `Maga1234` ou `Abcd1234` | Livraison sorties stock |
| Commercial terrain | `COM020` | `ChangeMe020` | Ventes, collectes, livraison tontine, rattrapage |
| Commercial agence | `COM001` | (voir config) | Ventes comptant (`CSH-`) |

Les mots de passe sont résolus automatiquement (`resolveCredentials`) avec repli sur plusieurs candidats. Surcharge possible via variables d'environnement :

```bash
E2E_GES003_PASSWORD=...
E2E_MAG001_PASSWORD=...
E2E_COMM001_PASSWORD=...
E2E_COMMERCIAL_PASSWORD=...
E2E_AGENCY_COMMERCIAL_USERNAME=COM001
```

## Golden path — 31 étapes

Parcours séquentiel (`test.describe.serial`) : chaque étape dépend des précédentes.

| Phase | Étapes | Description |
|-------|--------|-------------|
| 0–2 | 0–2 | Connexion, localité, client E2E |
| Stock commercial | 3–6 | Demande sortie → validation ges003 → livraison mag001 → stock mensuel |
| Crédit | 7–11 | Vente crédit, mise, recouvrement, rapport journalier, versement caisse |
| Retour / comptant | 12–16 | Retour stock, vente comptant (COM001), KPI rapport agence |
| Tontine | 17–27 | Membre, collecte COM020, stock tontine, clôture session, livraison, KPIs |
| Rattrapage | 28–30 | Seed stock résiduel API, distribution RAT-, vérification stock |

### Règles métier importantes

- **Ventes comptant** : attribuées au commercial agence `COM001` (`AGENCY_COLLECTOR`), pas au commercial terrain du client.
- **Collecte tontine** : enregistrée par le commercial connecté (`COM020`).
- **Livraison tontine** : préparée par le gestionnaire ; **marquée livrée** par le commercial ou le gestionnaire (pas le magasinier).
- **Rattrapage crédit** : client dédié sans crédit `INPROGRESS` (le client principal a déjà un crédit ouvert) ; mise journalière ≥ montant article (souvent 200 FCFA).
- **Session tontine** : réouverte en `beforeAll` via `POST /api/v1/tontines/sessions/current/reopen` si une exécution précédente l'a clôturée.

### Endpoints API E2E dédiés

| Endpoint | Rôle |
|----------|------|
| `POST /api/v1/tontines/sessions/current/reopen` | Réouvrir la session tontine entre deux runs |
| `POST /api/v1/tontines/sessions/current/close` | Clôturer la session (prérequis livraison) |
| `POST /api/v1/commercial-stock/e2e/seed-residual` | Préparer stock résiduel mois N-1 (rattrapage) |

## Commandes locales

### Prérequis

1. **PostgreSQL** accessible (profil `prod` : base `oec`, user `oec`, port `5432`).
2. **Backend** démarré sur le port **8081** :

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

3. **Articles de référence** : sur un environnement vierge (base fraîche, Flyway désactivé en prod), l'API `/api/v1/articles/enabled` ne retourne rien tant que le catalogue n'est pas peuplé. Exécuter **après le premier démarrage du backend** (schéma Hibernate créé) :

```bash
# Linux / macOS / Git Bash
.github/scripts/seed-e2e-articles.sh

# Ou directement avec psql
PGPASSWORD=APP2024 psql -h localhost -U oec -d oec \
  -f backend/src/main/resources/db/migration/V14__insert_articles.sql
```

Le script est idempotent (`ON CONFLICT DO NOTHING`). En CI, il est lancé automatiquement après le démarrage du backend.

4. **Frontend** : Playwright peut le démarrer automatiquement (`ng serve` port 4200). Pour réutiliser un serveur déjà lancé :

```bash
cd frontend
npm install --legacy-peer-deps
npx playwright install chromium
```

### Exécution

```bash
cd frontend

# Tous les tests E2E
npm run test:e2e

# Smoke uniquement (~30 s)
npm run test:e2e:smoke

# Golden path complet (~3 min, 31 étapes)
npm run test:e2e:golden

# Interface graphique Playwright
npm run test:e2e:ui
```

### Variables d'environnement utiles

| Variable | Défaut | Description |
|----------|--------|-------------|
| `E2E_API_URL` | `http://localhost:8081` | URL du backend |
| `E2E_BASE_URL` | `http://localhost:4200` | URL du frontend |
| `E2E_SKIP_WEB_SERVER` | (non défini) | `1` = ne pas démarrer `ng serve` (frontend déjà up) |

Exemple avec frontend déjà démarré :

```bash
cd frontend
$env:E2E_SKIP_WEB_SERVER="1"   # PowerShell
npm run test:e2e:golden
```

## `data-testid` ajoutés

Convention : préfixe `e2e-` sur les éléments interactifs des parcours testés.

Exemples :

- Auth : `e2e-login-form`, `e2e-app-shell`
- Sidebar : `e2e-sidebar-stock-commercial`, `e2e-sidebar-tontines`
- Stock : `e2e-stock-request-row`, `e2e-my-stock-agent-select`
- Crédit : `e2e-credit-submit`, `e2e-credit-row`
- Tontine : `e2e-tontine-add-member-btn`, `e2e-tontine-mark-delivered-btn`
- Rattrapage : `e2e-rattrapage-page`, `e2e-rattrapage-submit`

Voir les templates HTML du frontend pour la liste complète (`grep -r "data-testid=\"e2e-" frontend/src`).

## CI/CD — GitHub Actions

Workflow : [`.github/workflows/e2e.yml`](../.github/workflows/e2e.yml) — **ELYKIA QA — E2E Web**

| Propriété | Valeur |
|-----------|--------|
| Déclencheur | `workflow_run` après succès du **CD Pipeline** (déploiement TEST sur `main`) |
| Parallèle avec | `build-mobile-apk.yml` (APK mobile) |
| Exécution manuelle | `workflow_dispatch` |
| Condition | Changements `frontend/` ou `backend/` dans le CI associé |
| Infrastructure | PostgreSQL service + backend JAR + seed articles V14 + Playwright Chromium |
| Seed données | `.github/scripts/seed-e2e-articles.sh` (migration `V14__insert_articles.sql`) |
| Artefacts | Rapport HTML Playwright + logs backend (14 jours) |

Pipeline global :

```
CI (build) → CD (deploy TEST) → ┬→ build-mobile-apk.yml
                                 └→ e2e.yml (smoke + golden path)
```

## Rapports et débogage

- Rapport HTML local : `frontend/playwright-report/` (après échec ou avec `--reporter=html`)
- Captures d'écran : `frontend/test-results/` (échecs uniquement)
- Trace : activée au retry en CI (`trace: 'on-first-retry'`)

En cas d'échec :

1. Ouvrir le rapport : `npx playwright show-report`
2. Vérifier que le backend répond : `curl http://localhost:8081/actuator/health`
3. Vérifier les articles : `Aucun article activé disponible` → exécuter `.github/scripts/seed-e2e-articles.sh`
4. Vérifier les comptes de test (mots de passe modifiés en base ?)
5. Pour la tontine : session clôturée → relancer ou appeler `/sessions/current/reopen`

## Bonnes pratiques pour étendre les tests

1. Ajouter un `data-testid` stable plutôt qu'un sélecteur CSS fragile.
2. Préférer les helpers (`ui-helpers`, `api-client`) aux sélecteurs dupliqués.
3. Pour les données créées : préfixe `E2E_` via `uniqueE2eLabel()` / `uniqueE2ePhone()`.
4. Les scénarios séquentiels : un seul `describe.serial` par parcours, variables `let` partagées.
5. Vérifications métier : combiner UI + API (`expect.poll` sur l'API) pour la robustesse.

## Références

- [Playwright — Best practices](https://playwright.dev/docs/best-practices)
- Changelog projet : [`docs/CHANGELOG.md`](CHANGELOG.md) (section Frontend — tests E2E)
- Déploiement : [`README-DEPLOY.md`](../README-DEPLOY.md)
