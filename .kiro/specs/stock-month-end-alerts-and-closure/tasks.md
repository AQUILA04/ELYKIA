# Tasks — Alertes Fin de Mois et Clôture Automatique du Stock

## Backend

- [ ] 1. Ajouter le champ `status` à l'entité `CommercialMonthlyStock`
  - [ ] 1.1 Ajouter le champ `status` (enum : ACTIVE, CLOSED) à la classe `CommercialMonthlyStock`
  - [ ] 1.2 Initialiser `status = ACTIVE` par défaut
  - [ ] 1.3 Créer la migration Liquibase/Flyway pour ajouter la colonne `status`

- [ ] 2. Créer l'utilitaire `MonthEndCalculator` (backend)
  - [ ] 2.1 Créer la classe `MonthEndCalculator` dans `com.optimize.elykia.core.util`
  - [ ] 2.2 Implémenter `getDaysUntilMonthEnd()` : calcule le nombre de jours restants jusqu'à la fin du mois
  - [ ] 2.3 Implémenter `isInLastFiveDaysOfMonth()` : retourne true si `daysUntilMonthEnd <= 5`
  - [ ] 2.4 Implémenter `getNextMonthDate()` : retourne le mois et l'année du mois prochain

- [ ] 3. Modifier le service `CommercialMonthlyStockService`
  - [ ] 3.1 Ajouter la méthode `getDaysUntilMonthEnd()` : utilise `MonthEndCalculator`
  - [ ] 3.2 Ajouter la méthode `closeCurrentMonthStock(String collector)` : marque le stock du mois courant comme CLOSED
  - [ ] 3.3 Ajouter la validation : vérifier que le stock n'est pas déjà clôturé avant de le clôturer

- [ ] 4. Modifier le service `StockRequestService`
  - [ ] 4.1 Modifier la méthode `createStockRequest(StockRequestDto dto, boolean forNextMonth)` pour accepter le flag `forNextMonth`
  - [ ] 4.2 Si `forNextMonth = true` : clôturer le stock du mois courant et créer la demande pour le mois prochain
  - [ ] 4.3 Si `forNextMonth = false` : créer la demande pour le mois courant (comportement par défaut)
  - [ ] 4.4 Implémenter la logique de calcul du mois prochain (month+1, year ou year+1 si décembre)
  - [ ] 4.5 Implémenter la création automatique du stock du mois prochain s'il n'existe pas
  - [ ] 4.6 Assurer l'atomicité : clôture et création dans une transaction unique

- [ ] 5. Modifier le controller `StockRequestController`
  - [ ] 5.1 Modifier l'endpoint `POST /api/v1/stock-requests` pour accepter le champ `forNextMonth` dans le DTO
  - [ ] 5.2 Passer le flag `forNextMonth` au service

- [ ] 6. Ajouter les validations backend
  - [ ] 6.1 Vérifier que le stock du mois courant existe avant de le clôturer
  - [ ] 6.2 Vérifier que le stock du mois courant n'est pas déjà clôturé
  - [ ] 6.3 Vérifier que le mois prochain est correctement calculé
  - [ ] 6.4 Retourner HTTP 400 si une validation échoue

- [ ] 7. Tests backend
  - [ ] 7.1 Créer `MonthEndCalculatorTest` : tester le calcul pour différentes dates (début, milieu, fin de mois, années bissextiles)
  - [ ] 7.2 Créer `CommercialMonthlyStockServiceTest` : tester `getDaysUntilMonthEnd()` et `closeCurrentMonthStock()`
  - [ ] 7.3 Créer `StockRequestServiceTest` : tester création avec `forNextMonth = false` et `forNextMonth = true`, vérifier atomicité
  - [ ] 7.4 Créer `StockRequestControllerIT` : tester les deux scénarios avec MockMvc
  - [ ] 7.5 Créer les tests de propriétés jqwik : Property 1 (calcul jours), Property 4 (clôture atomique)

## Frontend

- [ ] 8. Créer l'utilitaire `MonthEndCalculator` (frontend)
  - [ ] 8.1 Créer la classe `MonthEndCalculator` dans `src/app/shared/utils/month-end-calculator.ts`
  - [ ] 8.2 Implémenter `getDaysUntilMonthEnd()` : calcule le nombre de jours restants jusqu'à la fin du mois
  - [ ] 8.3 Implémenter `isInLastFiveDaysOfMonth()` : retourne true si `daysUntilMonthEnd <= 5`
  - [ ] 8.4 Implémenter `getNextMonthDate()` : retourne le mois et l'année du mois prochain

