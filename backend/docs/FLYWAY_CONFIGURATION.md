# Configuration Flyway - Guide Complet

## 📋 Vue d'ensemble

Flyway est maintenant configuré pour gérer les migrations de base de données du projet Elykia.

**Date de configuration :** 18 novembre 2025  
**Version Flyway :** Gérée par Spring Boot 3.3.0  
**Base de données :** PostgreSQL

---

## ✅ Configuration Effectuée

### 1. Dépendances Maven (pom.xml)

```xml
<!-- Flyway pour la gestion des migrations de base de données -->
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>

<!-- Support PostgreSQL pour Flyway -->
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
</dependency>
```

### 2. Configuration Spring (application.yml)

```yaml
spring:
  flyway:
    enabled: true
    baseline-on-migrate: true
    baseline-version: 0
    locations: classpath:db/migration
    validate-on-migrate: true
    out-of-order: false
    placeholder-replacement: true
    placeholders:
      project: optimize-elykia-core
```

### 3. Structure des Migrations

```
src/main/resources/
└── db/
    └── migration/
        ├── 03_V1__bi_dashboard_entities.sql
        ├── V2__future_migration.sql
        └── V3__another_migration.sql
```

---

## 📝 Convention de Nommage

### Format Standard
```
V{VERSION}__{DESCRIPTION}.sql
```

**Exemples :**
- `03_V1__bi_dashboard_entities.sql`
- `V2__add_user_roles.sql`
- `V3__update_credit_table.sql`
- `V4__create_indexes.sql`

### Règles
1. **V** : Préfixe obligatoire (majuscule)
2. **{VERSION}** : Numéro de version (1, 2, 3, 1.1, 2.5, etc.)
3. **__** : Double underscore (séparateur)
4. **{DESCRIPTION}** : Description en snake_case
5. **.sql** : Extension obligatoire

### Versions
- **Entières** : `V1`, `V2`, `V3` (recommandé)
- **Décimales** : `V1.1`, `V2.5` (pour sous-versions)
- **Dates** : `V20251118` (optionnel)

---

## 🚀 Utilisation

### Première Migration (Base Existante)

Si vous avez déjà une base de données existante :

```bash
# 1. Créer une baseline (marquer l'état actuel)
./mvnw flyway:baseline

# 2. Appliquer les nouvelles migrations
./mvnw spring-boot:run
```

### Nouvelle Base de Données

Pour une nouvelle base de données vide :

```bash
# Démarrer l'application (Flyway s'exécute automatiquement)
./mvnw spring-boot:run
```

### Commandes Maven Flyway

```bash
# Afficher l'état des migrations
./mvnw flyway:info

# Valider les migrations
./mvnw flyway:validate

# Appliquer les migrations
./mvnw flyway:migrate

# Nettoyer la base (ATTENTION : Supprime toutes les données !)
./mvnw flyway:clean

# Réparer la table de métadonnées
./mvnw flyway:repair

# Créer une baseline
./mvnw flyway:baseline
```

---

## 📊 Table de Métadonnées

Flyway crée automatiquement une table `flyway_schema_history` :

```sql
SELECT * FROM flyway_schema_history ORDER BY installed_rank;
```

**Colonnes :**
- `installed_rank` : Ordre d'exécution
- `version` : Version de la migration
- `description` : Description
- `type` : Type (SQL, JDBC)
- `script` : Nom du fichier
- `checksum` : Hash du contenu
- `installed_by` : Utilisateur
- `installed_on` : Date d'installation
- `execution_time` : Temps d'exécution (ms)
- `success` : Statut (true/false)

---

## 📝 Créer une Nouvelle Migration

### Étape 1 : Créer le Fichier

```bash
# Créer dans src/main/resources/db/migration/
touch src/main/resources/db/migration/V2__add_new_feature.sql
```

### Étape 2 : Écrire le SQL

```sql
-- V2__add_new_feature.sql

-- Description de la migration
-- Auteur: Votre Nom
-- Date: 2025-11-18

-- Créer une nouvelle table
CREATE TABLE IF NOT EXISTS new_table (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ajouter une colonne à une table existante
ALTER TABLE existing_table 
ADD COLUMN IF NOT EXISTS new_column VARCHAR(100);

-- Créer un index
CREATE INDEX IF NOT EXISTS idx_new_table_name 
ON new_table(name);

-- Commentaires
COMMENT ON TABLE new_table IS 'Description de la table';
COMMENT ON COLUMN new_table.name IS 'Nom de l''entité';
```

### Étape 3 : Tester

```bash
# Vérifier la migration
./mvnw flyway:info

# Appliquer
./mvnw spring-boot:run
```

---

## ⚠️ Bonnes Pratiques

### DO ✅

1. **Toujours tester** les migrations en développement d'abord
2. **Utiliser IF NOT EXISTS** pour éviter les erreurs
3. **Ajouter des commentaires** SQL pour documenter
4. **Versionner séquentiellement** (V1, V2, V3...)
5. **Faire des migrations atomiques** (une fonctionnalité = une migration)
6. **Sauvegarder la base** avant migration en production
7. **Utiliser des transactions** quand possible
8. **Tester le rollback** si nécessaire

### DON'T ❌

1. **Ne jamais modifier** une migration déjà appliquée
2. **Ne pas utiliser DROP TABLE** sans IF EXISTS
3. **Éviter les migrations trop volumineuses**
4. **Ne pas mélanger DDL et DML** dans la même migration
5. **Ne pas utiliser flyway:clean** en production
6. **Ne pas ignorer les erreurs** de validation
7. **Ne pas oublier les index** sur les foreign keys
8. **Ne pas négliger les performances** des migrations

---

## 🔧 Configuration Avancée

### Par Environnement

**application-dev.yml :**
```yaml
spring:
  flyway:
    enabled: true
    clean-disabled: false  # Permet clean en dev
```

**application-