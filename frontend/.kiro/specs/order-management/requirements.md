# Document des Exigences - Gestion des Commandes

## Introduction

Ce document définit les exigences pour l'implémentation du module de gestion des commandes dans l'application web Angular. Basé sur les spécifications du PRD et de l'architecture existante, ce module permettra aux commerciaux de créer, gérer et synchroniser les commandes clients directement depuis l'application web, indépendamment des niveaux de stock. Le module s'intégrera harmonieusement avec l'architecture existante en suivant les mêmes patterns que le module tontine et en respectant les contraintes d'authentification JWT et de structure de réponse API standardisée.

## Exigences

### Exigence 1 - Configuration de la base de données locale pour les commandes

**User Story:** En tant que développeur, je veux ajouter les tables nécessaires pour "Orders" et "OrderItems" à la base de données locale, afin que l'application puisse persister les données de commande pour une utilisation hors ligne.

#### Critères d'acceptation

1. QUAND l'application se lance ALORS le système DOIT créer une nouvelle table `orders` dans le schéma SQLite avec les champs ID, client ID, date, montant total et statut de synchronisation
2. QUAND l'application se lance ALORS le système DOIT créer une nouvelle table `order_items` dans le schéma avec les champs ID, order ID, article ID, quantité et prix
3. QUAND les modèles TypeScript sont créés ALORS le système DOIT définir les interfaces `Order` et `OrderItem` dans le répertoire des modèles
4. QUAND le service de base de données principal est mis à jour ALORS le système DOIT fournir des méthodes pour effectuer les opérations CRUD sur les commandes et leurs articles
5. QUAND l'application démarre ALORS le système DOIT s'assurer que toutes les tables et fonctionnalités existantes restent inchangées

### Exigence 2 - Tableau de bord des commandes avec KPIs

**User Story:** En tant que gestionnaire, je veux accéder à un tableau de bord centralisé des commandes avec des indicateurs clés, afin de pouvoir superviser efficacement le flux de commandes et prendre des décisions rapides.

#### Critères d'acceptation

1. QUAND le gestionnaire accède au module commandes ALORS le système DOIT afficher un tableau de bord avec des indicateurs clés de performance (KPIs)
2. QUAND le tableau de bord se charge ALORS le système DOIT afficher le nombre de commandes en attente, la valeur potentielle, le taux d'acceptation et la valeur du pipeline accepté
3. QUAND le gestionnaire consulte le tableau de bord ALORS le système DOIT organiser les commandes par onglets basés sur le statut (En Attente, Acceptées, Vendues, Autres)
4. QUAND le gestionnaire clique sur un onglet ALORS le système DOIT filtrer et afficher uniquement les commandes correspondant au statut sélectionné
5. QUAND la page est affichée ALORS le système DOIT présenter des boutons "Créer une Commande" et "Voir les Rapports"

### Exigence 3 - Gestion des commandes avec actions groupées

**User Story:** En tant que gestionnaire, je veux traiter les commandes en attente individuellement ou en groupe, afin d'optimiser mon temps et d'accélérer le processus de validation.

#### Critères d'acceptation

1. QUAND le gestionnaire accède à l'onglet "En Attente" ALORS le système DOIT afficher toutes les commandes avec le statut PENDING
2. QUAND le gestionnaire sélectionne une ou plusieurs commandes ALORS le système DOIT afficher une barre d'actions contextuelles
3. QUAND le gestionnaire clique sur "Accepter la sélection" ALORS le système DOIT changer le statut des commandes sélectionnées à ACCEPTED via l'API PATCH /orders/status
4. QUAND le gestionnaire clique sur "Refuser la sélection" ALORS le système DOIT changer le statut des commandes sélectionnées à DENIED
5. QUAND une action groupée est effectuée ALORS le système DOIT mettre à jour l'affichage et déplacer les commandes vers l'onglet approprié
6. QUAND des cases à cocher sont utilisées ALORS le système DOIT permettre la sélection multiple avec tri et pagination

### Exigence 4 - Transformation des commandes en ventes

**User Story:** En tant que gestionnaire, je veux transformer les commandes acceptées en ventes (crédits), afin de finaliser le processus commercial et générer les revenus.

#### Critères d'acceptation

