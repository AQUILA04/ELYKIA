# Legacy Flyway scripts (V04–V104)

Ces fichiers ne sont **plus exécutés**. Ils documentent l’historique incrémental avant le baseline
`V000__init_schema.sql` (dump schéma prod du 2026-09-24).

Flyway ne scanne que `classpath:db/migration`.

Les dumps complets (`NAV01*`, `01_oec_schema.sql`) ont été retirés : le schéma de référence est `V000`.
Sonar exclut ce dossier (`sonar.exclusions` / `sonar.cpd.exclusions`).
