# Contexte technique

Versions lues le 2026-11-21 (branche `migration/architecture-refonte`). En cas d’écart, les fichiers sources gagnent.

| Composant | Version | Fichier | Stack constatée |
|-----------|---------|---------|-----------------|
| Backend | 2.9.0 | `backend/pom.xml` (`optimize-elykia-core`) | **Java 25 (LTS)** (+ Project Leyden AOT Cache Docker), **Spring Boot 4.2.0**, **Spring Modulith 2.2.0** (18 modules DDD vérifiés en CI, `core/` supprimé), Spring AI **2.1.0** (`google-genai`), JPA / Hibernate 7.4 (`BootstrapMode.LAZY` en `prod`), Jackson 3, Flyway 12.11 (`spring-boot-starter-flyway`), JJWT 0.13.0, MinIO 9.0.4 + `okhttp-jvm` 5.5.1, MapStruct 1.6.3, Lombok 1.18.48, springdoc 3.2.1, iText 9.8.1 / html2pdf 6.3.4 / PDFBox 3.0.8 / POI 5.5.1, Testcontainers 2.0.5, JaCoCo 0.8.16 (seuil lignes global 0,46) |
| Frontend | 2.62.0 | `frontend/package.json` | Angular **18.2**, Material, ng-select, ngx-permissions, Playwright 1.60, Karma/Jasmine. `npm install --legacy-peer-deps` |
| Mobile | 2.48.0 | `mobile/package.json` (+ `environment.ts` et `environment.prod.ts`) | Angular **20**, Ionic **8**, Capacitor **7.4**, SQLite, NgRx 20 |
| Espace client | 0.17.4 | `customer-space/package.json` | Angular **20.3**, Ionic **8**, Capacitor **8.4** |

`docs/project-overview.md` et `docs/architecture-frontend.md` indiquent encore Angular 14 : c’est périmé.

`backend/` (branche `migration/architecture-refonte`) : **monolithe modulaire unique** (`optimize-elykia-core:2.9.0`, un seul `pom.xml`, JAR extrait `jarmode=tools` + cache AOT Java 25 dans `backend/Dockerfile`) ayant absorbé `backend-lib/` et achevé le découpage DDD complet de `core/` (18 modules vérifiés en CI via `ModularityTests` : `entities`, `securities`, `client`, `shared`, `notification`, `organization`, `inventory`, `finance`, `sale`, `tontine`, `carnet`, `customer`, `bi`, `reporting`, `bootstrap`, `recruitment`, `ai`, `apprelease`).

Postgres **15** (image du compose prod). Base locale de dev documentée : `oec` / utilisateur `oec`. Base prod du compose : `elykia_prod_db` (variables `POSTGRES_*`).

## Lancer en local

Prérequis : Java 25 (branches migration ; Java 17 sur `main` avant fusion), Maven 3.9+, Node 20, PostgreSQL 15. Android SDK seulement pour un binaire mobile. Secrets : variables d’environnement, jamais dans Git (`JWT_SECRET`, mot de passe JDBC, clés MinIO, clés LLM, `NOTIFICATION_HUB_*`). Amorçage des comptes démo seulement si `SECURITY_CONFIG_AUTO_INITIALIZE_ENABLED=true` et `LOCAL_SEED_PASSWORD` ; le profil `prod` le coupe.

```bash
# API (build autonome, plus aucun install backend-lib requis) — port 8081, health http://localhost:8081/actuator/health
cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=prod

cd frontend && npm install --legacy-peer-deps && npm start    # http://localhost:4200
cd mobile && npm install --legacy-peer-deps && npm start      # ionic serve
cd customer-space && npm install && npm start
```

MinIO local : `docker compose -f deploy/docker-compose.dev.yml up -d`.

Profils Spring présents : `application.yml` (actif par défaut `prod`), `application-prod.yml`, `application-uat.yml`, `application-formation.yml`. Port local documenté : **8081**.

## Tests

