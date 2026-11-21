# Plan de migration `backend-lib` → Java 25 & Spring Boot 4.2.0

## Contexte & décisions validées

- **Branche :** `migration/java25-spring-boot-4` (étape 1 du chantier global ; `backend/`, `backend/Dockerfile` et les workflows CI seront migrés en étape 2 avant tout merge sur `main`).
- **Ordre d'exécution strict :**
  1. `backend-lib/common-entities` (`com.optimize:common-entities:4.0.0`)
  2. `backend-lib/common-securities` (`com.optimize:common-security-service:4.0.0`)
  3. `backend-lib/elykia-client` (`com.optimize.elykia:optimize-elykia-client:4.0.0`)
- **Socle cible :** Java 25 (LTS), Spring Boot `4.2.0` (Spring Framework `7.1.0`, Spring Security `7.2.0`, Spring Data `2026.1.0` / Envers `4.2.0`, Hibernate `7.4.15.Final`, Jackson 3 `3.1.8`, Lombok `1.18.48`, JUnit Jupiter `6.1.3`, `maven-compiler-plugin` `3.16.0`).

## Modifications exécutées par module

### 1. `backend-lib/common-entities` (`4.0.0`)
- `pom.xml` : parent `4.2.0`, version `4.0.0`, `<java.version>25</java.version>`, `spring-boot-starter-webmvc`, suppression des versions figées gérées par le BOM (`spring-data-envers`, `commons-lang3`, `maven-compiler-plugin`, `lombok`), suppression de `jakarta.xml.bind-api` et `maven-site-plugin:3.8.2`, `<release>${java.version}</release>` + `<parameters>true</parameters>`.
- `Converter.java` : remplacement de `jakarta.xml.bind.DatatypeConverter` par `java.util.Base64.getMimeDecoder()`.
- `ConverterTest.java` : tests unitaires ajoutés.

### 2. `backend-lib/common-securities` (`4.0.0`)
- `pom.xml` : parent `4.2.0`, version `4.0.0`, `<java.version>25</java.version>`, `spring-boot-starter-webmvc`, `common-entities:4.0.0`, `springdoc-openapi-starter-webmvc-ui:3.2.1`, `jjwt-{api,impl,jackson}:0.13.0`, Lombok géré par BOM, suppression des processeurs MapStruct inutilisés et `maven-site-plugin:3.8.2`.
- `WebSecurityConfig.java` : `new DaoAuthenticationProvider(userDetailsService)` (Spring Security 7).
- `AuthEntryPointJwt.java` : migration Jackson 3 (`tools.jackson.databind.ObjectMapper` via `JsonMapper.builder().build()`).
- `JwtUtils.java` : migration vers l'API JJWT `0.13.0` (`SecretKey`, `Jwts.SIG.HS256`, `Jwts.parser().verifyWith(key()).build().parseSignedClaims(token)`, gestion de `SecurityException`).
- `LicenceService.java` : remplacement de `RandomStringUtils.randomAlphanumeric(...)` déprécié par `RandomStringUtils.secure().nextAlphanumeric(...)`.
- `AuthorityConstant.java` : suppression de l'import mort `javax.swing.plaf.PanelUI`.
- `application.yml` : suppression de `hibernate.dialect` redondant en Hibernate 7.
- `JwtUtilsTest.java` & `AuthEntryPointJwtTest.java` : tests unitaires ajoutés.

### 3. `backend-lib/elykia-client` (`4.0.0`)
- `pom.xml` : parent `4.2.0`, version `4.0.0`, `<java.version>25</java.version>`, `spring-boot-starter-webmvc`, `common-entities:4.0.0`, `mapstruct:1.6.3`, `minio:9.0.4` + `com.squareup.okhttp3:okhttp-jvm:5.5.1` (requis sous Maven pour le packaging KMP d'OkHttp 5), `thumbnailator:0.4.21`, Lombok géré par BOM, suppression `maven-site-plugin:3.8.2`.
- `Client.java` : remplacement de `@Where` (supprimé en Hibernate 7) par `@SQLRestriction("visibility <> 'DELETED'")`.
- `ClientMapper.java` : suppression de l'import Boot 3 `JacksonProperties` et remplacement de `DatatypeConverter` par `java.util.Base64`.
- `ClientSpecification.java` : comparaison Criteria sur l'enum `State` au lieu de `state.name()`.
- `MinioStorageServiceImpl.java` : adaptation à MinIO `9.0.4` (`io.minio.messages.ListAllMyBucketsResult.Bucket` et `PutObjectArgs.Builder.stream(..., (long) data.length, null)`).
- `application.yml` : suppression de `hibernate.dialect` redondant en Hibernate 7.
- `ClientMapperBase64Test.java` & `MinioStorageServiceImplTest.java` : tests unitaires ajoutés.
