# Plan d'implémentation : Rattrapage Crédit Vente

## Vue d'ensemble

Implémentation de la fonctionnalité de rattrapage crédit vente en Java (Spring Boot) pour le backend et TypeScript/Angular pour le frontend. Le flux crée un `Credit` de type rattrapage à partir d'un stock résiduel d'un mois antérieur, met à jour les quantités du stock source dans une transaction atomique, et expose un formulaire Angular en 4 étapes.

## Tâches

- [ ] 1. Backend — DTO `RattrapageCreditDto` avec Bean Validation
  - [~] 1.1 Créer la classe `RattrapageCreditDto` dans le package `com.optimize.elykia.core.dto.sale`
    - Champs : `commercial` (`@NotBlank`), `clientId` (`@NotNull`), `sourceStockId` (`@NotNull`), `beginDate` (`@NotNull`), `dailyStake` (`@NotNull @Min(200)`), `advance` (`@PositiveOrZero`, défaut `0.0`), `expectedEndDate` (optionnel), `note` (optionnel), `items` (`@NotEmpty @Valid`)
    - Inner class `RattrapageItemDto` avec `stockItemId`, `articleId`, `quantity` (`@NotNull @Positive`), `unitPrice` (`@NotNull @Positive`)
    - _Requirements: 5.1, 8.5_

- [ ] 2. Backend — Requête JPQL `findResidualStocksByCollector`
  - [~] 2.1 Ajouter la méthode `findResidualStocksByCollector` dans `CommercialMonthlyStockRepository`
    - Requête JPQL avec `SELECT DISTINCT s FROM CommercialMonthlyStock s JOIN FETCH s.items i WHERE s.collector = :collector AND (s.year < :currentYear OR (s.year = :currentYear AND s.month < :currentMonth)) AND i.quantityRemaining > 0 ORDER BY s.year DESC, s.month DESC`
    - Paramètres : `@Param("collector") String collector`, `@Param("currentMonth") int currentMonth`, `@Param("currentYear") int currentYear`
    - _Requirements: 2.3, 2.4, 2.5_

- [ ] 3. Backend — `RattrapageCreditService`
  - [~] 3.1 Créer `RattrapageCreditService` dans `com.optimize.elykia.core.service.sale` avec `@Service @Transactional`
    - Méthode publique `List<CommercialMonthlyStock> getResidualStocks(String collector)` : appelle `findResidualStocksByCollector` avec `LocalDate.now()`
    - _Requirements: 2.3, 2.4_
  - [~] 3.2 Implémenter `Credit createRattrapage(RattrapageCreditDto dto)` avec transaction atomique
    - Appeler `resolveSourceStock` : `findById(sourceStockId)`, vérifier `stock.collector == dto.commercial`, vérifier que le stock n'est pas le mois courant
    - Appeler `resolveClient(dto.clientId)` et `resolveCommercial(dto.commercial)`
    - Appeler `buildAndValidateArticles` : pour chaque item, trouver le `CommercialMonthlyStockItem`, vérifier `qty <= quantityRemaining`, construire `CreditArticles`
    - Appeler `buildCredit` : calculer `totalAmount = Σ(qty × unitPrice)`, calculer `expectedEndDate = beginDate + ceil((totalAmount - advance) / dailyStake)`, générer référence `RAT-` + 8 chars alphanumériques majuscules, créer `Credit` avec `type=CREDIT`, `status=INPROGRESS`
    - Persister le `Credit` via `creditRepository.save(credit)`
    - Appeler `updateSourceStock` : pour chaque item, incrémenter `quantitySold`, appeler `updateRemaining()`, mettre à jour `totalSoldValue += qty × unitPrice`, sauvegarder via `stockItemRepository.save(item)`
    - Cas `advance >= totalAmount` : `totalAmountRemaining = 0`, `remainingDaysCount = 0`, `expectedEndDate = beginDate`
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 8.1, 8.2, 8.3, 8.4_

