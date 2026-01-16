# Requirements Document - BI Dashboard Enrichment

## Introduction

Le système BI Dashboard actuel couvre les ventes à crédit, les recouvrements et le stock, mais ne capture pas les métriques importantes du rapport journalier : trésorerie/versements, ventes cash, activité Tontine, commandes et audit. Cette spécification vise à enrichir le dashboard BI avec ces nouvelles dimensions d'analyse pour une vision complète de l'activité commerciale.

Les données sont déjà capturées dans les tables `DailyCommercialReport`, `DailyOperationLog` et `CashDeposit`. L'objectif est de créer les agrégations et endpoints BI correspondants.

## Glossary

- **System**: Le système BI Dashboard backend (Spring Boot)
- **Treasury**: Module de gestion de trésorerie et versements d'espèces
- **Cash_Deposit**: Versement d'espèces par un commercial au gestionnaire
- **Cash_Sale**: Vente payée comptant (non à crédit)
- **Credit_Sale**: Vente à crédit (paiement différé)
- **Tontine**: Système d'épargne collective avec adhésions, collectes et livraisons
- **Commercial**: Vendeur terrain responsable des ventes et recouvrements
- **Billetage**: Détail des coupures de billets lors d'un versement
- **Daily_Operation_Log**: Journal d'audit des opérations terrain
- **Aggregation_Table**: Table de base de données contenant des données pré-calculées

## Requirements

### Requirement 1: Module Trésorerie et Versements

**User Story:** En tant que manager, je veux suivre les versements d'espèces et la trésorerie en circulation, afin de gérer les risques financiers et détecter les retards de versement.

#### Acceptance Criteria

1. THE System SHALL créer une table treasury_analytics_daily pour agréger les métriques de versement quotidiennes
2. WHEN un utilisateur demande les métriques de trésorerie, THE System SHALL calculer le total à verser, versé et reste par commercial
3. THE System SHALL calculer le taux de versement (Versé / À Verser) × 100 pour chaque commercial
4. WHEN un versement est en retard de plus de 3 jours, THE System SHALL le marquer comme "late"
5. THE System SHALL calculer le délai moyen de versement (Date encaissement → Date versement)
6. THE System SHALL fournir un endpoint GET /api/v1/bi/treasury/overview pour les métriques globales
7. THE System SHALL fournir un endpoint GET /api/v1/bi/treasury/by-commercial pour les métriques par commercial
8. THE System SHALL fournir un endpoint GET /api/v1/bi/treasury/late-deposits pour les versements en retard
9. THE System SHALL fournir un endpoint GET /api/v1/bi/treasury/cash-in-circulation pour les espèces non versées
10. WHEN les métriques de trésorerie sont calculées, THE System SHALL utiliser des requêtes SQL d'agrégation sans charger toutes les données en mémoire

### Requirement 2: Analyse Cash vs Crédit

**User Story:** En tant que manager, je veux analyser la répartition entre ventes cash et ventes à crédit, afin de comprendre les préférences de paiement et optimiser la stratégie commerciale.

#### Acceptance Criteria

1. THE System SHALL créer une table cash_credit_analytics_daily pour agréger les ventes cash et crédit quotidiennes
2. WHEN un utilisateur demande l'analyse cash vs crédit, THE System SHALL calculer le CA cash et le CA crédit séparément
3. THE System SHALL calculer le ratio cash/crédit (% CA cash, % CA crédit)
4. THE System SHALL calculer le panier moyen cash et le panier moyen crédit
5. THE System SHALL calculer le nombre de ventes cash et le nombre de ventes crédit
6. THE System SHALL fournir un endpoint GET /api/v1/bi/sales/cash-vs-credit pour la répartition globale
7. THE System SHALL fournir un endpoint GET /api/v1/bi/sales/cash-trends pour l'évolution dans le temps
8. THE System SHALL fournir un endpoint GET /api/v1/bi/sales/cash-by-commercial pour l'analyse par commercial
9. THE System SHALL fournir un endpoint GET /api/v1/bi/sales/cash-by-article pour l'analyse par article
10. WHEN les métriques cash/crédit sont calculées, THE System SHALL distinguer les ventes selon le type d'opération dans DailyOperationLog

### Requirement 3: Module Analyse Tontine

**User Story:** En tant que manager, je veux analyser l'activité Tontine (adhésions, collectes, livraisons), afin d'optimiser ce canal de revenus et mesurer sa performance.

