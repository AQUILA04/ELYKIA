# Guide du Développeur - Fonctionnalités Tontine

## Vue d'ensemble

Ce guide explique comment utiliser et étendre les nouvelles fonctionnalités de gestion des livraisons et des sessions historiques du module Tontine.

## Table des matières

1. [Gestion des Livraisons](#gestion-des-livraisons)
2. [Consultation des Sessions Historiques](#consultation-des-sessions-historiques)
3. [Services](#services)
4. [Composants](#composants)
5. [Types et Interfaces](#types-et-interfaces)
6. [Intégration Backend](#intégration-backend)
7. [Tests](#tests)
8. [Dépannage](#dépannage)

---

## Gestion des Livraisons

### Utilisation du modal de sélection d'articles

```typescript
import { DeliveryArticleSelectionModalComponent } from './components/modals/delivery-article-selection-modal/delivery-article-selection-modal.component';

// Ouvrir le modal
const dialogRef = this.dialog.open(DeliveryArticleSelectionModalComponent, {
  width: '900px',
  maxHeight: '90vh',
  data: { member: this.member }
});

// Récupérer le résultat
dialogRef.afterClosed().subscribe(result => {
  if (result) {
    // result contient un tableau de DeliveryItemDto
    const deliveryData: CreateDeliveryDto = {
      memberId: this.member.id,
      items: result
    };
    
    // Créer la livraison
    this.deliveryService.createDelivery(deliveryData).subscribe({
      next: (response) => {
        console.log('Livraison créée:', response.data);
      },
      error: (err) => {
        console.error('Erreur:', err.message);
      }
    });
  }
});
```

### Validation du montant

```typescript
import { TontineDeliveryService } from './services/tontine-delivery.service';

// Valider avant de soumettre
const isValid = this.deliveryService.validateDeliveryAmount(
  items,
  member.totalContribution,
  articles
);

if (!isValid) {
  console.error('Le montant total dépasse le montant disponible');
}
```

### Affichage d'une livraison

```html
<!-- Dans le template -->
<div *ngIf="member.delivery">
  <h3>Livraison de Fin d'Année</h3>
  <p>Date: {{ formatDateTime(member.delivery.deliveryDate) }}</p>
  <p>Total: {{ formatCurrency(member.delivery.totalAmount) }}</p>
  
  <table>
    <tr *ngFor="let item of member.delivery.items">
      <td>{{ item.articleName }}</td>
      <td>{{ item.quantity }}</td>
      <td>{{ formatCurrency(item.totalPrice) }}</td>
    </tr>
  </table>
</div>
```

---

## Consultation des Sessions Historiques

### Utilisation du sélecteur de session

```html
<!-- Dans le template du dashboard -->
<app-session-selector (sessionChange)="onSessionChange($event)"></app-session-selector>
```

```typescript
// Dans le composant
onSessionChange(session: TontineSession): void {
  this.isHistoricalView = session.status !== 'ACTIVE';
  
  // Recharger les données pour cette session
  this.loadDataForSession(session.id);
  
  // Désactiver les actions si session historique
  if (this.isHistoricalView) {
    this.disableEditActions();
  }
}
```

### Comparaison de sessions

```typescript
import { TontineSessionService } from './services/tontine-session.service';

// Comparer plusieurs sessions
const years = [2023, 2024, 2025];

this.sessionService.compareSessions(years).subscribe({
  next: (response) => {
    if (response.data) {
      const comparison = response.data;
      
      // Accéder aux statistiques de chaque session
      comparison.sessions.forEach(session => {
        console.log(`Année ${session.year}:`);
        console.log(`- Membres: ${session.totalMembers}`);
        console.log(`- Collecté: ${session.totalCollected}`);
        console.log(`- Taux de livraison: ${session.deliveryRate}%`);
      });
      
      // Accéder aux métriques de comparaison
      console.log('Croissance membres:', comparison.comparisonMetrics.memberGrowth);
      console.log('Meilleure année:', comparison.comparisonMetrics.bestYear);
    }
  }
});
```

### Obtenir les statistiques d'une session

```typescript
this.sessionService.getSessionStats(sessionId).subscribe({
  next: (response) => {
    if (response.data) {
      const stats = response.data;
      console.log('Statistiques:', stats);
    }
  }
});
```

---

## Services

### TontineDeliveryService

Service pour gérer les livraisons.

#### Méthodes principales

```typescript
// Créer une livraison
createDelivery(deliveryData: CreateDeliveryDto): Observable<ApiResponse<TontineDelivery>>

// Obtenir une livraison par ID de membre
getDeliveryByMemberId(memberId: number): Observable<ApiResponse<TontineDelivery>>

// Valider le montant d'une livraison
validateDeliveryAmount(items: DeliveryItemDto[], availableAmount: number, articles: any[]): boolean

// Calculer le total
calculateTotal(items: DeliveryItemDto[], articles: any[]): number
```

#### Exemple d'utilisation

```typescript
constructor(private deliveryService: TontineDeliveryService) {}

createDelivery() {
  const deliveryData: CreateDeliveryDto = {
    memberId: 1,
    items: [
      { articleId: 10, quantity: 2 },
      { articleId: 15, quantity: 1 }
    ]
  };
  
  this.deliveryService.createDelivery(deliveryData).subscribe({
    next: (response) => {
      console.log('Livraison créée:', response.data);
    },
    error: (err) => {
      console.error('Erreur:', err.message);
    }
  });
}
```

### TontineSessionService

Service pour gérer les sessions.

#### Méthodes principales

```typescript
// Obtenir toutes les sessions
getAllSessions(): Observable<ApiResponse<TontineSession[]>>

// Obtenir une session par ID
getSessionById(sessionId: number): Observable<ApiResponse<TontineSession>>

// Obtenir les statistiques d'une session
getSessionStats(sessionId: number): Observable<ApiResponse<SessionStats>>

// Comparer plusieurs sessions
compareSessions(years: number[]): Observable<ApiResponse<SessionComparison>>

// Exporter une session
exportSession(sessionId: number, format: 'excel' | 'pdf'): Observable<Blob>

// Définir la session courante
setCurrentSession(session: TontineSession): void

// Obtenir la session courante
getCurrentSession(): TontineSession | null

// Vérifier si c'est la session courante
isCurrentSession(session: TontineSession): boolean
```

#### Exemple d'utilisation

```typescript
constructor(private sessionService: TontineSessionService) {}

ngOnInit() {
  // S'abonner à la session courante
  this.sessionService.currentSession$.subscribe(session => {
    console.log('Session courante:', session);
  });
  
  // Charger toutes les sessions
  this.sessionService.getAllSessions().subscribe({
    next: (response) => {
      this.sessions = response.data || [];
    }
  });
}
```

---

## Composants

### DeliveryArticleSelectionModalComponent

Modal pour sélectionner les articles de livraison.

#### Inputs

```typescript
@Inject(MAT_DIALOG_DATA) public data: { member: TontineMember }
```

#### Outputs

```typescript
// Retourne un tableau de DeliveryItemDto ou null si annulé
dialogRef.afterClosed(): Observable<DeliveryItemDto[] | null>
```

#### Propriétés publiques

```typescript
member: TontineMember;              // Membre pour lequel on prépare la livraison
articles: Article[];                // Liste de tous les articles
filteredArticles: Article[];        // Articles filtrés par la recherche
selectedArticles: SelectedArticle[]; // Articles sélectionnés avec quantités
totalAmount: number;                // Montant total des articles sélectionnés
remainingBalance: number;           // Solde restant
isValid: boolean;                   // Validation du formulaire
```

#### Méthodes publiques

```typescript
addArticle(article: Article): void;
updateQuantity(selectedArticle: SelectedArticle, change: number): void;
removeArticle(selectedArticle: SelectedArticle): void;
formatCurrency(amount: number): string;
onValidate(): void;
onCancel(): void;
```

### SessionSelectorComponent

Composant pour sélectionner une session.

#### Outputs

```typescript
@Output() sessionChange = new EventEmitter<TontineSession>();
```

#### Propriétés publiques

```typescript
sessions: TontineSession[];         // Liste de toutes les sessions
selectedSession: TontineSession | null; // Session sélectionnée
loading: boolean;                   // État de chargement
```

#### Méthodes publiques

```typescript
onSessionChange(session: TontineSession): void;
isCurrentSession(): boolean;
```

### SessionComparisonComponent

Page de comparaison de sessions.

#### Propriétés publiques

```typescript
sessions: TontineSession[];         // Liste de toutes les sessions
selectedYears: number[];            // Années sélectionnées pour comparaison
comparison: SessionComparison | null; // Résultat de la comparaison
loading: boolean;                   // État de chargement
error: string | null;               // Message d'erreur
```

#### Méthodes publiques

```typescript
toggleYear(year: number): void;
isYearSelected(year: number): boolean;
canCompare(): boolean;
compare(): void;
formatCurrency(amount: number): string;
getGrowthIcon(growth: number): string;
getGrowthClass(growth: number): string;
```

---

## Types et Interfaces

### Livraison

```typescript
interface TontineDelivery {
  readonly id: number;
  readonly tontineMember: TontineMember;
  readonly deliveryDate: string;
  readonly totalAmount: number;
  readonly remainingBalance: number;
  readonly commercialUsername: string;
  readonly items: readonly TontineDeliveryItem[];
  readonly createdBy?: string;
  readonly createdDate?: string;
}

interface TontineDeliveryItem {
  readonly id: number;
  readonly deliveryId: number;
  readonly articleId: number;
  readonly articleName: string;
  readonly articleCode?: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly totalPrice: number;
}

interface Article {
  readonly id: number;
  readonly code: string;
  readonly name: string;
  readonly sellingPrice: number;
  readonly active: boolean;
}

interface CreateDeliveryDto {
  readonly memberId: number;
  readonly items: readonly DeliveryItemDto[];
}

interface DeliveryItemDto {
  readonly articleId: number;
  readonly quantity: number;
}
```

### Sessions

```typescript
interface SessionStats {
  readonly sessionId: number;
  readonly year: number;
  readonly totalMembers: number;
  readonly totalCollected: number;
  readonly averageContribution: number;
  readonly deliveredCount: number;
  readonly pendingCount: number;
  readonly deliveryRate: number;
  readonly topCommercials?: readonly TopCommercial[];
}

interface SessionComparison {
  readonly sessions: readonly SessionStats[];
  readonly comparisonMetrics: ComparisonMetrics;
}

interface ComparisonMetrics {
  readonly memberGrowth: number;
  readonly collectionGrowth: number;
  readonly bestYear: number;
  readonly worstYear: number;
}

interface TopCommercial {
  readonly username: string;
  readonly memberCount: number;
  readonly totalCollected: number;
}
```

---

## Intégration Backend

### Endpoints requis

#### Livraisons

```
POST /api/v1/tontines/deliveries
Body: CreateDeliveryDto
Response: ApiResponse<TontineDelivery>

GET /api/v1/tontines/deliveries/{memberId}
Response: ApiResponse<TontineDelivery>
```

#### Sessions

```
GET /api/v1/tontines/sessions
Response: ApiResponse<TontineSession[]>

GET /api/v1/tontines/sessions/{sessionId}
Response: ApiResponse<TontineSession>

GET /api/v1/tontines/sessions/{sessionId}/stats
Response: ApiResponse<SessionStats>

POST /api/v1/tontines/sessions/compare
Body: { years: number[] }
Response: ApiResponse<SessionComparison>

GET /api/v1/tontines/sessions/{sessionId}/export?format=excel|pdf
Response: Blob
```

#### Articles

```
GET /api/v1/articles
Response: ApiResponse<PaginatedResponse<Article>>
```

### Format de réponse API

```typescript
interface ApiResponse<T> {
  readonly status: string;
  readonly statusCode: number;
  readonly message: string;
  readonly service: string;
  readonly data: T | null;
}
```

### Gestion des erreurs

Le backend doit retourner des erreurs dans ce format :

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Message d'erreur descriptif",
  "service": "optimize-elykia-core",
  "data": null
}
```

Codes d'erreur attendus :
- `400` : Données invalides
- `401` : Non authentifié
- `403` : Permissions insuffisantes
- `404` : Ressource non trouvée
- `409` : Conflit (ex: membre déjà livré)
- `500` : Erreur serveur

---

## Tests

### Tests unitaires

#### Service de livraison

```typescript
describe('TontineDeliveryService', () => {
  it('should validate delivery amount correctly', () => {
    const items: DeliveryItemDto[] = [
      { articleId: 1, quantity: 2 }
    ];
    const articles = [
      { id: 1, sellingPrice: 50000 }
    ];
    const availableAmount = 150000;
    
    const isValid = service.validateDeliveryAmount(items, availableAmount, articles);
    expect(isValid).toBe(true);
  });
  
  it('should calculate total correctly', () => {
    const items: DeliveryItemDto[] = [
      { articleId: 1, quantity: 2 },
      { articleId: 2, quantity: 1 }
    ];
    const articles = [
      { id: 1, sellingPrice: 50000 },
      { id: 2, sellingPrice: 30000 }
    ];
    
    const total = service.calculateTotal(items, articles);
    expect(total).toBe(130000);
  });
});
```

#### Service de session

```typescript
describe('TontineSessionService', () => {
  it('should identify current session', () => {
    const session: TontineSession = {
      id: 1,
      year: 2025,
      status: 'ACTIVE',
      // ...
    };
    
    const isCurrent = service.isCurrentSession(session);
    expect(isCurrent).toBe(true);
  });
});
```

### Tests d'intégration

```typescript
describe('Delivery Integration', () => {
  it('should create delivery and update member status', fakeAsync(() => {
    // Arrange
    const deliveryData: CreateDeliveryDto = {
      memberId: 1,
      items: [{ articleId: 10, quantity: 2 }]
    };
    
    // Act
    component.onPrepareDelivery();
    tick();
    
    // Assert
    expect(component.member.deliveryStatus).toBe(DeliveryStatus.DELIVERED);
    expect(component.member.delivery).toBeDefined();
  }));
});
```

---

## Dépannage

### Problèmes courants

#### 1. Le modal de livraison ne s'ouvre pas

**Cause** : Le composant n'est pas déclaré dans le module.

**Solution** :
```typescript
// Dans tontine.module.ts
declarations: [
  // ...
  DeliveryArticleSelectionModalComponent
]
```

#### 2. Les articles ne se chargent pas

**Cause** : Endpoint API incorrect ou permissions manquantes.

**Solution** :
- Vérifier l'URL de l'API dans `environment.ts`
- Vérifier le token d'authentification
- Vérifier les permissions de l'utilisateur

#### 3. Le calcul du total est incorrect

**Cause** : Les prix des articles ne sont pas à jour.

**Solution** :
- Recharger la liste des articles avant d'ouvrir le modal
- Vérifier que `article.sellingPrice` est bien défini

#### 4. La session ne change pas

**Cause** : L'événement `sessionChange` n'est pas écouté.

**Solution** :
```html
<app-session-selector (sessionChange)="onSessionChange($event)"></app-session-selector>
```

```typescript
onSessionChange(session: TontineSession): void {
  // Implémenter la logique de changement
}
```

#### 5. Erreur "Cannot read property 'delivery' of undefined"

**Cause** : Le membre n'est pas chargé ou la livraison n'existe pas.

**Solution** :
```html
<div *ngIf="member && member.delivery">
  <!-- Contenu -->
</div>
```

### Logs de débogage

Activer les logs dans les services :

```typescript
// Dans tontine-delivery.service.ts
createDelivery(deliveryData: CreateDeliveryDto): Observable<ApiResponse<TontineDelivery>> {
  console.log('Creating delivery:', deliveryData);
  return this.http.post<ApiResponse<TontineDelivery>>(this.apiUrl, deliveryData, { headers })
    .pipe(
      tap(response => console.log('Delivery created:', response)),
      catchError(err => {
        console.error('Delivery error:', err);
        return this.handleError(err);
      })
    );
}
```

### Outils de développement

- **Angular DevTools** : Inspecter les composants et leur état
- **Redux DevTools** : Suivre les changements d'état (si Redux utilisé)
- **Network Tab** : Vérifier les requêtes API
- **Console** : Afficher les logs et erreurs

---

## Bonnes pratiques

### 1. Toujours valider côté client ET serveur

```typescript
// Côté client
if (!this.isValid) {
  this.showError('Données invalides');
  return;
}

// Envoyer au serveur qui validera à nouveau
this.service.create(data).subscribe(...);
```

### 2. Gérer les erreurs de manière appropriée

```typescript
this.service.create(data).subscribe({
  next: (response) => {
    this.showSuccess('Opération réussie');
  },
  error: (err) => {
    this.showError(err.message || 'Une erreur est survenue');
  }
});
```

### 3. Nettoyer les abonnements

```typescript
private destroy$ = new Subject<void>();

ngOnInit() {
  this.service.getData()
    .pipe(takeUntil(this.destroy$))
    .subscribe(...);
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
```

### 4. Utiliser le typage TypeScript

```typescript
// ✅ Bon
const delivery: TontineDelivery = response.data;

// ❌ Mauvais
const delivery: any = response.data;
```

### 5. Documenter le code

```typescript
/**
 * Crée une livraison pour un membre.
 * 
 * @param deliveryData - Données de la livraison à créer
 * @returns Observable contenant la livraison créée
 * @throws Error si le montant dépasse le montant disponible
 */
createDelivery(deliveryData: CreateDeliveryDto): Observable<ApiResponse<TontineDelivery>> {
  // ...
}
```

---

## Ressources

- [Documentation Angular](https://angular.io/docs)
- [Angular Material](https://material.angular.io/)
- [RxJS](https://rxjs.dev/)
- [TypeScript](https://www.typescriptlang.org/docs/)

---

## Support

Pour toute question ou problème :
1. Consulter ce guide
2. Vérifier les logs de la console
3. Consulter la documentation des spécifications
4. Contacter l'équipe de développement