- [ ] 9. Créer le composant `AlerteFinMoisComponent`
  - [ ] 9.1 Générer le composant dans `src/app/stock/components/alerte-fin-mois/`
  - [ ] 9.2 Ajouter les `@Input() daysRemaining` et `@Input() showAlert`
  - [ ] 9.3 Implémenter la logique d'affichage du message selon le nombre de jours
  - [ ] 9.4 Ajouter les styles CSS pour l'alerte (warning/danger, icône, etc.)

- [ ] 10. Créer le composant `OptionMoisProchainComponent`
  - [ ] 10.1 Générer le composant dans `src/app/stock/components/option-mois-prochain/`
  - [ ] 10.2 Ajouter les `@Input() daysRemaining`, `@Input() isVisible`
  - [ ] 10.3 Ajouter l'`@Output() selectNextMonth` pour émettre le choix de l'utilisateur
  - [ ] 10.4 Implémenter les deux boutons "Mois courant" et "Mois prochain"

- [ ] 11. Modifier `MyStockDashboardComponent`
  - [ ] 11.1 Ajouter les propriétés `daysUntilMonthEnd`, `showMonthEndAlert`
  - [ ] 11.2 Implémenter `calculateDaysUntilMonthEnd()` : utilise `MonthEndCalculator`
  - [ ] 11.3 Appeler `calculateDaysUntilMonthEnd()` dans `ngOnInit()`
  - [ ] 11.4 Ajouter le composant `<app-alerte-fin-mois>` dans le template avec les bonnes entrées

- [ ] 12. Modifier `StockRequestCreateComponent`
  - [ ] 12.1 Ajouter les propriétés `daysUntilMonthEnd`, `showMonthEndAlert`, `showNextMonthOption`, `forNextMonth`
  - [ ] 12.2 Implémenter `calculateDaysUntilMonthEnd()` : utilise `MonthEndCalculator`
  - [ ] 12.3 Appeler `calculateDaysUntilMonthEnd()` dans `ngOnInit()`
  - [ ] 12.4 Ajouter le composant `<app-alerte-fin-mois>` dans le template
  - [ ] 12.5 Ajouter le composant `<app-option-mois-prochain>` dans le template
  - [ ] 12.6 Implémenter `onSelectNextMonth(forNext: boolean)` : met à jour `forNextMonth`
  - [ ] 12.7 Modifier `onSubmit()` : passer le flag `forNextMonth` au service

- [ ] 13. Modifier le service `StockRequestService` (frontend)
  - [ ] 13.1 Modifier la méthode `createStockRequest(dto, forNextMonth)` pour passer le flag au backend
  - [ ] 13.2 Ajouter le champ `forNextMonth` au DTO avant l'appel HTTP

- [ ] 14. Modifier le DTO `StockRequestDto` (frontend)
  - [ ] 14.1 Ajouter le champ optionnel `forNextMonth?: boolean` au DTO TypeScript

- [ ] 15. Tests frontend
  - [ ] 15.1 Créer `MonthEndCalculator.spec.ts` : tester le calcul pour différentes dates
  - [ ] 15.2 Créer `AlerteFinMoisComponent.spec.ts` : tester l'affichage selon le nombre de jours
  - [ ] 15.3 Créer `OptionMoisProchainComponent.spec.ts` : tester la visibilité et l'émission d'événement
  - [ ] 15.4 Modifier `MyStockDashboardComponent.spec.ts` : tester le calcul et l'affichage de l'alerte
  - [ ] 15.5 Modifier `StockRequestCreateComponent.spec.ts` : tester le calcul, l'affichage de l'alerte et de l'option, l'appel du service
  - [ ] 15.6 Créer les tests de propriétés fast-check : Property 1 (calcul jours)

- [ ] 16. Intégration et vérification
  - [ ] 16.1 Vérifier que l'alerte s'affiche correctement dans le dashboard
  - [ ] 16.2 Vérifier que l'alerte et l'option s'affichent correctement dans la création de demande
  - [ ] 16.3 Vérifier que la clôture du stock fonctionne correctement
  - [ ] 16.4 Vérifier que la demande est créée pour le mois prochain avec les bonnes dates
  - [ ] 16.5 Vérifier que les validations backend fonctionnent correctement