| Cible | Commande |
|-------|----------|
| Backend | `mvn test` dans `backend/` (Testcontainers + Postgres ; JaCoCo gate) |
| Frontend unitaire | `npm test` |
| Frontend E2E | `npm run test:e2e:smoke`, `test:e2e:golden`, `test:e2e` — guide `docs/README_E2E_TEST.md` |
| Mobile E2E | `npm run test:e2e`, `test:e2e:smoke` |
| Espace client | `npm run test:unit`, `npm run test:e2e` |

CI Playwright : jobs Chromium sur `ubuntu-24.04` (Playwright 1.60 ne supporte pas Ubuntu 26.04).

## CI/CD

Workflows `.github/workflows/` :

| Fichier | Rôle |
|---------|------|
| `ci.yml` | Images Docker frontend, backend, website. Porte d’entrée du CD. Push/PR sur `main`, `develop`, `release/**` ; push aussi sur `prod/**` |
| `ci-mobile.yml`, `ci-customer-space.yml` | CI mobile et espace client, **ne bloquent pas** le CD |
| `cd.yml` | Après CI verte : `main` → test, `prod/**` → prod. Promotion manuelle test → prod |
| `e2e.yml` | Playwright après un déploiement TEST |
| `build-mobile-apk.yml`, `build-customer-space-apk.yml` | APK signés après CD + CI dédiée |
| `publish-customer-space-play.yml` | Publication Play de l’espace client |
| `deploy-website.yml`, `deploy-landing-page.yml` | Site et landing |
| `gitleaks.yml` | Scan des secrets |

Images GHCR. Le CD résout la dernière image réellement publiée par composant (un commit qui ne touche que `deploy/` ne reconstruit pas les images). Détail : en-tête de `cd.yml`, `README-DEPLOY.md`, `deploy/EXPLOITATION.md`.

## Environnements

Hébergement actuel : VPS **Contabo**, stacks Docker `/opt/elykia/{test,prod}`, réseau `optimizesolux-common`. Traefik, MinIO, Grafana, pgAdmin, Prometheus viennent de `shared-traefik` et `optimize-common-infra`, pas du compose ELYKIA. Compose de référence : `deploy/docker-compose.prod.yml` et `docker-compose.test.yml`. Les fichiers `docker-compose.DO*.yml` sont l’ancienne stack DigitalOcean (MinIO embarqué).

| Surface | Prod | Test |
|---------|------|------|
| Admin + API | `elykia.amenouveve-yaveh.com` (API sous `/api`) | `elykia-test.amenouveve-yaveh.com` |
| Espace client web | `clients.amenouveve-yaveh.com` | `clients-test.amenouveve-yaveh.com` |
| Site | `www.amenouveve-yaveh.com` | (workflow site) |
| Landing | `elykia.optimizesolux.com` | — |
| MinIO public (compose Contabo) | `s3.optimizesolux.com` | idem, buckets / canaux par env |
| Auth OTP | Keycloak `auth.optimizesolux.com`, realm `notification-hub`, client `elykia` | même URI par défaut que la prod |

Paygate test documenté dans le changelog (2026-10-17) : `https://paygate-test-api.optimizesolux.com`. Aucun secret dans ce fichier.

Horloge serveur et métier : **GMT (UTC+0)**, Lomé. Citer les timestamps en GMT. Ne pas les convertir en heure Maurice.

## Versions et changelog

SemVer **par composant**, pas de version unique de monorepo. Toute tâche qui modifie code, config ou docs : entrée dans `docs/CHANGELOG.md` (Keep a Changelog, français). PATCH par défaut ; MINEUR pour une fonctionnalité visible substantielle. Section `Docs & Infra` sans numéro, pour CI, deploy, skills, docs racine. Skill : `.cursor/skills/keep-changelog/SKILL.md`.

Outils qualité présents : Sonar (`sonar-project.properties`), JaCoCo, gitleaks. Seuils et exclusions : **ne pas les assouplir pour faire passer un changement**.