#### Acceptance Criteria

1. THE System SHALL créer une table tontine_analytics_monthly pour agréger les métriques Tontine mensuelles
2. WHEN un utilisateur demande les métriques Tontine, THE System SHALL calculer le nombre d'adhésions actives
3. THE System SHALL calculer le nombre de nouvelles adhésions par période
4. THE System SHALL calculer le montant total collecté et le nombre de collectes
5. THE System SHALL calculer le montant total livré et le nombre de livraisons
6. THE System SHALL calculer le taux de collecte (Collectes réussies / Collectes prévues) × 100
7. THE System SHALL calculer le taux de livraison (Livraisons / Collectes) × 100
8. THE System SHALL calculer le montant moyen par collecte
9. THE System SHALL calculer le taux de rétention (Adhésions actives / Total adhésions historique) × 100
10. THE System SHALL fournir un endpoint GET /api/v1/bi/tontine/overview pour les métriques globales
11. THE System SHALL fournir un endpoint GET /api/v1/bi/tontine/adhesions-trends pour l'évolution des adhésions
12. THE System SHALL fournir un endpoint GET /api/v1/bi/tontine/collections-analysis pour l'analyse des collectes
13. THE System SHALL fournir un endpoint GET /api/v1/bi/tontine/by-commercial pour les performances par commercial
14. WHEN les métriques Tontine sont calculées, THE System SHALL utiliser les données de DailyOperationLog et DailyCommercialReport

### Requirement 4: Suivi des Commandes

**User Story:** En tant que manager, je veux suivre les commandes en cours et leur taux de conversion, afin d'optimiser le processus de commande et identifier les goulots d'étranglement.

#### Acceptance Criteria

1. WHEN un utilisateur demande les métriques de commandes, THE System SHALL calculer le nombre de commandes en cours
2. THE System SHALL calculer la valeur totale des commandes en cours
3. THE System SHALL calculer le nombre de commandes livrées par période
4. THE System SHALL calculer le taux de conversion (Commandes livrées / Total commandes) × 100
5. THE System SHALL calculer le délai moyen de traitement des commandes
6. THE System SHALL identifier les commandes en retard
7. THE System SHALL calculer la valeur moyenne par commande
8. THE System SHALL fournir un endpoint GET /api/v1/bi/orders/overview pour les métriques globales
9. THE System SHALL fournir un endpoint GET /api/v1/bi/orders/in-progress pour les commandes en cours
10. THE System SHALL fournir un endpoint GET /api/v1/bi/orders/by-commercial pour l'analyse par commercial

### Requirement 5: Audit et Analyse d'Activité

**User Story:** En tant que manager, je veux analyser le volume et les types d'opérations effectuées, afin de détecter les anomalies et optimiser l'activité opérationnelle.

#### Acceptance Criteria

1. WHEN un utilisateur demande l'analyse d'activité, THE System SHALL calculer le volume d'opérations par type
2. THE System SHALL calculer l'activité par heure de la journée
3. THE System SHALL calculer l'activité par jour de la semaine
4. THE System SHALL identifier les commerciaux les plus actifs
5. THE System SHALL identifier les types d'opérations les plus fréquents
6. THE System SHALL détecter les anomalies (ex: retours excessifs, opérations inhabituelles)
7. THE System SHALL fournir un endpoint GET /api/v1/bi/audit/operations-volume pour le volume global
8. THE System SHALL fournir un endpoint GET /api/v1/bi/audit/activity-heatmap pour la heatmap d'activité
9. THE System SHALL fournir un endpoint GET /api/v1/bi/audit/by-type pour l'analyse par type d'opération
10. THE System SHALL fournir un endpoint GET /api/v1/bi/audit/most-active-users pour les utilisateurs les plus actifs

### Requirement 6: Analyse Acquisition Clients

**User Story:** En tant que manager, je veux analyser l'acquisition de nouveaux clients, afin d'optimiser la stratégie d'acquisition et mesurer le coût d'acquisition.

#### Acceptance Criteria

