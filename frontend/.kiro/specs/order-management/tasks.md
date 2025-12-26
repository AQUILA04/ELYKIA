# Plan d'Implémentation - Gestion des Commandes

- [x] 1. Configuration de base et structure du module


  - Créer la structure de base du module OrderModule avec les imports Angular Material nécessaires
  - Définir les interfaces TypeScript dans order.types.ts avec tous les modèles de données
  - Configurer le routing pour le module avec lazy loading
  - _Exigences: 1.4, 11.1, 11.2_



- [x] 2. Implémentation du service principal OrderService



  - [x] 2.1 Créer OrderService avec gestion d'état réactif




    - Implémenter la structure de service basée sur le pattern TontineService
    - Configurer BehaviorSubject pour l'état OrderState

    - Ajouter les méthodes de gestion d'état (updateState, setLoading, setError)

    - _Exigences: 11.1, 11.3_



  - [x] 2.2 Implémenter les méthodes CRUD de base
    - Ajouter getOrders() avec filtres et pagination
    - Implémenter createOrder() et updateOrder()



    - Ajouter deleteOrder() avec gestion des confirmations


    - Configurer les headers JWT avec TokenStorageService
    - _Exigences: 7.1, 7.2, 11.6_

  - [x] 2.3 Ajouter la gestion des statuts et actions groupées
    - Implémenter updateOrdersStatus() pour les actions groupées
    - Ajouter sellOrder() pour la transformation en crédit
    - Implémenter getKPIs() pour les indicateurs du tableau de bord
    - _Exigences: 3.3, 3.4, 4.4, 2.2_

  - [ ]* 2.4 Écrire les tests unitaires pour OrderService
    - Créer les tests pour toutes les méthodes CRUD



    - Tester la gestion d'état réactif et les transformations


    - Mocker les appels HTTP avec HttpClientTestingModule
    - _Exigences: 11.1, 12.6_



- [x] 3. Développement des composants UI de base


  - [x] 3.1 Créer OrderKpiCardComponent
    - Implémenter le composant de carte KPI réutilisable
    - Ajouter les inputs pour title, value, icon, color
    - Styliser avec Angular Material cohérent avec l'existant




    - _Exigences: 2.1, 2.2, 9.1_

  - [x] 3.2 Développer OrderTableComponent
    - Créer le tableau avec MatTable, tri et pagination
    - Ajouter les cases à cocher pour sélection multiple
    - Implémenter les colonnes configurables et actions contextuelles
    - Gérer les événements de sélection et actions
    - _Exigences: 3.1, 3.6, 9.3_

  - [x] 3.3 Implémenter OrderActionBarComponent
    - Créer la barre d'actions contextuelles pour sélections multiples






    - Ajouter les boutons Accepter, Refuser, Supprimer
    - Gérer la visibilité conditionnelle selon les sélections


    - _Exigences: 3.2, 3.4, 9.4_

  - [ ]* 3.4 Écrire les tests unitaires pour les composants UI
    - Tester le rendu et les interactions des composants
    - Vérifier les inputs/outputs et événements

    - Tester la logique de sélection multiple
    - _Exigences: 9.1, 9.3, 9.4_

- [x] 4. Implémentation du tableau de bord principal
  - [x] 4.1 Créer OrderDashboardComponent
    - Développer la page principale avec layout en sections
    - Intégrer les cartes KPI en haut de page
    - Ajouter les boutons d'actions principales (Créer, Rapports)
    - _Exigences: 2.1, 2.5_

  - [x] 4.2 Implémenter la navigation par onglets de statut
    - Créer les onglets En Attente, Acceptées, Vendues, Autres
    - Ajouter les badges de comptage sur chaque onglet
    - Gérer le filtrage automatique par statut lors du changement d'onglet
    - _Exigences: 2.3, 2.4, 9.2_


  - [x] 4.3 Intégrer le tableau et les actions groupées
    - Intégrer OrderTableComponent dans chaque onglet
    - Connecter OrderActionBarComponent pour les actions groupées
    - Gérer les états de chargement et d'erreur
    - _Exigences: 3.1, 3.2, 3.5_

  - [ ]* 4.4 Tester l'intégration du tableau de bord
    - Tester la navigation entre onglets et filtrage
    - Vérifier l'affichage des KPIs et leur mise à jour
    - Tester les actions groupées de bout en bout
    - _Exigences: 2.1, 2.3, 3.2_