- [ ] 4. Backend — `RattrapageCreditController`
  - [~] 4.1 Créer `RattrapageCreditController` dans `com.optimize.elykia.core.controller.sale`
    - `GET /api/v1/commercial-stock/residual` : `@RequestParam String collector` → appelle `service.getResidualStocks(collector)` → HTTP 200 via `ResponseUtil.successResponse`
    - `POST /api/v1/credits/rattrapage` : `@RequestBody @Valid RattrapageCreditDto dto` → appelle `service.createRattrapage(dto)` → HTTP 201 via `ResponseUtil.successResponse`
    - _Requirements: 2.2, 5.1, 5.10_

- [ ] 5. Backend — Tests unitaires `RattrapageCreditServiceTest`
  - [ ]* 5.1 Écrire les tests unitaires JUnit 5 + Mockito pour `RattrapageCreditService`
    - Cas nominal `createRattrapage` : vérifier les attributs du `Credit` créé (référence `RAT-`, type, statut, dates, montants)
    - Cas d'erreur : stock introuvable → `ResourceNotFoundException`, mauvais commercial → `CustomValidationException`, stock du mois courant → `CustomValidationException`, quantité insuffisante → `CustomValidationException` avec message article/dispo/demandé
    - Cas limite : `advance >= totalAmount` → `remainingDaysCount = 0`, `expectedEndDate = beginDate`
    - Vérification de la mise à jour du stock source (`quantitySold`, `updateRemaining()`, `totalSoldValue`)
    - Cas nominal `getResidualStocks` : vérification de l'appel au repository avec les bons paramètres de date
    - _Requirements: 2.3, 5.2, 5.3, 5.4, 5.5, 5.7, 8.4_

- [ ] 6. Backend — Tests de propriétés jqwik
  - [ ]* 6.1 Écrire le test de propriété jqwik pour la Propriété 3 (calcul date de fin)
    - `@Property(tries = 100) @Tag("Feature: rattrapage-credit-vente, Property 3: calcul date de fin")`
    - Générer `beginDate`, `dailyStake ∈ [200, 100000]`, `advance ∈ [0, 50000]`, `totalAmount ∈ [1, 100000]`
    - Vérifier : `expectedEndDate = beginDate + ceil((totalAmount - advance) / dailyStake)`
    - **Propriété 3 : Calcul de la date de fin**
    - **Valide : Requirements 4.4, 5.5, 8.2**
  - [ ]* 6.2 Écrire le test de propriété jqwik pour la Propriété 5 (invariant stock après distribution)
    - `@Property(tries = 100) @Tag("Feature: rattrapage-credit-vente, Property 5: invariant stock après distribution")`
    - Générer un `CommercialMonthlyStockItem` et une quantité `qty ∈ [1, quantityRemaining]`
    - Vérifier après `updateRemaining()` : `quantitySold + quantityRemaining = quantityTaken - quantityReturned`
    - **Propriété 5 : Invariant de stock après distribution**
    - **Valide : Requirements 5.7, 8.1**
  - [ ]* 6.3 Écrire le test de propriété jqwik pour la Propriété 6 (rejet sur-distribution)
    - `@Property(tries = 100) @Tag("Feature: rattrapage-credit-vente, Property 6: rejet sur-distribution")`
    - Générer un item avec `quantityRemaining = R` et une quantité demandée `qty > R`
    - Vérifier : `createRattrapage` lève `CustomValidationException` sans aucune persistance
    - **Propriété 6 : Rejet de sur-distribution**
    - **Valide : Requirements 5.4**
  - [ ]* 6.4 Écrire le test de propriété jqwik pour la Propriété 7 (unicité et format référence)
    - `@Property(tries = 100) @Tag("Feature: rattrapage-credit-vente, Property 7: unicité référence RAT-")`
    - Générer N DTOs valides distincts, appeler la méthode de génération de référence N fois
    - Vérifier : chaque référence commence par `"RAT-"` suivi de 8 chars alphanumériques majuscules, toutes les références sont distinctes
    - **Propriété 7 : Unicité et format de la référence**
    - **Valide : Requirements 5.6**
  - [ ]* 6.5 Écrire le test de propriété jqwik pour la Propriété 8 (atomicité transactionnelle)
    - `@Property(tries = 100) @Tag("Feature: rattrapage-credit-vente, Property 8: atomicité transactionnelle")`
    - Simuler une erreur après `creditRepository.save` mais avant la fin de `updateSourceStock`
    - Vérifier : aucune modification visible en base (rollback complet)
    - **Propriété 8 : Atomicité transactionnelle**
    - **Valide : Requirements 5.9**