1. QUAND le gestionnaire accède à l'onglet "Acceptées" ALORS le système DOIT afficher toutes les commandes avec le statut ACCEPTED
2. QUAND le gestionnaire clique sur une commande acceptée ALORS le système DOIT afficher les détails de la commande avec l'option "Transformer en Vente"
3. QUAND le gestionnaire clique sur "Transformer en Vente" ALORS le système DOIT afficher une modale de confirmation
4. QUAND le gestionnaire confirme la transformation ALORS le système DOIT appeler l'API POST /orders/{id}/sell pour créer un crédit
5. QUAND la transformation est réussie ALORS le système DOIT changer le statut de la commande à SOLD et la déplacer vers l'onglet "Vendues"

### Exigence 5 - Formulaire de création et modification de commandes

**User Story:** En tant que gestionnaire, je veux créer de nouvelles commandes et modifier les commandes en attente, afin de gérer proactivement les demandes clients et corriger les erreurs.

#### Critères d'acceptation

1. QUAND le gestionnaire clique sur "Créer une Commande" ALORS le système DOIT afficher un formulaire de création de commande
2. QUAND le gestionnaire remplit le formulaire ALORS le système DOIT permettre la sélection d'un client et l'ajout d'articles avec quantités via un sélecteur d'articles dédié
3. QUAND des articles sont ajoutés ALORS le système DOIT calculer et afficher automatiquement le montant total de la commande
4. QUAND le gestionnaire sauvegarde une nouvelle commande ALORS le système DOIT appeler l'API POST /orders avec le statut PENDING
5. QUAND le gestionnaire modifie une commande PENDING ALORS le système DOIT permettre la modification des articles et quantités (modification uniquement si statut PENDING)
6. QUAND le gestionnaire sauvegarde les modifications ALORS le système DOIT appeler l'API PUT /orders/{id} pour mettre à jour la commande

### Exigence 6 - Suppression locale des commandes

**User Story:** En tant que commercial, je veux supprimer une commande créée localement, afin de pouvoir corriger les erreurs avant la synchronisation avec le serveur.

#### Critères d'acceptation

1. QUAND le commercial consulte la liste des commandes ALORS le système DOIT fournir une option pour supprimer une commande (via un geste de balayage ou un menu)
2. QUAND le commercial initie une suppression ALORS le système DOIT afficher une boîte de dialogue de confirmation avant la suppression définitive
3. QUAND le commercial confirme la suppression ALORS le système DOIT supprimer la commande sélectionnée et tous ses articles associés de la base de données locale
4. QUAND la boîte de dialogue est affichée ALORS le système DOIT réutiliser le composant d'alerte standard défini dans les spécifications UI
5. QUAND une commande est supprimée ALORS le système DOIT s'assurer que cela n'affecte aucune autre entité de données comme les clients, distributions ou collectes

### Exigence 7 - Backend et synchronisation pour les commandes

**User Story:** En tant que développeur, je veux créer les nouveaux endpoints backend et la logique de synchronisation mobile pour les commandes, afin que toutes les données de commande capturées sur le terrain puissent être sauvegardées sur le serveur central.

#### Critères d'acceptation

1. QUAND les endpoints backend sont créés ALORS le système DOIT fournir de nouveaux endpoints pour gérer les opérations CRUD sur les commandes (POST, PUT, DELETE /api/v1/orders)
2. QUAND le service de synchronisation mobile est étendu ALORS le système DOIT pousser les commandes nouvelles et modifiées vers le serveur
3. QUAND une commande est supprimée localement mais existait sur le serveur ALORS le système DOIT envoyer correctement les demandes de suppression
4. QUAND une synchronisation réussit ALORS le système DOIT mettre à jour l'enregistrement de commande local avec son nouvel ID côté serveur et marquer son statut comme synchronisé
5. QUAND les endpoints sont sécurisés ALORS le système DOIT utiliser le système d'authentification et d'autorisation existant
6. QUAND la logique de synchronisation est intégrée ALORS le système DOIT s'intégrer dans les processus de synchronisation manuelle et automatique existants sans conflits

### Exigence 8 - Consultation des détails et historique de commande

**User Story:** En tant que gestionnaire, je veux consulter les détails complets d'une commande et son historique, afin de comprendre son cycle de vie et prendre des décisions éclairées.

#### Critères d'acceptation

1. QUAND le gestionnaire clique sur "Voir Détail" d'une commande ALORS le système DOIT afficher une page de détail complète
2. QUAND la page de détail se charge ALORS le système DOIT afficher les informations client, les articles commandés, le montant total et le statut actuel
3. QUAND la page de détail se charge ALORS le système DOIT afficher l'historique des changements de statut avec dates et utilisateurs
4. QUAND le gestionnaire consulte les détails ALORS le système DOIT afficher les actions contextuelles disponibles selon le statut de la commande
5. QUAND le gestionnaire navigue dans les détails ALORS le système DOIT permettre le retour facile à la liste des commandes

