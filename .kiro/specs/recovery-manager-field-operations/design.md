# Design Document

## Overview

Ce document décrit l'architecture technique de la fonctionnalité Chef de Recouvrement - Opérations Terrain. Le design s'appuie sur les patterns existants du projet (CreditController, CreditTimelineService, DailyCommercialReport) et introduit une couche dédiée sans modifier le comportement existant des commerciaux et managers.

## Components and Interfaces

### Backend — Nouveaux composants
| Composant | Type | Rôle |
|---|---|---|
| `RecoveryManagerOperation` | JPA Entity | Table d'audit des opérations terrain |
| `RecoveryManagerOperationRepository` | JPA Repository | Accès données CRUD + requêtes rapport |
| `RecoveryManagerService` | Service | Logique métier clôture + agrégation rapport |
| `RecoveryManagerController` | REST Controller | Exposition des endpoints |
| `RecoveryManagerReportPdfService` | Service PDF | Génération PDF rapport chef de recouvrement |
| `CloseCreditsRequestDto` | DTO | Payload requête de clôture (liste d'items) |
| `CreditCloseItemDto` | DTO | Un item de clôture (creditId, amount, isPartial) |
| `RecoveryManagerReportSummaryDto` | DTO | KPIs + tableau remises par commercial |
| `CommercialRemittanceDto` | DTO | Ligne du tableau "à remettre par commercial" |

### Backend — Composants modifiés
| Composant | Modification |
|---|---|
| `DailyCommercialReport` | Ajout champ `recoveryManagerCollectionsAmount` |
| `DailyCommercialReportService` | Incrémentation du nouveau champ lors des clôtures terrain |

### Frontend — Nouveaux composants
| Composant | Type | Rôle |
|---|---|---|
| `CreditLateCloseModalComponent` | Angular Component | Modal de confirmation de clôture |
| `RecoveryManagerReportTabComponent` | Angular Component | Onglet rapport dans daily-report |
| `RecoveryManagerService` | Angular Service | Appels API chef de recouvrement |

### Frontend — Composants modifiés
| Composant | Modification |
|---|---|
| `CreditLateTableComponent` | Ajout checkbox sélection + bouton clôture par ligne |
| `CreditLateComponent` | Barre action flottante, gestion sélection multiple |
| `DailyReportComponent` | Ajout onglet "RECOUVREMENT TERRAIN" |

---

## Architecture

### Vue d'ensemble du flux

```
[RECOVERY_MANAGER - Frontend]
        |
        | Sélectionne crédits en retard
        | Ouvre modal confirmation (total/partiel)
        | Confirme
        v
[POST /api/v1/recovery-manager/close-credits]
        |
        |-- CreditTimelineService.makeDailyStake()  --> CreditTimeline (collector = recoveryManager)
        |-- RecoveryManagerOperationService.save()  --> RecoveryManagerOperation (table audit)
        |-- DailyCommercialReportService.update()   --> collectionsAmount++ + recoveryManagerCollectionsAmount++
                                                    --> totalAmountToDeposit++
```

### Composants touchés

**Backend (nouveaux) :**
- `RecoveryManagerOperation` — entité JPA
- `RecoveryManagerOperationRepository` — JPA Repository
- `RecoveryManagerService` — logique métier clôture + rapport
- `RecoveryManagerController` — endpoints REST
- `RecoveryManagerReportPdfService` — génération PDF rapport

**Backend (modifiés) :**
- `DailyCommercialReport` — ajout champ `recoveryManagerCollectionsAmount`
- `DailyCommercialReportService` — logique d'incrémentation du nouveau champ

**Frontend (nouveaux) :**
- `CreditLateCloseModalComponent` — modal de confirmation clôture
- `RecoveryManagerReportTabComponent` — onglet rapport dans daily-report

**Frontend (modifiés) :**
- `CreditLateTableComponent` — ajout checkbox + bouton clôture par ligne
- `CreditLateComponent` — barre d'action flottante, gestion sélection
- `DailyReportComponent` — ajout onglet "RECOUVREMENT TERRAIN"
- `RecoveryManagerService` (Angular) — appels API

---

## Data Models

### Nouvelle entité : `RecoveryManagerOperation`

```java
@Entity
@Table(name = "recovery_manager_operation")
@Getter @Setter @NoArgsConstructor
public class RecoveryManagerOperation extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String recoveryManagerUsername;

    @Column(nullable = false)
    private String commercialUsername;

    @Column(nullable = false)
    private Long creditId;

    // Référence vers le CreditTimeline créé lors de l'opération
    private Long creditTimelineId;

    @Column(nullable = false)
    private Double amountCollected;

    @Column(nullable = false)
    private Boolean isPartial = false;

    // Montant restant du crédit AVANT cette opération
    @Column(nullable = false)
    private Double originalAmountRemaining;

    @Column(nullable = false)
    private LocalDate operationDate;

    @Column(unique = true, nullable = false)
    private String reference; // ex: RMO-20240603-001

    // Dénormalisation pour faciliter les rapports sans jointure
    private String clientName;
    private String creditReference;
}
```

### Modification : `DailyCommercialReport`

```java
// Champ à ajouter dans DailyCommercialReport.java
@Column(columnDefinition = "double precision default 0")
private Double recoveryManagerCollectionsAmount = 0.0;
```

### DTO de clôture (Frontend → Backend)

```java
// CloseCreditsRequestDto.java
public class CloseCreditsRequestDto {
    @NotEmpty
    private List<CreditCloseItemDto> items;
}

// CreditCloseItemDto.java
public class CreditCloseItemDto {
    @NotNull
    private Long creditId;

    @NotNull
    @Positive
    private Double amount;

    private Boolean isPartial = false;
}
```

### DTO rapport résumé

```java
// RecoveryManagerReportSummaryDto.java
public class RecoveryManagerReportSummaryDto {
    private Double totalAmountCollected;
    private Integer totalOperationsCount;
    private Integer commercialsCount;
    private List<CommercialRemittanceDto> remittanceByCommercial;
}

// CommercialRemittanceDto.java
public class CommercialRemittanceDto {
    private String commercialUsername;
    private Integer operationsCount;
    private Double totalToRemit;
}
```

---

## Backend Design

### `RecoveryManagerController`

```java
@RestController
@RequestMapping("api/v1/recovery-manager")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
@Tag(name = "API Chef de Recouvrement")
public class RecoveryManagerController {

    @PostMapping("/close-credits")
    @PreAuthorize("hasRole('RECOVERY_MANAGER')")
    public ResponseEntity<Response> closeCredits(
            @RequestBody @Valid CloseCreditsRequestDto dto) { ... }

    @GetMapping("/operations")
    @PreAuthorize("hasAnyRole('RECOVERY_MANAGER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<Response> getOperations(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate,
            @RequestParam(required = false) String recoveryManagerUsername,
            Pageable pageable) { ... }

    @GetMapping("/report/summary")
    @PreAuthorize("hasAnyRole('RECOVERY_MANAGER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<Response> getReportSummary(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate,
            @RequestParam(required = false) String recoveryManagerUsername) { ... }

    @GetMapping("/report/pdf")
    @PreAuthorize("hasAnyRole('RECOVERY_MANAGER', 'MANAGER', 'ADMIN')")
    public ResponseEntity<Resource> getReportPdf(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate,
            @RequestParam(required = false) String recoveryManagerUsername) { ... }
}
```

### `RecoveryManagerService` — méthode `closeCredits`

```
closeCredits(List<CreditCloseItemDto> items, String recoveryManagerUsername):
  Pour chaque item:
    1. Charger le Credit par creditId → lever NotFoundException si absent
    2. Vérifier que credit.status == INPROGRESS et date fin dépassée
    3. Vérifier qu'aucune RecoveryManagerOperation n'existe pour ce creditId aujourd'hui (doublon)
    4. Construire CreditTimelineDto avec amount = item.amount, creditId, collector = recoveryManagerUsername
    5. Appeler creditTimelineService.makeDailyStake(dto) → retourne CreditTimeline créé
    6. Créer et persister RecoveryManagerOperation (tous les champs)
    7. Mettre à jour DailyCommercialReport du commercial:
       - collectionsCount++, collectionsAmount += item.amount (existant)
       - recoveryManagerCollectionsAmount += item.amount (nouveau)
       - totalAmountToDeposit += item.amount (existant)
    8. Retourner le RecoveryManagerOperation créé
  Gestion d'erreur : si une opération échoue, lever une exception avec le creditId concerné
  (les opérations précédentes du batch sont committées — comportement partiel accepté en v1)
```

### Génération de référence

```
RMO-{YYYYMMDD}-{sequence_du_jour_sur_3_chiffres}
Exemple : RMO-20240603-001
```

---

## Frontend Design

### `CreditLateTableComponent` — modifications

Inputs ajoutés :
```typescript
@Input() isRecoveryManager: boolean = false;
@Output() closeCredit = new EventEmitter<CreditLateDto>();
@Output() selectionChanged = new EventEmitter<CreditLateDto[]>();
```

Template — colonne checkbox (première colonne, conditionnelle) :
```html
<ng-container matColumnDef="select" *ngIf="isRecoveryManager">
  <th mat-header-cell *matHeaderCellDef>
    <mat-checkbox (change)="toggleSelectAll($event)"></mat-checkbox>
  </th>
  <td mat-cell *matCellDef="let credit">
    <mat-checkbox [(ngModel)]="credit.selected"
                  (change)="onSelectionChange()"></mat-checkbox>
  </td>
</ng-container>
```

Colonne action clôture (dernière colonne, conditionnelle) :
```html
<ng-container matColumnDef="close" *ngIf="isRecoveryManager">
  <th mat-header-cell *matHeaderCellDef></th>
  <td mat-cell *matCellDef="let credit">
    <button mat-icon-button color="warn"
            matTooltip="Clôturer ce crédit"
            (click)="$event.stopPropagation(); closeCredit.emit(credit)">
      <mat-icon>lock</mat-icon>
    </button>
  </td>
</ng-container>
```

### `CreditLateComponent` — barre d'action flottante

```html
<!-- Barre flottante sélection multiple -->
<div class="bulk-action-bar" *ngIf="isRecoveryManager && selectedCredits.length > 0">
  <span class="selection-info">
    {{ selectedCredits.length }} crédit(s) sélectionné(s) ·
    {{ totalSelectedAmount | currency:'XOF':'symbol':'1.0-0' }}
  </span>
  <button class="btn-close-bulk" (click)="openCloseModal(selectedCredits)">
    <mat-icon>lock</mat-icon>
    Clôturer la sélection
  </button>
  <button mat-icon-button (click)="clearSelection()">
    <mat-icon>close</mat-icon>
  </button>
</div>
```

### `CreditLateCloseModalComponent` — structure du modal

```
┌─────────────────────────────────────────────────────────┐
│  Clôture de recouvrement terrain                   [X]  │
├─────────────────────────────────────────────────────────┤
│  Crédits à clôturer (N)                                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Client      │ Commercial │ Restant  │ Partiel │ Mtt│  │
│  │ Kofi Atta   │ jean_k     │ 45 000   │ [ ]     │ -- │  │
│  │ Ama Sika    │ marie_d    │ 30 000   │ [x]  12 000  │  │
│  └───────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  RÉSUMÉ FINANCIER                                        │
│  Montant total engagé : 57 000 XOF                       │
│  Recouvrements totaux : 1  ·  Partiels : 1               │
├─────────────────────────────────────────────────────────┤
│              [Annuler]        [Confirmer l'opération]    │
└─────────────────────────────────────────────────────────┘
```

Logique du composant :
```typescript
interface CloseItem {
  credit: CreditLateDto;
  isPartial: boolean;
  amount: number;        // pré-rempli avec totalAmountRemaining
  amountError?: string;
}

get isValid(): boolean {
  return this.items.every(item =>
    item.amount > 0 && item.amount <= item.credit.totalAmountRemaining
  );
}

get totalAmount(): number {
  return this.items.reduce((sum, item) => sum + item.amount, 0);
}
```

### `RecoveryManagerService` (Angular)

```typescript
@Injectable({ providedIn: 'root' })
export class RecoveryManagerService {
  private readonly BASE = 'api/v1/recovery-manager';

  closeCredits(items: CreditCloseItemDto[]): Observable<any> {
    return this.http.post(`${this.BASE}/close-credits`, { items });
  }

  getOperations(params: RecoveryOperationsParams): Observable<Page<RecoveryManagerOperation>> {
    return this.http.get<any>(`${this.BASE}/operations`, { params: { ...params } });
  }

  getReportSummary(params: ReportPeriodParams): Observable<RecoveryManagerReportSummaryDto> {
    return this.http.get<any>(`${this.BASE}/report/summary`, { params: { ...params } });
  }

  downloadReportPdf(params: ReportPeriodParams): Observable<Blob> {
    return this.http.get(`${this.BASE}/report/pdf`, {
      params: { ...params },
      responseType: 'blob'
    });
  }
}
```

### `RecoveryManagerReportTabComponent` — structure

```
[Onglet RECOUVREMENT TERRAIN]
│
├── Sélecteur Chef de Recouvrement (visible MANAGER/ADMIN uniquement)
│
├── KPIs row
│   ├── Total collecté : XXX XOF
│   ├── Nb opérations : N
│   └── Commerciaux concernés : N
│
├── Tableau "À remettre par commercial"
│   ├── Commercial | Nb opérations | Montant à remettre
│   └── [ligne par commercial]
│
├── Tableau "Détail des opérations"
│   ├── Heure | Réf crédit | Client | Commercial | Montant | Type
│   └── [ligne par opération]
│
└── [Exporter PDF]
```

---

## Rapport PDF du Chef de Recouvrement

Structure du PDF (réutilise `PdfService` existant) :

```
┌──────────────────────────────────────────────┐
│  ELYKIA — Rapport de Recouvrement Terrain    │
│  Chef de recouvrement : [username]           │
│  Période : du XX/XX/XXXX au XX/XX/XXXX       │
├──────────────────────────────────────────────┤
│  SYNTHÈSE                                    │
│  Total collecté   : XXX XOF                  │
│  Nb opérations    : N                        │
│  Commerciaux      : N                        │
├──────────────────────────────────────────────┤
│  REMISES PAR COMMERCIAL                      │
│  Commercial       │ Opérations │ À remettre  │
│  jean_k           │     5      │  125 000    │
│  marie_d          │     3      │   87 500    │
├──────────────────────────────────────────────┤
│  DÉTAIL DES OPÉRATIONS                       │
│  Date  │ Réf   │ Client  │ Commercial │ Mtt  │
│  ...                                         │
└──────────────────────────────────────────────┘
```

---

## Error Handling

| Scénario d'erreur | Comportement attendu |
|---|---|
| `creditId` inconnu dans la requête de clôture | Lever `NotFoundException`, retourner 404 avec message explicite |
| Crédit déjà clôturé pour la même journée (doublon) | Lever `BusinessException`, retourner 400 avec message "Opération déjà enregistrée pour ce crédit aujourd'hui" |
| Montant partiel > `totalAmountRemaining` | Valider côté frontend (désactivation bouton) + validation backend, retourner 400 |
| Montant partiel ≤ 0 | Valider côté frontend + backend, retourner 400 |
| Échec partiel dans un batch (plusieurs crédits) | Les crédits réussis sont committés, le crédit en erreur est retourné dans la réponse avec son message d'erreur |
| Accès non autorisé (`POST /close-credits` sans rôle RECOVERY_MANAGER) | Spring Security retourne 403 Forbidden |
| Échec génération PDF | Retourner 500 avec message générique, logger l'erreur |

## Testing Strategy

### Tests unitaires backend
- `RecoveryManagerService.closeCredits()` : tester clôture totale, partielle, doublon, crédit inexistant
- Vérifier incrémentation correcte de `collectionsAmount` ET `recoveryManagerCollectionsAmount`
- Vérifier création de `RecoveryManagerOperation` avec tous les champs renseignés
- Vérifier que `CreditTimeline.collector` = username du chef de recouvrement

### Tests d'intégration backend
- Flux complet : POST close-credits → vérifier état BDD (RecoveryManagerOperation + DailyCommercialReport + CreditTimeline)
- Vérifier la contrainte d'unicité `(creditId, operationDate)`

### Tests frontend
- `CreditLateCloseModalComponent` : validation formulaire (partiel borné, résumé mis à jour), désactivation bouton si erreur
- `CreditLateComponent` : visibilité checkboxes selon rôle, barre flottante apparaît/disparaît
- `RecoveryManagerReportTabComponent` : affichage conditionnel onglet selon rôle, tableaux correctement alimentés

### Property-Based Tests
- **P1** : Pour tout commercial C, date J : `collectionsAmount(C,J) >= recoveryManagerCollectionsAmount(C,J)` après N opérations aléatoires
- **P3** : Pour tout item partiel valide : `0 < amountCollected < originalAmountRemaining`

## Correctness Properties

### Property 1: Conservation des totaux commerciaux
Pour tout commercial C et toute journée J :
`DailyCommercialReport(C,J).collectionsAmount >= DailyCommercialReport(C,J).recoveryManagerCollectionsAmount`

### Property 2: Traçabilité complète
Pour chaque `RecoveryManagerOperation` créée, il existe exactement un `CreditTimeline` avec `id = creditTimelineId` et `collector = recoveryManagerUsername`.

### Property 3: Montant partiel borné
Pour tout `RecoveryManagerOperation` avec `isPartial = true` :
`amountCollected < originalAmountRemaining` et `amountCollected > 0`

### Property 4: Unicité journalière par crédit
Il ne peut exister qu'une seule `RecoveryManagerOperation` par `(creditId, operationDate)`.

### Property 5: Cohérence totalAmountToDeposit
L'incrémentation de `totalAmountToDeposit` du commercial inclut les montants collectés par le chef de recouvrement (car le chef remet l'argent au commercial qui doit reverser la totalité).