- [ ] 7. Checkpoint — Vérifier que tous les tests backend passent
  - S'assurer que tous les tests unitaires et de propriétés backend passent. Demander à l'utilisateur si des questions se posent.

- [ ] 8. Frontend — `RattrapageCreditService` Angular
  - [~] 8.1 Créer `RattrapageCreditService` dans `src/app/stock/services/rattrapage-credit.service.ts`
    - `getResidualStocks(collector: string): Observable<CommercialMonthlyStock[]>` → `GET /api/v1/commercial-stock/residual?collector={collector}`
    - `createRattrapage(dto: RattrapageCreditDto): Observable<any>` → `POST /api/v1/credits/rattrapage`
    - Déclarer les interfaces `RattrapageCreditDto` et `RattrapageItemDto` dans le même fichier ou dans un fichier de modèles dédié
    - _Requirements: 2.1, 6.1_

- [ ] 9. Frontend — `RattrapageCreditAddComponent` (logique TypeScript)
  - [~] 9.1 Créer `RattrapageCreditAddComponent` dans `src/app/stock/rattrapage/`
    - Déclarer les propriétés d'état : `currentStep` (1–4), `isLoading`, `loadingMonths`, `isPromoter`, `isManager`
    - Déclarer les propriétés de données : `commercials`, `clients`, `residualStocks`, `selectedItems`
    - Déclarer les propriétés de calcul : `totalAmount`, `remainingAmount`, `computedEndDate`, `computedDays`
    - Injecter `RattrapageCreditService`, `ClientService`, `AuthService`/`UserService`, `ToastrService`, `Router`
    - _Requirements: 1.1, 1.2, 1.3_
  - [~] 9.2 Implémenter `ngOnInit` : détecter le profil (`isPromoter`, `isManager`), pré-remplir le commercial si `PROMOTER`, charger la liste des commerciaux si gestionnaire
    - _Requirements: 1.1, 1.2_
  - [~] 9.3 Implémenter `onCommercialChange()` et `loadResidualStocks(username)` : appeler `getResidualStocks`, gérer le cas liste vide avec message "Aucun stock résiduel trouvé pour ce commercial."
    - _Requirements: 2.1, 2.6, 2.7_
  - [~] 9.4 Implémenter `onStockMonthSelect(stock)` : sélectionner le stock, passer à l'étape 3
    - _Requirements: 2.8_
  - [~] 9.5 Implémenter `toggleArticle(item, event)` et `onQtyChange(item, event)` : gérer la sélection/désélection, initialiser qty à 1 à la coche, valider `0 < qty <= quantityRemaining`, conserver la dernière valeur valide si dépassement
    - _Requirements: 3.3, 3.4, 3.5_
  - [~] 9.6 Implémenter `recalculateTotals()` : calculer `totalAmount = Σ(qty × lastUnitPrice)` et les sous-totaux par article
    - _Requirements: 3.6_
  - [~] 9.7 Implémenter `recalculateEndDate()` : calculer `computedEndDate = beginDate + ceil((totalAmount - advance) / dailyStake)` et `computedDays`
    - _Requirements: 4.4, 4.5, 4.6_
  - [~] 9.8 Implémenter `onSubmit()` : valider le formulaire, marquer les champs `touched` si invalide + `toastr.warning`, appeler `createRattrapage`, gérer succès (toastr + navigate `/credit-list`) et erreur (toastr.error sans navigation), gérer le spinner
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 10. Frontend — Template HTML du composant
  - [~] 10.1 Créer le template `rattrapage-credit-add.component.html` avec la structure en 4 étapes
    - Étape 1 : dropdown commercial (conditionnel profil gestionnaire) + dropdown client avec recherche
    - Étape 2 : cartes cliquables des stocks résiduels (nom mois, année, nb articles, qty totale, valeur estimée) + message si liste vide
    - Étape 3 : liste des articles avec checkbox, champ qty, prix unitaire, sous-total en temps réel + total général
    - Étape 4 : champs date début, mise journalière (min 200), avance (≥ 0), date fin calculée (readonly + badge "Auto"), nb jours (readonly), note optionnelle, récapitulatif complet
    - Section "Retour en magasin" avec style dashed/désactivé, badge "Prochainement", `pointer-events: none`
    - Bouton "Valider le rattrapage" avec spinner et désactivation pendant traitement
    - _Requirements: 1.4, 2.6, 2.7, 3.1, 3.2, 3.6, 4.1, 4.2, 4.3, 4.5, 4.7, 4.8, 6.5, 7.1, 7.2, 7.3_

