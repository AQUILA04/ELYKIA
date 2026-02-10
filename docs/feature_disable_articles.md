# Fonctionnalité : Désactivation d'Article

Ce document résume les modifications apportées pour permettre la désactivation des articles, en s'assurant qu'ils n'apparaissent plus dans les listes opérationnelles (Inventaire, Commandes, Ventes) tout en restant gérables par les administrateurs.

## Résumé des Modifications

### Backend (Spring Boot)

#### Implémentation de la Logique Métier
*   **Entité `Articles` :** Utilisation du champ `state` (Enum `State.ENABLED`, `State.DISABLED`, `State.DELETED`).
*   **Service `ArticlesService` :**
    *   Ajout de méthodes pour désactiver (`disableArticle`), activer (`enableArticle`), et traiter par lot (`disableArticles`, `enableArticles`).
    *   **Règle métier :** Impossible de désactiver un article si son stock (`stockQuantity`) est supérieur à 0.
    *   **Historique :** Création d'une entité `ArticleStateHistory` pour tracer tous les changements de statut.
*   **Repository `ArticlesRepository` :**
    *   Ajout de `elasticsearchEnabled` pour filtrer les recherches Elasticsearch par statut `ENABLED`.

#### API Endpoints (ArticlesController)
*   **Gestion :**
    *   `POST /{id}/disable` : Désactiver un article.
    *   `POST /{id}/enable` : Activer un article.
    *   `POST /disable-batch` : Désactiver une liste d'articles.
    *   `POST /enable-batch` : Activer une liste d'articles.
*   **Consultation Filtrée :**
    *   `GET /enabled` : Récupère uniquement les articles actifs (paginé).
    *   `GET /enabled/all` : Récupère tous les articles actifs (liste complète).
    *   `POST /elasticsearch/enabled` : Recherche uniquement parmi les articles actifs.

#### Ajustements Spécifiques
*   **Inventaire (`InventoryService`) :** Lors de la création d'un inventaire, seuls les articles actifs sont récupérés pour générer la fiche de comptage.
*   **Vente à Crédit / Stock Commercial (`CommercialMonthlyStockRepository`) :**
    *   *Note :* Le filtre sur le statut a été retiré pour le stock commercial car un article en stock chez un commercial (quantité > 0) est implicitement valide pour la vente, même s'il est désactivé globalement.

### Frontend (Angular)

#### Gestion des Articles (`ListComponent`)
*   **Actions :** Ajout des boutons "Activer" et "Désactiver" (unitaires et groupés).
*   **Affichage :**
    *   Colonne "Statut" avec badges colorés.
    *   **Styling :**
        *   Badge Actif : Vert (`#198754`).
        *   Badge Désactivé : Gris (`#6c757d`).
        *   Badge Supprimé : Rouge (`#ff0000`).
        *   Cases à cocher : Bleu (`#003366`).
*   **Service (`ItemService`) :**
    *   Intégration des nouveaux endpoints API.
    *   Ajout de `getAllEnabledArticles()` pour récupérer uniquement les articles actifs.

#### Filtrage Opérationnel
*   **Inventaire (`InventoryComponent`) :**
    *   Utilise désormais `/api/v1/articles/enabled` pour la liste des articles.
    *   Utilise `/api/v1/articles/elasticsearch/enabled` pour la recherche.
*   **Commandes (`OrderForm`) :**
    *   Utilise les endpoints filtrés pour ne proposer que des articles actifs.
*   **Saisie de Crédit (`CreditAddComponent`) :**
    *   Pour la vente au comptant ("CASH"), utilise `getAllEnabledArticles()` pour ne charger que les articles actifs du stock général.
    *   *Rappel :* La vente à crédit se base sur le stock du commercial, qui est filtré par la quantité > 0.

### Mobile App (Ionic)

*   **Sélecteur d'Article (`ArticleSelectorComponent`) :**
    *   Vérifié pour utiliser les données fournies qui sont filtrées en amont ou par l'API.
*   **Service (`ArticleService`) :**
    *   Initialisation via `/api/v1/articles/enabled/all` pour ne télécharger que les articles actifs sur le terminal.

## Vérification

*   **Business Rule :** Tentative de désactivation d'un article avec stock > 0 -> **Bloqué (Erreur API)**.
*   **Business Rule :** Vente d'un article désactivé -> **Impossible** (l'article n'apparaît pas dans la sélection).
*   **Admin View :** Les articles désactivés restent visibles et réactivables dans la liste principale des articles.
