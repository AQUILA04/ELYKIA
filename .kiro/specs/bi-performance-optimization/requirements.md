# Requirements Document

## Introduction

Le système BI Dashboard actuel rencontre des problèmes de performance critiques en production, notamment des exceptions OutOfMemoryException lors de la consultation des métriques annuelles. Le problème provient de l'utilisation intensive de Streams Java et de listes en mémoire pour traiter de grandes quantités de données de crédits.

Cette spécification vise à optimiser les performances du système BI en remplaçant les calculs en mémoire par des requêtes SQL optimisées vers des tables d'agrégation pré-calculées.

## Glossary

- **System**: Le système BI Dashboard backend (Spring Boot)
- **Aggregation_Table**: Table de base de données contenant des données pré-calculées
- **Materialized_View**: Vue PostgreSQL matérialisée contenant des agrégations
- **Stream_Processing**: Traitement de données en mémoire avec Java Streams
- **Database_Aggregation**: Calcul d'agrégations directement dans PostgreSQL
- **Scheduler**: Tâche planifiée Spring Boot pour rafraîchir les données
- **Credit**: Entité représentant une vente à crédit
- **BI_Service**: Service Spring fournissant les métriques BI
- **Repository**: Interface Spring Data JPA pour accéder aux données
- **Native_Query**: Requête SQL native exécutée via JPA

## Requirements

### Requirement 1: Optimiser les Métriques de Ventes

**User Story:** En tant que manager, je veux consulter les métriques de ventes annuelles sans erreur OutOfMemory, afin d'analyser les performances commerciales sur de longues périodes.

#### Acceptance Criteria

1. WHEN un utilisateur demande les métriques de ventes pour une période annuelle, THE System SHALL calculer les résultats via des requêtes SQL d'agrégation sans charger toutes les données en mémoire
2. WHEN les métriques sont calculées, THE System SHALL utiliser des index de base de données pour optimiser les performances
3. WHEN une requête de tendances de ventes est effectuée, THE System SHALL retourner les résultats en moins de 2 secondes pour une période d'un an
4. WHEN le système calcule les performances des commerciaux, THE System SHALL utiliser des agrégations SQL GROUP BY au lieu de Streams Java
5. THE System SHALL maintenir la compatibilité avec les DTOs et endpoints API existants

### Requirement 2: Créer des Tables d'Agrégation

**User Story:** En tant qu'administrateur système, je veux des tables d'agrégation pré-calculées, afin d'améliorer drastiquement les performances des requêtes BI.

#### Acceptance Criteria

1. THE System SHALL créer une table sales_analytics_daily pour stocker les agrégations quotidiennes de ventes
2. THE System SHALL créer une table collection_analytics_daily pour stocker les agrégations quotidiennes de recouvrements
3. THE System SHALL créer une table commercial_performance_monthly pour stocker les performances mensuelles des commerciaux
4. THE System SHALL créer une table portfolio_snapshot pour stocker l'état du portefeuille
5. WHEN une table d'agrégation est créée, THE System SHALL définir des index appropriés sur les colonnes de filtrage
6. THE System SHALL utiliser Flyway pour gérer les migrations de schéma de base de données

### Requirement 3: Automatiser le Rafraîchissement des Agrégations

**User Story:** En tant qu'administrateur système, je veux que les tables d'agrégation soient automatiquement mises à jour, afin que les données BI restent à jour sans intervention manuelle.

#### Acceptance Criteria

1. WHEN un nouveau crédit est créé, THE System SHALL mettre à jour les agrégations en temps réel si nécessaire
2. WHEN un paiement est enregistré, THE System SHALL mettre à jour les métriques de recouvrement
3. THE System SHALL exécuter un scheduler quotidien à 2h du matin pour rafraîchir les agrégations quotidiennes
4. THE System SHALL exécuter un scheduler mensuel le 1er de chaque mois pour calculer les performances mensuelles
5. WHEN un scheduler échoue, THE System SHALL logger l'erreur sans bloquer le système

### Requirement 4: Optimiser les Requêtes de Portfolio

**User Story:** En tant que manager, je veux consulter les métriques du portefeuille (PAR, crédits actifs) rapidement, afin de prendre des décisions en temps réel.

#### Acceptance Criteria