- [ ] 11. Frontend — Routing et bouton d'accès depuis `credit-list`
  - [~] 11.1 Ajouter la route `{ path: 'credit/rattrapage', component: RattrapageCreditAddComponent, canActivate: [AuthGuard], data: { title: 'Distribution de rattrapage' } }` dans le module de routing concerné
    - _Requirements: 6.6_
  - [~] 11.2 Ajouter un bouton "Rattrapage stock antérieur" dans le template de `credit-list` visible pour les profils `PROMOTER`, `GESTIONNAIRE` et `ADMIN`, naviguant vers `/credit/rattrapage`
    - _Requirements: 6.7_

- [ ] 12. Frontend — Tests unitaires Jest du composant
  - [ ]* 12.1 Écrire les tests unitaires Jest pour `RattrapageCreditAddComponent`
    - Affichage conditionnel du dropdown commercial selon le profil (`PROMOTER` vs gestionnaire)
    - Calcul de la date de fin en temps réel via `recalculateEndDate()`
    - Validation des quantités : rejet si `qty > quantityRemaining`, conservation de la dernière valeur valide
    - Navigation vers `/credit-list` après succès de `onSubmit()`
    - Affichage du message d'erreur backend sans navigation en cas d'échec
    - _Requirements: 1.1, 1.2, 3.4, 3.5, 4.4, 6.3, 6.4_
  - [ ]* 12.2 Écrire les tests unitaires Jest pour `RattrapageCreditService` (frontend)
    - Vérifier les appels HTTP `GET /api/v1/commercial-stock/residual` et `POST /api/v1/credits/rattrapage` avec `HttpClientTestingModule`
    - _Requirements: 2.1, 6.1_

- [ ] 13. Frontend — Tests de propriétés fast-check
  - [ ]* 13.1 Écrire le test de propriété fast-check pour la Propriété 3 (calcul date de fin)
    - `// Feature: rattrapage-credit-vente, Property 3: calcul date de fin`
    - `fc.assert(fc.property(fc.date(), fc.float({ min: 200 }), fc.float({ min: 0 }), fc.float({ min: 1 }), ...))`
    - Vérifier que `recalculateEndDate()` produit `beginDate + ceil((totalAmount - advance) / dailyStake)` pour toute combinaison valide, 100 itérations
    - **Propriété 3 : Calcul de la date de fin**
    - **Valide : Requirements 4.4, 5.5, 8.2**
  - [ ]* 13.2 Écrire le test de propriété fast-check pour la Propriété 10 (calcul du total en temps réel)
    - `// Feature: rattrapage-credit-vente, Property 10: calcul du total en temps réel`
    - `fc.assert(fc.property(fc.array(fc.record({ qty: fc.integer({ min: 1 }), price: fc.float({ min: 0 }) })), ...))`
    - Vérifier que `recalculateTotals()` produit `Σ(qty × price)` et que chaque sous-total vaut `qty × price`, 100 itérations
    - **Propriété 10 : Calcul du total en temps réel**
    - **Valide : Requirements 3.6**

- [ ] 14. Checkpoint final — Vérifier que tous les tests passent
  - S'assurer que tous les tests unitaires et de propriétés (backend et frontend) passent. Demander à l'utilisateur si des questions se posent.

## Notes

- Les tâches marquées `*` sont optionnelles et peuvent être ignorées pour un MVP rapide
- Chaque tâche référence les requirements spécifiques pour la traçabilité
- Les tests de propriétés valident les invariants universels définis dans le design
- Les tests unitaires valident les exemples spécifiques et les cas limites
- Le backend utilise Java (Spring Boot, JUnit 5, Mockito, jqwik)
- Le frontend utilise TypeScript (Angular, Jest, fast-check)
