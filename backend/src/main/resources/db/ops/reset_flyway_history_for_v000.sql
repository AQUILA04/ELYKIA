-- À exécuter UNE FOIS sur une base déjà peuplée (prod/test/local) AVANT le premier
-- démarrage avec spring.flyway.enabled=true et le nouveau V000.
--
-- L’ancienne flyway_schema_history (baseline 0 + V04…V20) ne correspond plus au classpath.
-- DROP (pas TRUNCATE) : baseline-on-migrate ne s’active que si la table d’historique
-- est absente. Avec une table vide, Flyway rejoue V000 et échoue sur les objets existants.
-- Après DROP : baseline version 0 (V000 non rejoué), puis V001+.

DROP TABLE IF EXISTS flyway_schema_history;
