# CI — cache Gradle et miroir Maven Central

2026-11-21. Suite de `fix_ci_mobile_gradle_429_retry.plan.md`.

## Constat

Après la fusion de la PR #274, `ELYKIA CI Mobile Pipeline` (run 44907958042, job `build-mobile`) échoue sur `assembleDebug` : 3 tentatives, puis « Could not find » sur des dépendances standard (gson 2.10.1, slf4j-api 1.7.30, asm 9.6) recherchées sur `repo.maven.apache.org`. Pas de cache Gradle : chaque build retélécharge tout depuis Maven Central, qui limite les requêtes (429). La relance réutilise la résolution ratée : les tentatives 2 et 3 échouent de la même façon. Le CI mobile en échec bloque `build-mobile-apk.yml` : pas d'APK.

## Correctif

- `.github/actions/setup-gradle-resilient` : `gradle/actions/setup-gradle@v4` (cache des dépendances et du wrapper, écrit depuis `main`, lu par les PR) et script d'initialisation `.github/gradle/maven-central-mirror.init.gradle` (miroir Google de Maven Central déclaré avant `google()` et `mavenCentral()`, sans toucher `android/` généré par `cap add android`, ni `pluginManagement`).
- `.github/scripts/gradle-with-retry.sh` : 3 tentatives, attente 30 s puis 60 s, `--refresh-dependencies` dès la 2e.
- Appliqué aux 4 builds Gradle : `ci-mobile.yml`, `ci-customer-space.yml` (debug), actions `build-mobile-apk` et `build-customer-space-apk` (release, sans relance jusqu'ici).

## Vérifié

- Gradle 8.11 (Docker) : dépôts `[MavenCentralGoogleMirror, Google, MavenRepo]` pour le projet et le buildscript ; gson 2.10.1 et slf4j-api 1.7.30 téléchargés depuis le miroir.
- Script de relance testé avec un faux `gradlew` (succès à la 2e tentative, échec après N tentatives, `--refresh-dependencies` ajouté).
- `validate-mobile-pipeline.sh`, `validate-customer-space-pipeline.sh`, YAML valides.

## À observer

Premier build sur `main` après fusion : il remplit le cache. Les suivants doivent indiquer « Gradle User Home cache restored ».
