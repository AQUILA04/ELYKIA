# TODO Frontend - Intégration de la Fusion des Crédits

## 🌐 APIs Backend à consommer

### 1. API pour récupérer les crédits fusionnables
**Endpoint :** `GET /api/v1/credits/mergeable/{commercialUsername}`

**Paramètres :**
- `commercialUsername` (string) : Le nom d'utilisateur du commercial

**Headers requis :**
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Réponse de succès (200) :**
```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "Opération réussie",
  "data": [
    {
      "id": 1,
      "reference": "P24123456",
      "beginDate": "2024-01-15",
      "totalAmount": 150000.0
    },
    {
      "id": 2,
      "reference": "P24789012", 
      "beginDate": "2024-01-20",
      "totalAmount": 200000.0
    }
  ]
}
```

**Réponse d'erreur (4xx/5xx) :**
```json
{
  "status": "BAD REQUEST",
  "statusCode": 400,
  "message": "Message d'erreur",
  "data": null
}
```

### 2. API pour fusionner les crédits
**Endpoint :** `POST /api/v1/credits/merge`

**Headers requis :**
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Body de la requête :**
```json
{
  "creditIds": [1, 2, 3],
  "commercialUsername": "commercial123"
}
```

**Réponse de succès (200) :**
```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "Opération réussie", 
  "data": "FP24345678901234"
}
```

**Réponses d'erreur possibles :**
```json
// Erreur 400 - Validation
{
  "status": "BAD REQUEST",
  "statusCode": 400,
  "message": "La liste des IDs de crédit ne peut pas être vide",
  "data": null
}

// Erreur 400 - Crédits non trouvés
{
  "status": "BAD REQUEST",
  "statusCode": 400,
  "message": "Certains crédits n'existent pas ou n'appartiennent pas au commercial spécifié",
  "data": null
}

// Erreur 400 - Crédits non modifiables
{
  "status": "BAD REQUEST",
  "statusCode": 400,
  "message": "Tous les crédits doivent être modifiables pour être fusionnés",
  "data": null
}
```

## 📋 Tâches à réaliser

### 1. Modification de la liste des ventes (`src/app/credit/credit-list`)

#### 1.1 Ajouter le bouton "Fusion"
- [ ] Ajouter un bouton "Fusion" à côté du bouton "Ajouter" existant
- [ ] Utiliser le même style/couleur que le bouton "Ajouter"
- [ ] Positionner le bouton de manière cohérente avec l'interface existante

```html
<!-- Exemple d'implémentation -->
<div class="action-buttons">
  <button class="btn btn-primary" (click)="openAddCredit()">
    <i class="fas fa-plus"></i> Ajouter
  </button>
  <button class="btn btn-primary ms-2" (click)="openMergeModal()">
    <i class="fas fa-compress-arrows-alt"></i> Fusion
  </button>
</div>
```

### 2. Création du composant Modal de Fusion

#### 2.1 Créer le composant modal
- [ ] Créer `credit-merge-modal.component.ts`
- [ ] Créer `credit-merge-modal.component.html`
- [ ] Créer `credit-merge-modal.component.scss`

#### 2.2 Interfaces TypeScript à créer
```typescript
// Dans un fichier interfaces/credit-merge.interface.ts ou directement dans le composant

export interface CreditSummaryDto {
  id: number;
  reference: string;
  beginDate: string; // Format ISO: "2024-01-15"
  totalAmount: number;
}

export interface MergeCreditDto {
  creditIds: number[];
  commercialUsername: string;
}

// Interface pour la réponse API générique (si pas déjà existante)
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Interface pour les collectors (à adapter selon votre structure existante)
export interface Collector {
  username: string;
  firstname: string;
  lastname: string;
  // autres propriétés selon votre modèle
}
```

#### 2.3 Fonctionnalités du modal
- [ ] **Sélection du commercial** : Réutiliser la logique de sélection de collector du composant `credit-add`
- [ ] **Chargement automatique** : Au changement de commercial, charger la liste des crédits fusionnables
- [ ] **Sélection multiple** : Permettre la sélection de plusieurs crédits avec des checkboxes
- [ ] **Validation** : Désactiver le bouton "Fusionner" si moins de 2 crédits sélectionnés
- [ ] **Gestion des états** : Loading, erreur, succès

### 3. Service Angular pour l'API

