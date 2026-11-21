# Plan de migration Étape 2 : `backend/` (`optimize-elykia-core`) + Docker + CI → Java 25 & Spring Boot 4.2.0

## 1. Périmètre et décisions validées

- **Branche :** `migration/java25-spring-boot-4` (à la suite de l'étape 1 `backend-lib:4.0.0`, sans fusion sur `main` avant validation globale).
- **Cibles :** `backend/`, `backend/Dockerfile`, `.github/workflows/ci.yml`, `.github/workflows/e2e.yml`.
- **Décisions validées :**
  1. Version de `backend/pom.xml` (`optimize-elykia-core`) : `1.63.0` → **`2.0.0`**.
  2. Spring AI Gemini : migration `spring-ai-starter-model-vertex-ai-gemini` → **`spring-ai-starter-model-google-genai`** (Spring AI `2.1.0`, `GoogleGenAiChatModel`, `com.google.genai.errors.ApiException`).
  3. Bibliothèques PDF & Excel : montée complète **`itext7-core:9.8.1`**, **`html2pdf:6.3.4`**, **`pdfbox:3.0.8`**, **`poi:5.5.1`** (conservation de `flying-saucer-pdf:9.1.22` + `itextpdf:5.5.13.4` pour les usages historiques `ITextRenderer`).

## 2. Matrice des dépendances `backend/pom.xml`

| Dépendance / Plugin | Avant | Après | Notes |
|---|---|---|---|
| Java | 17 | **25 (LTS)** | `<java.version>25</java.version>`, `<release>25</release>`, `<parameters>true</parameters>` |
| Spring Boot Parent | `3.3.0` | **4.2.0** | Spring 7.1, Security 7.2, Hibernate 7.4, Jackson 3.1.8, Logback 1.6.6, JUnit 6.1.3 |
| `backend-lib` (`optimize-elykia-client`, `common-security-service`) | `0.0.1-SNAPSHOT` / `1.2.2` | **4.0.0** | Livré à l'étape 1 |
| Starters Web & Test | `spring-boot-starter-web` | **`spring-boot-starter-webmvc`** + **`spring-boot-starter-restclient`** + **`spring-boot-starter-webmvc-test`** | Modularisation Boot 4 |
| Flyway | `flyway-core` | **`spring-boot-starter-flyway`** + `flyway-database-postgresql` | Flyway `12.11.0` géré par BOM ; starter requis pour l'auto-configuration Boot 4 |
| Spring AI | `1.0.0` (`vertex-ai-gemini`) | **2.1.0** (`spring-ai-starter-model-google-genai`) | Compatible Boot 4.2 |
| Testcontainers | `1.21.4` | **2.0.5** *(BOM)* | `testcontainers-junit-jupiter` + `testcontainers-postgresql` |
| JaCoCo | `0.8.12` | **0.8.16** | Support bytecode Java 25 (v69), tous les seuils préservés à l'identique |
| `springdoc-openapi-starter-webmvc-ui` | `2.5.0` | **3.2.1** | Boot 4.2 + Jackson 3 |
| `spring-boot-admin-starter-client` | `3.3.3` | **4.1.5** | Boot 4 |
| `shedlock-spring` / `jdbc-template` | `5.16.0` | **7.11.0** | Spring 7 / Boot 4 |
| `mapstruct` | `1.6.0.Beta1` | **1.6.3** | Stable Java 25 (`lombok:1.18.48` BOM) |
| `logstash-logback-encoder` | `7.2` | **9.0** | Jackson 3 + Logback 1.6 |
| `loki-logback-appender` | `1.5.1` | **2.1.0** | Logback 1.6 |
| `janino` | géré Boot 3 | **Supprimé** | Remplacé par `NonBlankPropertyCondition` (Logback 1.6 `PropertyConditionBase`) |
| `jsqlparser` | `4.9` | **5.4** | `TablesNamesFinder.getTables(statement)` |
| PDF & Excel | iText `8.0.5`, html2pdf `5.0.5`, pdfbox `3.0.3`, poi `5.2.5` | **iText `9.8.1`, html2pdf `6.3.4`, pdfbox `3.0.8`, poi `5.5.1`** | Validation via tests de rendu PDF |
| `maven-compiler-plugin` | `3.11.0` | **3.16.0** *(BOM)* | `<release>25</release>`, `<parameters>true</parameters>` |

## 3. Changements code & configuration

1. **Spring Boot 4 core :**
   - `@EntityScan` → `org.springframework.boot.persistence.autoconfigure.EntityScan` (`OptimizeElykiaCoreApplication`).
   - `EnvironmentPostProcessor` → `org.springframework.boot.EnvironmentPostProcessor` (`AiProviderEnvironmentPostProcessor`) enregistré dans `META-INF/spring.factories`.
   - Suppression des `hibernate.dialect` redondants dans `application-{prod,uat,formation}.yml` et `src/test/resources/application.yml`.
2. **Jackson 3 (`tools.jackson.*`) :**
   - Migration des 11 classes `src/main` et 10 classes `src/test` vers `tools.jackson.databind.*`, `JsonMapper`, `JacksonException`, `asString()`, et `JacksonJsonHttpMessageConverter`.
3. **Spring AI 2.1.0 & MinIO 9.0.4 & JSqlParser 5.4 :**
   - `AiConfiguration`, `AiProviderEnvironmentPostProcessor`, `ResilientChatModel` (`com.google.genai.errors.ApiException`), `application.yml` (`spring.ai.google.genai.*`), `src/test/resources/application.yml`.
   - `ArticlePhotoUrlService` & `ClientPhotoUrlService` : `io.minio.http.Method` → `io.minio.Http.Method`.
   - `SqlValidator` : `TablesNamesFinder.getTables(statement)`.
4. **Logback 1.6.6 :**
   - `NonBlankPropertyCondition` (`PropertyConditionBase`) + `<if><condition class="...">` dans `logback-spring.xml`, `SizeAndTimeBasedRollingPolicy`, et `NonBlankPropertyConditionTest`.
5. **Tests, Docker & CI :**
   - `@MockBean` → `@MockitoBean`, `@AutoConfigureMockMvc` → `org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc`.
   - `backend/Dockerfile` (`eclipse-temurin:25-jre`), `.github/workflows/ci.yml` & `.github/workflows/e2e.yml` (`java-version: '25'`).
6. **Validation :**
   - `mvn -B -f backend/pom.xml clean verify` (tests unitaires + Testcontainers PostgreSQL/MinIO + PDF + quality gate JaCoCo sans abaissement de seuil).
   - Validation Flyway 12.11 (`V000` → `V045`) sur un conteneur PostgreSQL 15 vierge.
   - Vérification bytecode Java 25 (`javap -v` → `major version: 69`).