- [x] 5. Développement des formulaires de commande
  - [x] 5.1 Créer OrderFormComponent pour création/modification

    - Développer le formulaire réactif avec validation
    - Implémenter la sélection de client avec autocomplete
    - Ajouter la sélection d'articles avec gestion des quantités
    - Calculer automatiquement le montant total
    - _Exigences: 5.1, 5.2, 5.3_

  - [x] 5.2 Gérer les modes création et modification

    - Implémenter la logique de pré-remplissage pour modification
    - Restreindre la modification aux commandes PENDING uniquement
    - Ajouter la validation des données et gestion d'erreurs
    - _Exigences: 5.4, 5.5, 5.6_

  - [x] 5.3 Intégrer avec les services backend

    - Connecter le formulaire avec OrderService
    - Gérer les appels API createOrder() et updateOrder()
    - Implémenter la navigation après sauvegarde réussie
    - _Exigences: 5.4, 5.5, 7.1, 7.2_

  - [ ]* 5.4 Tester les formulaires et validation
    - Tester la validation des champs et messages d'erreur
    - Vérifier les calculs automatiques de montant
    - Tester les modes création et modification
    - _Exigences: 5.1, 5.2, 5.6_

- [x] 6. Implémentation des détails et actions spécialisées
  - [x] 6.1 Créer OrderDetailsComponent


    - Développer la page de détail avec informations complètes
    - Afficher les informations client, articles et montants
    - Ajouter l'historique des changements de statut (si disponible)
    - Implémenter les actions contextuelles selon le statut
    - _Exigences: 8.1, 8.2, 8.3, 8.4_

  - [x] 6.2 Implémenter les modales de confirmation


    - Créer OrderConfirmationModalComponent pour actions groupées
    - Développer OrderSellModalComponent pour transformation en vente
    - Ajouter la validation et gestion des erreurs dans les modales
    - _Exigences: 4.3, 9.6_

  - [x] 6.3 Gérer la suppression des commandes


    - Implémenter la logique de suppression avec confirmation
    - Ajouter les options de suppression dans la liste et détails
    - Gérer les cas de suppression locale vs synchronisée
    - _Exigences: 6.1, 6.2, 6.3, 6.5_

  - [ ]* 6.4 Tester les détails et actions spécialisées
    - Tester l'affichage des détails et navigation
    - Vérifier les modales de confirmation et leurs actions
    - Tester la suppression dans différents contextes
    - _Exigences: 8.1, 8.4, 6.1_

- [x] 7. Intégration avec l'API backend et gestion d'erreurs





  - [x] 7.1 Configurer les appels API avec gestion d'erreurs


    - Implémenter la gestion d'erreurs basée sur TontineService
    - Ajouter les messages d'erreur contextuels par code HTTP
    - Configurer le logging des erreurs pour débogage
    - _Exigences: 12.1, 12.4, 12.6_

  - [x] 7.2 Implémenter les indicateurs de chargement


    - Ajouter les spinners de chargement avec MatProgressSpinner
    - Gérer les états de chargement dans tous les composants
    - Implémenter les états vides avec messages informatifs
    - _Exigences: 12.3, 12.5_

  - [x] 7.3 Tester l'intégration API complète


    - Vérifier tous les endpoints avec données réelles
    - Tester la gestion d'erreurs et recovery
    - Valider les formats de réponse ApiResponse<T>
    - _Exigences: 7.1, 7.4, 7.5, 7.6_

- [x] 8. Finalisation et intégration dans l'application





  - [x] 8.1 Intégrer le module dans l'application principale


    - Ajouter OrderModule au routing principal avec lazy loading
    - Intégrer le lien "Commandes" dans le menu de navigation
    - Configurer les guards d'authentification si nécessaire
    - _Exigences: 11.5_

  - [x] 8.2 Optimiser les performances


    - Implémenter OnPush change detection strategy
    - Ajouter les trackBy functions pour les listes
    - Optimiser les souscriptions avec takeUntil pattern
    - _Exigences: 11.1_

  - [x] 8.3 Validation finale et tests d'intégration


    - Effectuer les tests de bout en bout de tous les flux
    - Vérifier la cohérence visuelle avec l'existant
    - Tester la compatibilité avec les autres modules
    - Valider les performances et l'accessibilité
    - _Exigences: 11.2, 11.4_

  - [ ]* 8.4 Documentation et tests de régression
    - Documenter les nouveaux composants et services
    - Effectuer les tests de régression sur l'existant
    - Créer la documentation utilisateur si nécessaire
    - _Exigences: 11.1, 11.2_