#### 3.1 Ajouter les méthodes dans le service existant
```typescript
// Dans credit.service.ts

// Interface pour la réponse API générique
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Méthode pour récupérer les crédits fusionnables
getMergeableCredits(commercialUsername: string): Observable<ApiResponse<CreditSummaryDto[]>> {
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${this.getAuthToken()}`,
    'Content-Type': 'application/json'
  });

  return this.http.get<ApiResponse<CreditSummaryDto[]>>(
    `${this.apiUrl}/mergeable/${commercialUsername}`,
    { headers }
  );
}

// Méthode pour fusionner les crédits
mergeCredits(mergeData: MergeCreditDto): Observable<ApiResponse<string>> {
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${this.getAuthToken()}`,
    'Content-Type': 'application/json'
  });

  return this.http.post<ApiResponse<string>>(
    `${this.apiUrl}/merge`,
    mergeData,
    { headers }
  );
}

// Méthode utilitaire pour récupérer le token (à adapter selon votre implémentation)
private getAuthToken(): string {
  // Remplacer par votre logique de récupération du token
  return localStorage.getItem('authToken') || '';
}
```

#### 3.2 Configuration de l'URL de base
```typescript
// Dans credit.service.ts - s'assurer que l'URL de base est correcte
private apiUrl = 'http://localhost:8080/api/v1/credits'; // À adapter selon votre environnement
```

### 4. Template du Modal (`credit-merge-modal.component.html`)

```html
<div class="modal-header">
  <h4 class="modal-title">Fusion des Crédits</h4>
  <button type="button" class="btn-close" (click)="closeModal()"></button>
</div>

<div class="modal-body">
  <!-- Sélection du commercial -->
  <div class="mb-3">
    <label class="form-label">Commercial *</label>
    <select class="form-select" [(ngModel)]="selectedCommercial" (change)="onCommercialChange()">
      <option value="">Sélectionner un commercial</option>
      <option *ngFor="let collector of collectors" [value]="collector.username">
        {{collector.firstname}} {{collector.lastname}}
      </option>
    </select>
  </div>

  <!-- Liste des crédits fusionnables -->
  <div *ngIf="mergeableCredits.length > 0" class="mb-3">
    <label class="form-label">Crédits à fusionner (minimum 2)</label>
    <div class="credit-list">
      <div *ngFor="let credit of mergeableCredits" class="credit-item">
        <div class="form-check">
          <input 
            class="form-check-input" 
            type="checkbox" 
            [value]="credit.id"
            (change)="onCreditSelection($event, credit.id)"
            [id]="'credit-' + credit.id">
          <label class="form-check-label" [for]="'credit-' + credit.id">
            <strong>{{credit.reference}}</strong> - 
            {{credit.beginDate | date:'dd/MM/yyyy'}} - 
            {{credit.totalAmount | currency:'XOF':'symbol':'1.0-0'}}
          </label>
        </div>
      </div>
    </div>
  </div>

  <!-- Message si aucun crédit -->
  <div *ngIf="selectedCommercial && mergeableCredits.length === 0 && !loading" class="alert alert-info">
    Aucun crédit fusionnable trouvé pour ce commercial.
  </div>

  <!-- Loading -->
  <div *ngIf="loading" class="text-center">
    <div class="spinner-border" role="status"></div>
    <p>Chargement des crédits...</p>
  </div>
</div>

<div class="modal-footer">
  <button type="button" class="btn btn-secondary" (click)="closeModal()">
    Annuler
  </button>
  <button 
    type="button" 
    class="btn btn-primary" 
    (click)="mergeCreditsList()"
    [disabled]="selectedCreditIds.length < 2 || merging">
    <span *ngIf="merging" class="spinner-border spinner-border-sm me-2"></span>
    Fusionner ({{selectedCreditIds.length}})
  </button>
</div>
```

### 5. Logique du composant (`credit-merge-modal.component.ts`)

```typescript
export class CreditMergeModalComponent implements OnInit {
  @Input() collectors: any[] = [];
  @Output() onMergeSuccess = new EventEmitter<string>();
  @Output() onClose = new EventEmitter<void>();

  selectedCommercial: string = '';
  mergeableCredits: CreditSummaryDto[] = [];
  selectedCreditIds: number[] = [];
  loading: boolean = false;
  merging: boolean = false;

  constructor(
    private creditService: CreditService,
    private notificationService: NotificationService
  ) {}

  onCommercialChange() {
    if (this.selectedCommercial) {
      this.loadMergeableCredits();
    } else {
      this.mergeableCredits = [];
      this.selectedCreditIds = [];
    }
  }

  loadMergeableCredits() {
    this.loading = true;
    this.creditService.getMergeableCredits(this.selectedCommercial)
      .subscribe({
        next: (response) => {
          this.mergeableCredits = response.data || [];
          this.selectedCreditIds = [];
          this.loading = false;
        },
        error: (error) => {
          this.notificationService.showError('Erreur lors du chargement des crédits');
          this.loading = false;
        }
      });
  }

  onCreditSelection(event: any, creditId: number) {
    if (event.target.checked) {
      this.selectedCreditIds.push(creditId);
    } else {
      this.selectedCreditIds = this.selectedCreditIds.filter(id => id !== creditId);
    }
  }

  mergeCreditsList() {
    if (this.selectedCreditIds.length < 2) {
      this.notificationService.showWarning('Veuillez sélectionner au moins 2 crédits');
      return;
    }

    this.merging = true;
    const mergeData: MergeCreditDto = {
      creditIds: this.selectedCreditIds,
      commercialUsername: this.selectedCommercial
    };

    this.creditService.mergeCredits(mergeData)
      .subscribe({
        next: (response) => {
          this.merging = false;
          this.notificationService.showSuccess(
            `Fusion réussie ! Nouvelle référence: ${response.data}`,
            () => {
              this.onMergeSuccess.emit(response.data);
              this.closeModal();
            }
          );
        },
        error: (error) => {
          this.merging = false;
          const errorMessage = error.error?.message || 'Erreur lors de la fusion des crédits';
          this.notificationService.showError(errorMessage);
        }
      });
  }

  closeModal() {
    this.onClose.emit();
  }
}
```

### 6. Styles CSS (`credit-merge-modal.component.scss`)

```scss
.credit-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  padding: 0.75rem;
}

.credit-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid #f8f9fa;
  
  &:last-child {
    border-bottom: none;
  }
}

.form-check-label {
  cursor: pointer;
  width: 100%;
  padding: 0.25rem 0;
}

.modal-body {
  min-height: 200px;
}

.spinner-border-sm {
  width: 1rem;
  height: 1rem;
}
```

### 7. Intégration dans credit-list.component.ts

```typescript
export class CreditListComponent {
  showMergeModal: boolean = false;
  collectors: any[] = []; // À charger depuis le service approprié

  openMergeModal() {
    this.loadCollectors(); // Charger la liste des commerciaux
    this.showMergeModal = true;
  }

  closeMergeModal() {
    this.showMergeModal = false;
  }

  onMergeSuccess(newReference: string) {
    // Recharger la liste des crédits
    this.loadCredits();
    this.showMergeModal = false;
  }

  loadCollectors() {
    // Utiliser le même service que credit-add pour charger les collectors
    this.userService.getCollectors().subscribe({
      next: (response) => {
        this.collectors = response.data || [];
      },
      error: (error) => {
        console.error('Erreur lors du chargement des collectors', error);
      }
    });
  }
}
```

### 8. Template credit-list.component.html

```html
<!-- Ajouter dans la section des boutons d'action -->
<div class="d-flex gap-2 mb-3">
  <button class="btn btn-primary" (click)="openAddCredit()">
    <i class="fas fa-plus"></i> Ajouter
  </button>
  <button class="btn btn-primary" (click)="openMergeModal()">
    <i class="fas fa-compress-arrows-alt"></i> Fusion
  </button>
</div>

<!-- Ajouter le modal à la fin du template -->
<div class="modal fade" [class.show]="showMergeModal" [style.display]="showMergeModal ? 'block' : 'none'">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <app-credit-merge-modal
        [collectors]="collectors"
        (onMergeSuccess)="onMergeSuccess($event)"
        (onClose)="closeMergeModal()">
      </app-credit-merge-modal>
    </div>
  </div>
</div>
<div class="modal-backdrop fade" [class.show]="showMergeModal" *ngIf="showMergeModal"></div>
```

## 🎯 Points d'attention

### Validation côté frontend
- [ ] Vérifier qu'au moins 2 crédits sont sélectionnés
- [ ] Valider que le commercial est sélectionné
- [ ] Gérer les états de chargement

### Gestion des erreurs
- [ ] Afficher les messages d'erreur appropriés
- [ ] Gérer les cas où aucun crédit n'est fusionnable
- [ ] Timeout des requêtes

### UX/UI
- [ ] Indicateurs de chargement clairs
- [ ] Messages de confirmation
- [ ] Cohérence avec le design existant
- [ ] Responsive design

### Tests
- [ ] Tester la sélection/désélection des crédits
- [ ] Tester les cas d'erreur
- [ ] Tester le flux complet de fusion
- [ ] Vérifier la mise à jour de la liste après fusion

## 🚀 Ordre de développement recommandé

1. **Étape 1** : Ajouter le bouton "Fusion" sur credit-list
2. **Étape 2** : Créer le service avec les nouvelles méthodes API
3. **Étape 3** : Développer le composant modal
4. **Étape 4** : Intégrer le modal dans credit-list
5. **Étape 5** : Tests et ajustements UX
6. **Étape 6** : Tests de validation complète

## 🔧 Configuration et prérequis

### Variables d'environnement
```typescript
// Dans environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1', // URL de base de l'API
  // autres configurations...
};
```

### Gestion de l'authentification
- S'assurer que le token JWT est disponible et valide
- Gérer l'expiration du token et la redirection vers la page de connexion
- Adapter la méthode `getAuthToken()` selon votre système d'authentification

### Gestion des erreurs HTTP
```typescript
// Exemple de gestion d'erreur dans le service
private handleError(error: HttpErrorResponse): Observable<never> {
  let errorMessage = 'Une erreur est survenue';
  
  if (error.error instanceof ErrorEvent) {
    // Erreur côté client
    errorMessage = error.error.message;
  } else {
    // Erreur côté serveur
    errorMessage = error.error?.message || `Erreur ${error.status}: ${error.message}`;
  }
  
  return throwError(() => new Error(errorMessage));
}
```

## 🧪 Tests à effectuer

### Tests unitaires
- [ ] Test du service : `getMergeableCredits()`
- [ ] Test du service : `mergeCredits()`
- [ ] Test du composant modal : sélection des crédits
- [ ] Test du composant modal : validation du formulaire

### Tests d'intégration
- [ ] Test du flux complet : sélection commercial → chargement → sélection crédits → fusion
- [ ] Test de la gestion d'erreurs : commercial sans crédits, erreurs API
- [ ] Test de l'interface : ouverture/fermeture du modal, mise à jour de la liste

### Tests manuels
- [ ] Vérifier l'affichage correct des montants (format monétaire)
- [ ] Tester avec différents nombres de crédits (2, 3, 10+)
- [ ] Vérifier la responsivité sur mobile/tablette
- [ ] Tester les cas limites : connexion lente, timeout

## 🚨 Points d'attention critiques

### Sécurité
- [ ] Valider côté frontend ET backend (ne jamais faire confiance au frontend seul)
- [ ] S'assurer que seuls les crédits autorisés sont affichés
- [ ] Gérer l'expiration du token pendant l'utilisation

### Performance
- [ ] Limiter le nombre de crédits affichés (pagination si nécessaire)
- [ ] Optimiser les requêtes (éviter les appels multiples)
- [ ] Gérer les timeouts des requêtes longues

### UX/UI
- [ ] Feedback visuel immédiat sur les actions utilisateur
- [ ] Messages d'erreur clairs et exploitables
- [ ] Confirmation avant les actions irréversibles
- [ ] Cohérence avec le design system existant

## 📋 Checklist de validation finale

### Fonctionnel
- [ ] Le bouton "Fusion" s'affiche correctement
- [ ] La sélection du commercial fonctionne
- [ ] Les crédits se chargent automatiquement
- [ ] La sélection multiple fonctionne
- [ ] La fusion s'exécute correctement
- [ ] Les notifications s'affichent
- [ ] La liste se met à jour après fusion

### Technique
- [ ] Aucune erreur dans la console
- [ ] Les requêtes HTTP sont correctes
- [ ] La gestion d'erreurs fonctionne
- [ ] Les types TypeScript sont corrects
- [ ] Le code respecte les standards du projet

### UX
- [ ] L'interface est intuitive
- [ ] Les états de chargement sont visibles
- [ ] Les messages sont compréhensibles
- [ ] L'interface est responsive
- [ ] Les couleurs/styles sont cohérents

## 📝 Notes techniques

- **URL de base API :** `http://localhost:8081/api/v1/credits` (à adapter selon l'environnement)
- **Authentification :** JWT Token requis dans le header Authorization
- **Format des montants :** Utiliser le pipe currency avec 'XOF' pour la devise
- **Gestion des dates :** Format ISO (YYYY-MM-DD) depuis l'API, affichage DD/MM/YYYY
- **Réutiliser au maximum** les composants et services existants
- **Respecter les conventions** de nommage du projet
- **S'assurer de la cohérence** avec l'API backend
- **Gérer correctement** la fermeture du modal et le nettoyage des données

Cette implémentation permettra aux utilisateurs de fusionner facilement plusieurs crédits d'un commercial en quelques clics ! 🎉
