# ELYKIA

Plateforme de gestion commerciale et financière pour la distribution de produits à crédit, la gestion de stock, les tontines et le suivi des opérations terrain (commerciaux, magasiniers, gestionnaires).

## Vue d'ensemble fonctionnelle

ELYKIA couvre le cycle de vie complet des opérations d'une organisation de vente à crédit :

- **Référentiels** : clients, localités, comptes, articles, utilisateurs et profils.
- **Stock commercial** : demandes de sortie, validation gestionnaire, livraison magasin, stock mensuel par commercial, retours.
- **Ventes** : crédits étalés, ventes comptant, recouvrements (mises journalières), rattrapage sur stock des mois antérieurs.
- **Stock tontine** : demandes, validation, livraison, stock annuel par commercial.
- **Tontines** : inscription membres, collectes, clôture de session, livraisons de fin d'année, rapports.
- **Caisse & comptabilité** : versements, billetage, rapport journalier par commercial, journée comptable.
- **Commandes, inventaires, BI** : modules complémentaires selon les profils.
- **Mobile (Ionic/Capacitor)** : application terrain pour les commerciaux (clients, ventes, synchronisation).

### Profils utilisateurs principaux

| Profil | Rôle typique |
|--------|----------------|
| Gestionnaire | Validation, supervision, rapports, paramétrage |
| Commercial (promoteur) | Clients, ventes, collectes, stock terrain |
| Magasinier | Livraisons et réceptions stock |
| Secrétaire / Admin | Configuration, utilisateurs |

## Structure technique du dépôt

```
ELYKIA/
├── backend/              # API REST Spring Boot (Java 17, PostgreSQL)
├── backend-lib/          # Bibliothèques Maven partagées (entities, security, client)
├── frontend/             # Interface web Angular 18 (administration)
├── mobile/               # Application Ionic / Angular / Capacitor (Android)
├── deploy/               # Docker Compose, scripts de déploiement, monitoring
├── docs/                 # Documentation technique et changelog
├── user-guide/           # Guides utilisateur (HTML)
└── .github/workflows/    # CI, CD, E2E, build APK
```

### Stack

| Couche | Technologies |
|--------|--------------|
| Backend | Java 17, Spring Boot, Spring Security (JWT), JPA, PostgreSQL |
| Frontend web | Angular 18, Angular Material, ng-select, Playwright (E2E) |
| Mobile | Ionic, Angular, Capacitor, SQLite local |
| Infra | Docker, GitHub Actions, GHCR, Traefik (prod) |
| Stockage fichiers | MinIO (photos clients, rapports) |

## Prérequis développement

- **Java 17** + Maven 3.8+
- **Node.js 20** + npm
- **PostgreSQL 15** (base locale `oec`)
- **Android SDK** (uniquement pour le build mobile)
- Optionnel : **Docker** (MinIO local via `deploy/docker-compose.dev.yml`)

## Démarrage en mode développement

### 1. Base de données

Créer une base PostgreSQL locale alignée sur le profil `prod` du backend :

- Base : `oec`
- Utilisateur / mot de passe : voir `backend/src/main/resources/application-prod.yml`

```bash
# Exemple (psql)
CREATE DATABASE oec;
CREATE USER oec WITH PASSWORD 'APP2024';
GRANT ALL PRIVILEGES ON DATABASE oec TO oec;
```

### 2. Backend (port 8081)

```bash
# Bibliothèques partagées (première fois ou après modification de backend-lib/)
mvn -f backend-lib/common-entities/pom.xml clean install -DskipTests
mvn -f backend-lib/common-securities/pom.xml clean install -DskipTests
mvn -f backend-lib/elykia-client/pom.xml clean install -DskipTests

# API
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

Vérification : [http://localhost:8081/actuator/health](http://localhost:8081/actuator/health)

Optionnel — MinIO local (photos, rapports) :

```bash
docker compose -f deploy/docker-compose.dev.yml up -d
```

Variables MinIO à définir pour le backend (voir commentaires dans `deploy/docker-compose.dev.yml`).

### 3. Frontend web (port 4200)

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

Application : [http://localhost:4200](http://localhost:4200)

L'URL API est configurée dans `frontend/src/environments/environment.ts` (`http://localhost:8081`).

Comptes de test par défaut (après premier démarrage backend) : `ges003` / `Abcd1234`, `mag001` / `Maga1234`, `COM020` / `ChangeMe020`.

### 4. Mobile

```bash
cd mobile
npm install --legacy-peer-deps
npm start          # navigateur (ionic serve)
# ou
npx ionic capacitor run android   # émulateur / appareil
```

Configurer l'URL API dans `mobile/src/environments/environment.ts`.

## Tests E2E (web admin)

Les tests Playwright valident les parcours métier de l'interface web. Documentation complète : **[`docs/README_E2E_TEST.md`](docs/README_E2E_TEST.md)**.

### Lancement manuel rapide

```bash
# Terminal 1 — backend (voir ci-dessus)
# Terminal 2 — optionnel si Playwright démarre le frontend automatiquement

cd frontend
npm install --legacy-peer-deps
npx playwright install chromium

npm run test:e2e:smoke      # tests rapides (~30 s)
npm run test:e2e:golden     # parcours complet 31 étapes (~3 min)
npm run test:e2e            # tous les projets
```

Si le frontend tourne déjà sur le port 4200 :

```bash
# Linux / macOS
E2E_SKIP_WEB_SERVER=1 npm run test:e2e:golden

# PowerShell
$env:E2E_SKIP_WEB_SERVER="1"; npm run test:e2e:golden
```

### CI

Le workflow **ELYKIA QA — E2E Web** (`.github/workflows/e2e.yml`) s'exécute après un déploiement TEST réussi, en parallèle du build APK mobile.

## Pipelines CI/CD

| Workflow | Déclencheur | Rôle |
|----------|-------------|------|
| `ci.yml` | Push / PR sur `main`, `develop`, `release/**` | Build images Docker frontend/backend (gate de déploiement) |
| `ci-mobile.yml` | Push / PR sur `main`, `develop`, `release/**` | CI mobile (E2E + APK debug, n'empêche pas le CD) |
| `cd.yml` | Après CI deploy réussi | Déploiement TEST (`main`) ou PROD (`prod/**`) |
| `e2e.yml` | Après CD TEST réussi | Tests E2E Playwright (smoke + golden path) |
| `build-mobile-apk.yml` | Après CD + ci-mobile réussis | Build APK Android signé |

Voir [`README-DEPLOY.md`](README-DEPLOY.md) pour le déploiement serveur.

## Documentation

| Document | Contenu |
|----------|---------|
| [`docs/README_E2E_TEST.md`](docs/README_E2E_TEST.md) | Tests E2E Playwright |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Historique des versions |
| [`README-DEPLOY.md`](README-DEPLOY.md) | Déploiement Docker / Swarm |
| [`README-DOCKER-INSTALL.md`](README-DOCKER-INSTALL.md) | Installation Docker |
| [`backend/docs/`](backend/docs/) | API tontine, BI, migrations |
| [`user-guide/`](user-guide/) | Guides par profil |

## Licence

Projet propriétaire — usage interne Optimize / ELYKIA.
