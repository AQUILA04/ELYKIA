-- Script pour réinitialiser complètement la base de données
-- À exécuter manuellement dans PostgreSQL

-- 1. Supprimer la base de données si elle existe
DROP DATABASE IF EXISTS oec_formation;

-- 2. Créer une nouvelle base de données
CREATE DATABASE oec_formation
    WITH 
    OWNER = eric
    ENCODING = 'UTF8'
    LC_COLLATE = 'French_France.1252'
    LC_CTYPE = 'French_France.1252'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- 3. Se connecter à la base de données oec_formation et créer le schéma public si nécessaire
\c oec_formation;

-- 4. Créer le schéma public s'il n'existe pas
CREATE SCHEMA IF NOT EXISTS public;

-- 5. Donner les permissions à l'utilisateur eric
GRANT ALL PRIVILEGES ON DATABASE oec_formation TO eric;
GRANT ALL PRIVILEGES ON SCHEMA public TO eric;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO eric;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO eric;

-- 6. Créer la table flyway_schema_history si elle n'existe pas (Flyway la créera automatiquement)
-- Cette étape n'est pas nécessaire, Flyway s'en charge