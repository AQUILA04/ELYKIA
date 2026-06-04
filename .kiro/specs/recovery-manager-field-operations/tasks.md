# Plan d'implémentation : Recovery Manager Field Operations

## Vue d'ensemble

Implémentation de la fonctionnalité "Chef de Recouvrement - Opérations Terrain" dans ELYKIA. Ce développement permet au rôle `RECOVERY_MANAGER` (Chef de Recouvrement) de sélectionner et de clôturer (partiellement ou totalement) des crédits en retard depuis l'interface web, d'auditer ces actions dans une table `recovery_manager_operation`, d'ajuster dynamiquement le rapport journalier du commercial rattaché (`collectionsAmount`, `recoveryManagerCollectionsAmount`, `totalAmountToDeposit`), et de consulter/exporter un rapport de recouvrement dédié.

## Tâches

### Phase 1 : Base de Données et Sécurité

- [ ] 1. Migration SQL de base de données Flyway
  - [ ] 1.1 Créer le fichier de migration `V41__create_recovery_manager_operation.sql` sous `backend/src/main/resources/db/migration/`
  - [ ] 1.2 Écrire la structure de la table `recovery_manager_operation` incluant la clé primaire, les usernames, `credit_id`, `credit_timeline_id`, les montants (amount_collected, original_amount_remaining), `is_partial`, la date de l'opération, la référence unique (`reference`) et les champs d'audit standard de `BaseEntity`
  - [ ] 1.3 Ajouter la colonne `recovery_manager_collections_amount` (double precision, valeur par défaut 0) à la table `daily_commercial_report`
  - [ ] 1.4 Créer les index `idx_rmo_recovery_manager`, `idx_rmo_commercial` et `idx_rmo_credit`
  - _Requirements: 3.1, 3.4, 6.4_

- [ ] 2. Sécurité & Rôle Backend
  - [ ] 2.1 Définir la constante du rôle dans `com.optimize.elykia.core.util.UserPermissionConstant.java` :
    `public static final String RECOVERY_MANAGER = "ROLE_RECOVERY_MANAGER";`
  - _Requirements: 1.1, 5.1, 5.4, 5.5_

---

### Phase 2 : Modèles Backend et Repositories

- [ ] 3. Entité JPA `RecoveryManagerOperation`
  - [ ] 3.1 Créer la classe `RecoveryManagerOperation` dans `com.optimize.elykia.core.entity.sale` qui hérite de `BaseEntity<String>`
  - [ ] 3.2 Mapper tous les champs avec les annotations `@Column`, `@Id`, `@GeneratedValue(strategy = GenerationType.IDENTITY)`
  - _Requirements: 3.1_

- [ ] 4. Repository JPA `RecoveryManagerOperationRepository`
  - [ ] 4.1 Créer l'interface `RecoveryManagerOperationRepository` dans `com.optimize.elykia.core.repository.sale` étendant `BaseRepository<RecoveryManagerOperation, Long, Long>`
  - [ ] 4.2 Ajouter la méthode d'unicité journalière par crédit :
    `boolean existsByCreditIdAndOperationDate(Long creditId, LocalDate operationDate)`
  - [ ] 4.3 Ajouter des requêtes d'agrégation ou de sélection paginée pour récupérer le résumé du rapport journalier (somme collectée, nombre d'opérations, décompte des commerciaux, et répartition par commercial)
  - _Requirements: 3.1, 5.2, 5.3, 6.3_

- [ ] 5. Modification du Rapport Journalier
  - [ ] 5.1 Ajouter l'attribut `recoveryManagerCollectionsAmount` (avec initialisation à `0.0` et annotations JPA `@Column(columnDefinition = "double precision default 0")`) dans `com.optimize.elykia.core.entity.report.DailyCommercialReport.java`
  - [ ] 5.2 Générer les getters/setters correspondants
  - _Requirements: 3.4, 6.4_

- [ ] 6. Création des DTOs Backend
  - [ ] 6.1 Créer `CloseCreditsRequestDto` et `CreditCloseItemDto` dans `com.optimize.elykia.core.dto.sale` avec les contraintes d'annotation `@NotEmpty`, `@NotNull`, `@Positive`
  - [ ] 6.2 Créer `RecoveryManagerReportSummaryDto` et `CommercialRemittanceDto` pour encapsuler les résultats du rapport consolidé du chef de recouvrement
  - _Requirements: 2.6, 5.1, 5.3_

---

### Phase 3 : Logique Métier Backend (Services)

- [ ] 7. Adaptation de `CreditTimelineService`
  - [ ] 7.1 Modifier `dailyStakeFactor` dans `CreditTimelineService.java` pour ne pas écraser `collector` si celui-ci a été explicitement pré-rempli dans l'objet `CreditTimeline` (garder la valeur passée pour le chef de recouvrement au lieu de forcer `credit.getCollector()`)
  - _Requirements: 3.2_