1. WHEN un utilisateur demande les métriques d'acquisition, THE System SHALL calculer le nombre de nouveaux clients par période
2. THE System SHALL calculer le taux d'acquisition par commercial
3. THE System SHALL calculer la valeur moyenne du premier crédit
4. THE System SHALL calculer le solde moyen des nouveaux comptes
5. THE System SHALL calculer le taux de conversion (Nouveaux clients → Clients actifs)
6. THE System SHALL calculer le taux de rétention des nouveaux clients
7. THE System SHALL fournir un endpoint GET /api/v1/bi/customers/new-acquisitions pour les nouvelles acquisitions
8. THE System SHALL fournir un endpoint GET /api/v1/bi/customers/acquisition-rate pour le taux d'acquisition
9. THE System SHALL fournir un endpoint GET /api/v1/bi/customers/first-purchase-analysis pour l'analyse du premier achat
10. WHEN les métriques d'acquisition sont calculées, THE System SHALL utiliser les données de DailyOperationLog pour les créations de comptes

### Requirement 7: Automatiser le Rafraîchissement des Nouvelles Agrégations

**User Story:** En tant qu'administrateur système, je veux que les nouvelles tables d'agrégation soient automatiquement mises à jour, afin que les données BI restent à jour sans intervention manuelle.

#### Acceptance Criteria

1. WHEN un versement est enregistré, THE System SHALL mettre à jour treasury_analytics_daily en temps réel
2. WHEN une vente cash est créée, THE System SHALL mettre à jour cash_credit_analytics_daily
3. WHEN une opération Tontine est enregistrée, THE System SHALL mettre à jour tontine_analytics_monthly
4. THE System SHALL exécuter un scheduler quotidien à 3h du matin pour rafraîchir treasury_analytics_daily
5. THE System SHALL exécuter un scheduler quotidien à 3h du matin pour rafraîchir cash_credit_analytics_daily
6. THE System SHALL exécuter un scheduler mensuel le 1er à 3h pour rafraîchir tontine_analytics_monthly
7. WHEN un scheduler échoue, THE System SHALL logger l'erreur sans bloquer le système

### Requirement 8: Maintenir la Compatibilité et les Performances

**User Story:** En tant que développeur, je veux que les nouveaux endpoints suivent les mêmes patterns que les endpoints existants, afin de maintenir la cohérence de l'API.

#### Acceptance Criteria

1. THE System SHALL utiliser la même structure de réponse Response<T> pour tous les nouveaux endpoints
2. THE System SHALL utiliser les mêmes mécanismes d'authentification (JWT) et d'autorisation (ADMIN, MANAGER)
3. THE System SHALL retourner les mêmes codes HTTP que les endpoints existants
4. WHEN un nouveau endpoint est créé, THE System SHALL utiliser des requêtes SQL d'agrégation pour éviter les problèmes de mémoire
5. THE System SHALL retourner les résultats en moins de 2 secondes pour les requêtes annuelles
6. THE System SHALL retourner les résultats en moins de 500ms pour les requêtes mensuelles
7. THE System SHALL logger le temps d'exécution de tous les nouveaux endpoints
8. WHEN une requête prend plus de 2 secondes, THE System SHALL logger un avertissement

### Requirement 9: Créer des Migrations de Données Historiques

**User Story:** En tant qu'administrateur système, je veux migrer les données historiques vers les nouvelles tables d'agrégation, afin que les analyses passées restent disponibles.

#### Acceptance Criteria

1. THE System SHALL fournir un script de migration pour peupler treasury_analytics_daily avec les données historiques
2. THE System SHALL fournir un script de migration pour peupler cash_credit_analytics_daily avec les données historiques
3. THE System SHALL fournir un script de migration pour peupler tontine_analytics_monthly avec les données historiques
4. WHEN une migration est exécutée, THE System SHALL utiliser INSERT ON CONFLICT DO UPDATE pour l'idempotence
5. WHEN une migration est exécutée, THE System SHALL logger la progression tous les 1000 enregistrements
6. THE System SHALL permettre de ré-exécuter les migrations sans dupliquer les données

### Requirement 10: Documenter les Nouveaux Endpoints

**User Story:** En tant que développeur frontend, je veux une documentation complète des nouveaux endpoints, afin de pouvoir les intégrer facilement dans l'interface utilisateur.

#### Acceptance Criteria

1. THE System SHALL documenter tous les nouveaux endpoints dans BI_DASHBOARD_API_REFERENCE.md
2. THE System SHALL fournir des exemples de requêtes curl pour chaque endpoint
3. THE System SHALL documenter la structure de réponse JSON pour chaque endpoint
4. THE System SHALL documenter les paramètres optionnels et obligatoires
5. THE System SHALL documenter les codes d'erreur possibles