1. WHEN un utilisateur demande les métriques du portefeuille, THE System SHALL utiliser des requêtes SQL COUNT et SUM au lieu de charger tous les crédits actifs
2. WHEN le calcul du PAR (Portfolio at Risk) est effectué, THE System SHALL utiliser des requêtes SQL avec filtres de dates
3. THE System SHALL calculer les métriques PAR 7, PAR 15 et PAR 30 en une seule requête SQL
4. WHEN les métriques sont calculées, THE System SHALL retourner les résultats en moins de 500ms

### Requirement 5: Optimiser l'Analyse des Retards

**User Story:** En tant que manager, je veux analyser les retards de paiement par tranche, afin d'identifier les crédits à risque sans surcharger le système.

#### Acceptance Criteria

1. WHEN un utilisateur demande l'analyse des retards, THE System SHALL utiliser des requêtes SQL avec CASE WHEN pour grouper par tranches
2. THE System SHALL calculer les 4 tranches de retards (0-7j, 8-15j, 16-30j, >30j) en une seule requête
3. WHEN l'analyse est effectuée, THE System SHALL éviter de charger tous les crédits actifs en mémoire
4. THE System SHALL retourner les résultats en moins de 1 seconde

### Requirement 6: Optimiser les Performances des Articles

**User Story:** En tant que manager, je veux analyser les performances des articles vendus, afin d'identifier les produits les plus rentables sans problème de mémoire.

#### Acceptance Criteria

1. WHEN un utilisateur demande les performances des articles, THE System SHALL utiliser des jointures SQL entre credit et credit_articles
2. THE System SHALL calculer les agrégations (quantité, revenu, profit) directement en SQL avec GROUP BY
3. WHEN les performances sont calculées, THE System SHALL éviter de charger tous les CreditArticles en mémoire
4. THE System SHALL retourner les résultats triés par revenu en moins de 2 secondes

### Requirement 7: Créer des Repositories Optimisés

**User Story:** En tant que développeur, je veux des méthodes de repository utilisant des requêtes natives optimisées, afin de remplacer les calculs en mémoire.

#### Acceptance Criteria

1. THE System SHALL créer des méthodes de repository avec @Query et requêtes SQL natives
2. WHEN une méthode de repository est créée, THE System SHALL utiliser des projections DTO pour mapper directement les résultats
3. THE System SHALL définir des méthodes pour calculer les agrégations de ventes par période
4. THE System SHALL définir des méthodes pour calculer les métriques de recouvrement par période
5. THE System SHALL définir des méthodes pour calculer les performances par commercial

### Requirement 8: Maintenir la Compatibilité API

**User Story:** En tant que développeur frontend, je veux que les endpoints API restent inchangés, afin de ne pas modifier le code frontend existant.

#### Acceptance Criteria

1. THE System SHALL conserver tous les endpoints API existants sans modification de signature
2. THE System SHALL retourner les mêmes DTOs qu'avant l'optimisation
3. WHEN un endpoint est optimisé, THE System SHALL maintenir la même structure de réponse JSON
4. THE System SHALL conserver la même gestion des erreurs et codes HTTP

### Requirement 9: Gérer les Données Historiques

**User Story:** En tant qu'administrateur système, je veux migrer les données historiques vers les tables d'agrégation, afin que les analyses passées restent disponibles.

#### Acceptance Criteria

1. WHEN les tables d'agrégation sont créées, THE System SHALL fournir un script de migration pour peupler les données historiques
2. THE System SHALL calculer les agrégations pour tous les crédits existants lors de la migration initiale
3. WHEN la migration est exécutée, THE System SHALL logger la progression
4. THE System SHALL permettre de ré-exécuter la migration en cas d'échec sans dupliquer les données

### Requirement 10: Monitorer les Performances

**User Story:** En tant qu'administrateur système, je veux monitorer les performances des requêtes BI, afin d'identifier les goulots d'étranglement.

#### Acceptance Criteria

1. THE System SHALL logger le temps d'exécution des requêtes BI
2. WHEN une requête prend plus de 2 secondes, THE System SHALL logger un avertissement
3. THE System SHALL logger les erreurs de rafraîchissement des agrégations
4. THE System SHALL fournir des métriques sur l'utilisation mémoire des services BI
