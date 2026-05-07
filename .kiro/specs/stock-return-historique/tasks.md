# Tasks — Retour en Stock Historique

## Backend

- [ ] 1. Créer l'entité `StockReturn` et `StockReturnItem`
  - [ ] 1.1 Créer la classe `StockReturn` dans `com.optimize.elykia.core.model.stock` avec les champs `id`, `reference`, `collector`, `targetStock`, `returnDate`, `note`, `items`, `createdAt`
  - [ ] 1.2 Créer la classe `StockReturnItem` avec les champs `id`, `stockReturn`, `stockItem`, `article`, `quantity`, `unitPrice`
  - [ ] 1.3 Ajouter les annotations JPA (`@Entity`, `@Table`, `@OneToMany`, `@ManyToOne`, etc.)
  - [ ] 1.4 Créer les migrations Liquibase/Flyway pour les nouvelles tables

- [ ] 2. Créer le DTO `StockReturnDto`
  - [ ] 2.1 Créer `StockReturnDto` dans le package DTO avec les champs `commercial`, `targetStockId`, `returnDate`, `note`, `items`
  - [ ] 2.2 Créer l'inner class `StockReturnItemDto` avec `stockItemId`, `articleId`, `quantity`, `unitPrice`
  - [ ] 2.3 Ajouter les annotations Bean Validation (`@NotBlank`, `@NotNull`, `@Positive`, `@NotEmpty`, `@Valid`)

- [ ] 3. Créer le repository `StockReturnRepository`
  - [ ] 3.1 Créer l'interface `StockReturnRepository extends JpaRepository<StockReturn, Long>`
  - [ ] 3.2 Ajouter une méthode `existsByReference(String reference)` pour garantir l'unicité

- [ ] 4. Créer le service `StockReturnService`
  - [ ] 4.1 Créer la classe `StockReturnService` annotée `@Service @Transactional`
  - [ ] 4.2 Implémenter `createHistoriqueReturn(StockReturnDto dto)` : résolution du stock cible, validation du commercial, validation des quantités, construction du `StockReturn`, mise à jour des items
  - [ ] 4.3 Implémenter `generateReference()` : génère `RET-` + 8 caractères alphanumériques majuscules aléatoires, avec vérification d'unicité en base
  - [ ] 4.4 Implémenter la validation : stock cible existe, appartient au commercial, n'est pas le mois courant, quantités disponibles suffisantes
  - [ ] 4.5 Implémenter la mise à jour du stock : `stockItem.quantityReturned += qty`, `stockItem.updateRemaining()`

- [ ] 5. Créer le controller `StockReturnController`
  - [ ] 5.1 Créer la classe `StockReturnController` dans `com.optimize.elykia.core.controller.stock`
  - [ ] 5.2 Implémenter `POST /api/v1/stock-returns/historique` avec `@RequestBody @Valid StockReturnDto`
  - [ ] 5.3 Retourner HTTP 201 avec `ResponseUtil.successResponse(stockReturn)`
  - [ ] 5.4 Ajouter la sécurité Spring Security (rôles autorisés : `PROMOTER`, `GESTIONNAIRE`, `ADMIN`, `SUPER_ADMIN`, `SECRETARY`)

- [ ] 6. Tests backend
  - [ ] 6.1 Créer `StockReturnServiceTest` (JUnit 5 + Mockito) : cas nominal, stock introuvable, mauvais commercial, stock du mois courant, quantité insuffisante, vérification invariant stock
  - [ ] 6.2 Créer `StockReturnControllerIT` (Spring Boot Test + MockMvc) : POST 201, validation 400, stock courant 400
  - [ ] 6.3 Créer les tests de propriétés jqwik : Property 3 (invariant stock), Property 5 (unicité référence RET-)

## Frontend

- [ ] 7. Créer les interfaces TypeScript
  - [ ] 7.1 Créer `StockReturnDto` et `StockReturnItemDto` dans le fichier de modèles approprié
  - [ ] 7.2 Créer l'interface `ReturnSelectedItem` pour l'état interne du composant

- [ ] 8. Créer le service `StockReturnService` (frontend)
  - [ ] 8.1 Créer `StockReturnService` dans `src/app/stock/services/stock-return.service.ts`
  - [ ] 8.2 Implémenter `getHistoricalStocks(collector: string)` : appel `GET /api/v1/commercial-stock/residual?collector={collector}`
  - [ ] 8.3 Implémenter `createHistoriqueReturn(dto: StockReturnDto)` : appel `POST /api/v1/stock-returns/historique`

- [ ] 9. Créer le composant `StockReturnHistoriqueComponent`
  - [ ] 9.1 Générer le composant dans `src/app/stock/stock-return/`
  - [ ] 9.2 Implémenter l'étape 1 : sélection du commercial (dropdown pour gestionnaire, auto-rempli pour promoter)
  - [ ] 9.3 Implémenter l'étape 2 : chargement et affichage des stocks historiques en cartes cliquables, message si aucun stock
  - [ ] 9.4 Implémenter l'étape 3 : sélection des articles avec validation des quantités, calcul du total en temps réel
  - [ ] 9.5 Implémenter l'étape 4 (confirmation) : champ date du retour, note optionnelle, récapitulatif complet
  - [ ] 9.6 Implémenter `onSubmit()` : validation, appel service, spinner, toastr succès/erreur, navigation vers `/stock/my-stock`
  - [ ] 9.7 Implémenter la navigation entre étapes avec validation de chaque étape avant progression

- [ ] 10. Routing et accès
  - [ ] 10.1 Ajouter la route `/stock/return/historique` dans `stock-routing.module.ts` avec `AuthGuard`
  - [ ] 10.2 Ajouter le bouton "Retour stock antérieur" dans `my-stock-dashboard.component.html` visible pour `PROMOTER`, `GESTIONNAIRE`, `ADMIN`

- [ ] 11. Tests frontend
  - [ ] 11.1 Créer `StockReturnHistoriqueComponent.spec.ts` : affichage conditionnel selon profil, validation quantités, calcul total, navigation
  - [ ] 11.2 Créer `StockReturnService.spec.ts` : appels HTTP avec `HttpClientTestingModule`
  - [ ] 11.3 Créer les tests de propriétés fast-check : Property 8 (calcul total en temps réel)
