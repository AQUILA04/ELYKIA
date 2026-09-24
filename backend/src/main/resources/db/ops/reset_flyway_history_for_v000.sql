-- À exécuter UNE FOIS sur une base déjà peuplée (prod/test/local) AVANT le premier
-- démarrage avec spring.flyway.enabled=true et le nouveau V000.
--
-- L’ancienne flyway_schema_history (baseline 0 + V04…V20) ne correspond plus au classpath.
-- TRUNCATE : Flyway recree un baseline version 0 (sans rejouer V000), puis applique V001+.

TRUNCATE TABLE flyway_schema_history;