- [ ] 8. Service `RecoveryManagerService`
  - [ ] 8.1 Créer `RecoveryManagerService` dans `com.optimize.elykia.core.service.sale` annoté avec `@Service` et `@Transactional`
  - [ ] 8.2 Implémenter la méthode principale `closeCredits(List<CreditCloseItemDto> items, String recoveryManagerUsername)` :
    - Valider l'état du crédit (status `INPROGRESS`, date fin dépassée)
    - Empêcher les doublons (lever une exception si déjà clôturé aujourd'hui)
    - Appeler `creditTimelineService.makeDailyStake` en pré-remplissant le `collector` avec le username du chef de recouvrement
    - Créer l'entrée `RecoveryManagerOperation` avec une référence unique formatée `RMO-YYYYMMDD-XXX`
    - Mettre à jour `DailyCommercialReport` du commercial rattaché en incrémentant `collectionsCount`, `collectionsAmount`, `recoveryManagerCollectionsAmount` et `totalAmountToDeposit`
    - Encapsuler la réponse de succès ou remonter les erreurs partielles en listant le `creditId` en erreur
  - [ ] 8.3 Implémenter `getOperations(LocalDate startDate, LocalDate endDate, String recoveryManagerUsername, Pageable pageable)`
  - [ ] 8.4 Implémenter `getReportSummary(LocalDate startDate, LocalDate endDate, String recoveryManagerUsername)`
  - _Requirements: 2.6, 2.8, 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 6.1, 6.3, 6.4_

- [ ] 9. Service de Rapport PDF `RecoveryManagerReportPdfService`
  - [ ] 9.1 Créer `RecoveryManagerReportPdfService` dans `com.optimize.elykia.core.service.report`
  - [ ] 9.2 Créer le template HTML de rapport `recovery-manager-report-export.html` sous `backend/src/main/resources/templates/`
  - [ ] 9.3 Utiliser Thymeleaf `TemplateEngine` et iText `HtmlConverter` pour générer le flux binaire PDF
  - _Requirements: 4.7, 5.4_

---

### Phase 4 : Endpoints REST Backend

- [ ] 10. Contrôleur REST `RecoveryManagerController`
  - [ ] 10.1 Créer `RecoveryManagerController` dans `com.optimize.elykia.core.controller.sale`
  - [ ] 10.2 Exposer `POST /api/v1/recovery-manager/close-credits` sécurisé par `@PreAuthorize("hasRole('ROLE_RECOVERY_MANAGER')")`
  - [ ] 10.3 Exposer `GET /api/v1/recovery-manager/operations` sécurisé par `@PreAuthorize("hasAnyRole('ROLE_RECOVERY_MANAGER', 'ROLE_MANAGER', 'ROLE_ADMIN')")`
  - [ ] 10.4 Exposer `GET /api/v1/recovery-manager/report/summary` sécurisé par `@PreAuthorize("hasAnyRole('ROLE_RECOVERY_MANAGER', 'ROLE_MANAGER', 'ROLE_ADMIN')")`
  - [ ] 10.5 Exposer `GET /api/v1/recovery-manager/report/pdf` sécurisé par `@PreAuthorize("hasAnyRole('ROLE_RECOVERY_MANAGER', 'ROLE_MANAGER', 'ROLE_ADMIN')")`
  - [ ] 10.6 Structurer systématiquement les réponses à l'aide du constructeur unifié `Response.builder()` :
    `Response.builder().status(HttpStatus.OK).statusCode(HttpStatus.OK.value()).message("default.message.success").service("OPTIMIZE-SERVICE").data(data).build();`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

---

### Phase 5 : Validation et Tests Backend

- [ ] 11. Tests Unitaires Backend (JUnit 5 + Mockito)
  - [ ] 11.1 Écrire `RecoveryManagerServiceTest` pour couvrir :
    - Le cas nominal (recouvrement complet et partiel)
    - Les cas limites (montants partiels invalides supérieurs au restant, ou égaux à 0)
    - Les rejets de doublons (fermeture deux fois le même jour)
    - La bonne mise à jour des cumuls du rapport commercial (Property 1, 5)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.3, 6.4_

- [ ] 12. Tests de Propriétés Backend (jqwik)
  - [ ] 12.1 Écrire les propriétés de correction :
    - Propriété 1 (Conservation des totaux commerciaux) : `collectionsAmount >= recoveryManagerCollectionsAmount`
    - Propriété 3 (Montant partiel borné) : `0 < amountCollected < originalAmountRemaining`
    - Propriété 4 (Unicité journalière) : refus de double opération
  - _Requirements: 3.1, 3.4, 6.3, 6.4_

---

### Phase 6 : Service Frontend Angular

- [ ] 13. Service Angular `RecoveryManagerService`
  - [ ] 13.1 Créer `recovery-manager.service.ts` dans `frontend/src/app/credit/services/`
  - [ ] 13.2 Implémenter les méthodes `closeCredits`, `getOperations`, `getReportSummary` et `downloadReportPdf` avec appels HTTP appropriés
  - [ ] 13.3 Déclarer les interfaces TypeScript correspondantes
  - _Requirements: 2.6, 5.1, 5.2, 5.3, 5.4_

---

### Phase 7 : Composants de la Table des Crédits en retard

- [ ] 14. Modifications dans `CreditLateTableComponent`
  - [ ] 14.1 Ouvrir `credit-late-table.component.ts` et ajouter les `@Input() isRecoveryManager` et `@Output()` pour les événements de sélection et d'action individuelle
  - [ ] 14.2 Modifier `credit-late-table.component.html` pour ajouter une première colonne conditionnelle de checkbox (si `isRecoveryManager`) et une dernière colonne d'action avec bouton icône de clôture
  - [ ] 14.3 S'assurer de NE PAS supprimer la propriété `standalone: false` du décorateur `@Component`
  - _Requirements: 1.1, 1.4_

- [ ] 15. Modifications dans `CreditLateComponent`
  - [ ] 15.1 Adapter `credit-late.component.ts` pour détecter le rôle `RECOVERY_MANAGER`
  - [ ] 15.2 Implémenter la logique de suivi de sélection multiple (credits sélectionnés, montant total cumulé)
  - [ ] 15.3 Ajouter la barre d'action flottante `bulk-action-bar` dans `credit-late.component.html` affichant les détails et le bouton "Clôturer la sélection"
  - [ ] 15.4 S'assurer de NE PAS supprimer la propriété `standalone: false` du décorateur `@Component`
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

---

### Phase 8 : Modal de Confirmation de Clôture

- [ ] 16. Création de `CreditLateCloseModalComponent`
  - [ ] 16.1 Créer le composant dans `frontend/src/app/credit/credit-late/components/credit-late-close-modal/`
  - [ ] 16.2 Intégrer la liste des crédits sélectionnés avec leur commercial et montant restant
  - [ ] 16.3 Implémenter le toggle "Recouvrement partiel" et le champ numérique de saisie
  - [ ] 16.4 Ajouter les validations en temps réel (montant > 0 et <= restant), les messages d'erreur et la mise à jour dynamique des montants cumulés
  - [ ] 16.5 Lier le bouton "Confirmer" à l'appel API via le service frontend, et rafraîchir la liste parente sur succès
  - [ ] 16.6 Veiller à inclure la propriété `standalone: false` sur le décorateur `@Component`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

---

### Phase 9 : Rapport de Recouvrement Terrain (Frontend)

- [ ] 17. Composant d'onglet de rapport `RecoveryManagerReportTabComponent`
  - [ ] 17.1 Créer le composant d'onglet dans `frontend/src/app/report/components/recovery-manager-report-tab/`
  - [ ] 17.2 Afficher la rangée des KPIs (total collecté, nombre d'opérations, commerciaux concernés)
  - [ ] 17.3 Ajouter le sélecteur filtrant de chef de recouvrement (si l'utilisateur est MANAGER ou ADMIN)
  - [ ] 17.4 Construire le tableau recapitulatif "À remettre par commercial" et le tableau détaillé des opérations
  - [ ] 17.5 Brancher le bouton "Exporter PDF" au service de téléchargement
  - [ ] 17.6 Ajouter la propriété `standalone: false` au décorateur `@Component`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [ ] 18. Intégration dans `DailyReportComponent`
  - [ ] 18.1 Ajouter l'onglet "RECOUVREMENT TERRAIN" dans `daily-report.component.html` visible pour les profils autorisés
  - [ ] 18.2 Lier la sélection de période à la mise à jour des filtres de l'onglet
  - [ ] 18.3 Conserver `standalone: false` sur le décorateur `@Component` de `DailyReportComponent`
  - _Requirements: 4.1, 4.2_

---

### Phase 10 : Validation et Tests Frontend

- [ ] 19. Tests Unitaires Frontend (Jest)
  - [ ] 19.1 Écrire les tests Jest pour le modal `CreditLateCloseModalComponent` (vérification de la validation de montant et désactivation du bouton)
  - [ ] 19.2 Écrire les tests unitaires Jest pour `RecoveryManagerService` Angular
  - _Requirements: 1.1, 1.2, 2.4, 2.5, 4.1_

- [ ] 20. Tests de Propriétés Frontend (fast-check)
  - [ ] 20.1 Valider l'intégrité de la somme cumulée des montants engagés dans le modal de clôture
  - _Requirements: 2.4_

## Notes et Règles Communes

1. **Standalone Components** : Lors de la modification de tout composant Angular, ne JAMAIS supprimer la propriété `standalone: false` du décorateur `@Component`.
2. **Logs** : Les logs doublés (avec `this.log.log()` et `console.log()`) s'appliquent uniquement au code mobile. Pour cette implémentation web/frontend, utiliser uniquement les logs standard (ex: console.log).
3. **Structure des Réponses API** : Les réponses du backend doivent suivre le pattern :
   `Response.builder().status(HttpStatus.OK)...data(data).build()`
   Les données renvoyées par le contrôleur doivent être placées dans l'attribut `data`.
4. **Noms de Services** : Lors d'un changement de nom ou d'appel de service, vérifier d'abord que le service cible existe dans le projet.