### Exigence 9 - Composants UI réutilisables

**User Story:** En tant que développeur, je veux créer des composants UI cohérents avec le design system existant, afin d'assurer une expérience utilisateur uniforme.

#### Critères d'acceptation

1. QUAND les KPIs sont affichés ALORS le système DOIT utiliser des cartes d'indicateurs clés réutilisables similaires au module tontine
2. QUAND la navigation par onglets est implémentée ALORS le système DOIT organiser le tableau de bord par statut avec des badges de comptage
3. QUAND le tableau de données est créé ALORS le système DOIT inclure des cases à cocher, tri et pagination avec Material Design
4. QUAND la barre d'actions contextuelles apparaît ALORS le système DOIT s'afficher uniquement lors de sélections multiples
5. QUAND les badges de statut sont utilisés ALORS le système DOIT visualiser le statut d'une commande avec des couleurs appropriées
6. QUAND les modales de confirmation sont affichées ALORS le système DOIT valider les actions importantes avec des composants réutilisables

### Exigence 10 - Consultation des détails de commande

**User Story:** En tant que commercial, je veux consulter les détails complets d'une commande, afin de vérifier les informations et effectuer les actions appropriées.

#### Critères d'acceptation

1. QUAND le commercial clique sur "Voir Détail" d'une commande ALORS le système DOIT afficher une page de détail complète
2. QUAND la page de détail se charge ALORS le système DOIT afficher les informations client, les articles commandés, le montant total et le statut actuel
3. QUAND la page de détail est consultée ALORS le système DOIT afficher les actions contextuelles disponibles (modifier, supprimer) selon le statut de la commande
4. QUAND le commercial navigue dans les détails ALORS le système DOIT permettre le retour facile à la liste des commandes
5. QUAND l'interface est développée ALORS le système DOIT maintenir la cohérence visuelle avec les autres écrans de détail de l'application

### Exigence 11 - Intégration avec l'architecture existante

**User Story:** En tant que développeur, je veux que le module commandes s'intègre harmonieusement avec l'architecture Angular existante, afin de maintenir la cohérence et la maintenabilité du code.

#### Critères d'acceptation

1. QUAND le module commandes est développé ALORS le système DOIT utiliser la même structure de services que le module tontine existant avec des patterns similaires pour l'état réactif et la gestion des erreurs
2. QUAND les composants sont créés ALORS le système DOIT suivre les mêmes conventions de nommage et d'organisation que l'existant (OrderModule, OrderService, order.types.ts)
3. QUAND les appels API sont effectués ALORS le système DOIT utiliser les mêmes patterns de gestion d'erreur et de réponse avec l'interface ApiResponse<T> standardisée
4. QUAND l'interface utilisateur est développée ALORS le système DOIT utiliser Angular Material et les mêmes composants de base que le module tontine
5. QUAND le module est intégré ALORS le système DOIT être accessible via le menu principal de navigation et suivre la même structure de routing
6. QUAND l'authentification est requise ALORS le système DOIT utiliser le TokenStorageService existant et les headers JWT Bearer comme dans TontineService

### Exigence 12 - Gestion des erreurs et feedback utilisateur

**User Story:** En tant que commercial, je veux recevoir des retours clairs sur mes actions et être informé des erreurs, afin de comprendre l'état du système et corriger les problèmes.

#### Critères d'acceptation

1. QUAND une action échoue ALORS le système DOIT afficher un message d'erreur explicite à l'utilisateur en utilisant le même système de gestion d'erreurs que TontineService
2. QUAND une action réussit ALORS le système DOIT afficher une confirmation visuelle (toast, notification) cohérente avec l'existant
3. QUAND les données se chargent ALORS le système DOIT afficher des indicateurs de chargement appropriés (MatProgressSpinnerModule)
4. QUAND une erreur réseau survient ALORS le système DOIT permettre à l'utilisateur de réessayer l'action avec des messages d'erreur contextuels selon le code de statut HTTP
5. QUAND les données sont vides ALORS le système DOIT afficher un état vide informatif avec des actions suggérées
6. QUAND les erreurs sont loggées ALORS le système DOIT utiliser le même format de logging que TontineService avec timestamp et contexte détaillé