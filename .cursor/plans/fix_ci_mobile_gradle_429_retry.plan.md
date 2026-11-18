# Fix CI — retry Gradle APK sur 429 Maven Central

## Constat

Run post-merge #238 (`44281636527` / `build-mobile`) : Ionic + E2E OK.
`assembleDebug` échoue sur `repo.maven.apache.org` HTTP **429 Too Many Requests**.

Pas un bug métier de la PR mergeée.

## Correctif

Retry avec backoff dans `ci-mobile.yml` et `ci-customer-space.yml` autour de `./gradlew assembleDebug`.