---

## Migration de base de données

```sql
-- 1. Nouvelle table RecoveryManagerOperation
CREATE TABLE recovery_manager_operation (
    id                        BIGSERIAL PRIMARY KEY,
    recovery_manager_username VARCHAR(255) NOT NULL,
    commercial_username       VARCHAR(255) NOT NULL,
    credit_id                 BIGINT       NOT NULL,
    credit_timeline_id        BIGINT,
    amount_collected          DOUBLE PRECISION NOT NULL,
    is_partial                BOOLEAN      NOT NULL DEFAULT FALSE,
    original_amount_remaining DOUBLE PRECISION NOT NULL,
    operation_date            DATE         NOT NULL,
    reference                 VARCHAR(50)  UNIQUE NOT NULL,
    client_name               VARCHAR(255),
    credit_reference          VARCHAR(255),
    -- Champs BaseEntity
    created_date              TIMESTAMP,
    last_modified_date        TIMESTAMP,
    created_by                VARCHAR(255),
    last_modified_by          VARCHAR(255),
    deleted                   BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_rmo_recovery_manager ON recovery_manager_operation(recovery_manager_username, operation_date);
CREATE INDEX idx_rmo_commercial       ON recovery_manager_operation(commercial_username, operation_date);
CREATE INDEX idx_rmo_credit           ON recovery_manager_operation(credit_id);

-- 2. Nouveau champ dans daily_commercial_report
ALTER TABLE daily_commercial_report
    ADD COLUMN IF NOT EXISTS recovery_manager_collections_amount DOUBLE PRECISION DEFAULT 0;
```

---

## Sécurité et contrôle d'accès

| Endpoint | Rôles autorisés |
|---|---|
| `POST /close-credits` | `RECOVERY_MANAGER` |
| `GET /operations` | `RECOVERY_MANAGER`, `GESTIONNAIRE`, `ADMIN` |
| `GET /report/summary` | `RECOVERY_MANAGER`, `GESTIONNAIRE`, `ADMIN` |
| `GET /report/pdf` | `RECOVERY_MANAGER`, `GESTIONNAIRE`, `ADMIN` |

Un `RECOVERY_MANAGER` ne voit que ses propres opérations. Un `GESTIONNAIRE`/`ADMIN` peut filtrer par chef de recouvrement.
