# Plan de consolidation Monolithe Modulaire (`backend/` Spring Modulith `2.2.0`)

## 1. Décisions validées

- **Branche :** `migration/architecture-refonte` (tirée depuis `migration/java25-spring-boot-4`).
- **Version `backend/pom.xml` :** `2.0.0` → **`2.1.0`**.
- **Packages :** conservation des packages existants (`com.optimize.common.entities`, `com.optimize.common.securities`, `com.optimize.elykia.client`, `com.optimize.elykia.recruitment`, `com.optimize.elykia.core`) avec `@Modulithic(systemName = "ELYKIA Backend", additionalPackages = "com.optimize.common")` sur `com.optimize.elykia.OptimizeElykiaCoreApplication`.
- **CI / GitHub Packages :** suppression complète de `backend-lib/`, du job `build-backend-lib`, des 3 `mvn clean install` en chaîne et de la publication Maven `Deploy Backend Maven Artifact` (seule l'image Docker GHCR est publiée).

## 2. Architecture cible (5 modules Spring Modulith `2.2.0`)

| Module | Package | Type | Dépendances autorisées |
|---|---|---|---|
| `entities` | `com.optimize.common.entities` | `OPEN` | aucune (feuille pure) |
| `securities` | `com.optimize.common.securities` | `OPEN` | `entities` |
| `client` | `com.optimize.elykia.client` | `OPEN` | `entities` |
| `recruitment` | `com.optimize.elykia.recruitment` | `CLOSED` | `entities`, `securities`, `client` |
| `core` | `com.optimize.elykia.core` | `CLOSED` | `entities`, `securities`, `client` |

## 3. Changements clés

1. **`backend/pom.xml` :** suppression des dépendances `optimize-elykia-client` / `common-security-service` et de `<distributionManagement>` ; ajout de `spring-modulith-bom:2.2.0` (`spring-modulith-starter-core`, `spring-modulith-starter-test`), `spring-data-envers`, `spring-boot-starter-validation`, `spring-boot-starter-security`, `commons-lang3`, `jjwt` (`0.13.0`), `minio` (`9.0.4`) + `okhttp-jvm` (`5.5.1`), `thumbnailator` (`0.4.21`), `spring-security-test` ; `postgresql` en scope compile ; seuils JaCoCo `0.8.16` strictement conservés.
2. **Rapatriement `backend-lib/` → `backend/` :** `git mv` des 204 classes (moins les 3 `@SpringBootApplication` redondantes), extraction des 3 beans i18n dans `CommonEntitiesI18nConfig`, déplacement de `i18n/default/messages.properties`, `git mv` des 13 tests unitaires réels, suppression complète de `backend-lib/`.
3. **Spring Modulith :** remontée de `OptimizeElykiaCoreApplication` dans `com.optimize.elykia` avec `@Modulithic` et `@ConfigurationPropertiesScan` consolidé ; ajout des 5 `package-info.java` et de `ModularityTests` (`ApplicationModules.verify()` + `Documenter`).
4. **CI/E2E & Documentation :** simplification de `.github/workflows/ci.yml`, `.github/workflows/e2e.yml`, `README.md`, `docs/CHANGELOG.md` et `memory-bank/`.

## 4. Vérification

- Purge `rm -rf ~/.m2/repository/com/optimize` puis `mvn -B -f backend/pom.xml clean verify` (compilation Java 25, `ModularityTests`, 100 % des tests unitaires & Testcontainers, 6 quality gates JaCoCo `0.8.16`, fat JAR unique).
- Démarrage réel du fat JAR en profil `prod` contre `postgres:15-alpine` (`V000`→`V045`, `ddl-auto=validate`, `/actuator/health` = `UP`).
