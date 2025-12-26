# Guide de Gestion d'Erreur Améliorée

## Problème Résolu

Les messages d'erreur complets du backend n'étaient pas toujours affichés dans les alertes de l'interface utilisateur. Les vrais messages d'erreur étaient visibles dans l'onglet réseau du navigateur mais pas dans les alertes SweetAlert2.

## Solution Implémentée

### 1. Service de Gestion d'Erreur Centralisé

**Fichier:** `src/app/shared/service/error-handler.service.ts`

Ce service extrait intelligemment les messages d'erreur du backend selon plusieurs formats possibles :

```typescript
// Cas 1: Structure API standard
{ message: "Message d'erreur", code: "ERROR_CODE", data: {...} }

// Cas 2: Message direct
"Message d'erreur simple"

// Cas 3: Erreur avec message
{ message: "Message d'erreur" }

// Cas 4: Erreur côté client
ErrorEvent avec message

// Cas 5: Codes HTTP standard
Basé sur le code de statut (400, 401, 500, etc.)
```

### 2. Service HTTP de Base

**Fichier:** `src/app/shared/service/base-http.service.ts`

Service de base que tous les autres services peuvent étendre pour bénéficier automatiquement de la gestion d'erreur améliorée.

### 3. Mixin pour Composants

**Fichier:** `src/app/shared/mixins/error-handling.mixin.ts`

Mixin qui ajoute des méthodes de gestion d'erreur aux composants.

### 4. Interceptor Amélioré

**Fichier:** `src/app/shared/auth.interceptor.ts`

L'interceptor d'authentification utilise maintenant le service de gestion d'erreur pour les erreurs critiques.

## Comment Utiliser

### Pour les Services

#### Option 1: Étendre BaseHttpService (Recommandé)

```typescript
import { BaseHttpService } from 'src/app/shared/service/base-http.service';

@Injectable({
  providedIn: 'root'
})
export class MonService extends BaseHttpService {
  constructor(
    http: HttpClient, 
    tokenStorage: TokenStorageService,
    errorHandler: ErrorHandlerService
  ) {
    super(http, tokenStorage, errorHandler);
  }

  // Utiliser les méthodes héritées
  getData(): Observable<any> {
    return this.get('/api/data'); // Gestion d'erreur automatique
  }

  createData(data: any): Observable<any> {
    return this.post('/api/data', data); // Gestion d'erreur automatique
  }
}
```

#### Option 2: Utiliser ErrorHandlerService directement

```typescript
import { ErrorHandlerService } from 'src/app/shared/service/error-handler.service';

@Injectable({
  providedIn: 'root'
})
export class MonService {
  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService
  ) {}

  getData(): Observable<any> {
    return this.http.get('/api/data').pipe(
      catchError((error) => {
        // Log l'erreur et la retourner pour que le composant puisse la gérer
        console.error('Erreur dans getData:', this.errorHandler.getErrorMessage(error));
        return throwError(() => error);
      })
    );
  }
}
```

### Pour les Composants

#### Option 1: Étendre ErrorHandlingMixin (Recommandé)

```typescript
import { ErrorHandlingMixin } from 'src/app/shared/mixins/error-handling.mixin';
import { ErrorHandlerService } from 'src/app/shared/service/error-handler.service';

export class MonComponent extends ErrorHandlingMixin implements OnInit {
  constructor(
    private monService: MonService,
    errorHandler: ErrorHandlerService
  ) {
    super(errorHandler);
  }

  loadData(): void {
    this.monService.getData().subscribe({
      next: (data) => {
        // Traiter les données
      },
      error: (error) => {
        // Afficher le message d'erreur complet du backend
        this.handleError(error, 'Erreur de chargement');
      }
    });
  }

  // Gestion d'erreur avec actions spécifiques
  saveData(data: any): void {
    this.monService.saveData(data).subscribe({
      next: (response) => {
        // Succès
      },
      error: (error) => {
        this.handleCommonErrors(error, {
          onUnauthorized: () => this.router.navigate(['/login']),
          onForbidden: () => this.showAccessDeniedMessage(),
          customTitle: 'Erreur de sauvegarde'
        });
      }
    });
  }
}
```

#### Option 2: Utiliser ErrorHandlerService directement

```typescript
import { ErrorHandlerService } from 'src/app/shared/service/error-handler.service';

export class MonComponent implements OnInit {
  constructor(
    private monService: MonService,
    private errorHandler: ErrorHandlerService
  ) {}

  loadData(): void {
    this.monService.getData().subscribe({
      next: (data) => {
        // Traiter les données
      },
      error: (error) => {
        // Afficher le message d'erreur complet
        this.errorHandler.showError(error, 'Erreur de chargement');
        
        // Ou juste récupérer le message
        const message = this.errorHandler.getErrorMessage(error);
        console.error('Erreur:', message);
      }
    });
  }
}
```

## Exemples de Messages d'Erreur Récupérés

### Avant (Problème)
```
// Message générique affiché
"Une erreur est survenue"

// Vrai message dans le réseau
{
  "message": "Le client a déjà un crédit en cours. Impossible de créer un nouveau crédit.",
  "code": "CREDIT_ALREADY_EXISTS",
  "statusCode": 400
}
```

### Après (Solution)
```
// Message complet affiché dans l'alerte
"Le client a déjà un crédit en cours. Impossible de créer un nouveau crédit."
```

## Avantages

1. **Messages d'erreur complets** : Les utilisateurs voient maintenant les vrais messages du backend
2. **Gestion centralisée** : Un seul endroit pour gérer tous les types d'erreur
3. **Flexibilité** : Possibilité de personnaliser les messages et titres
4. **Logging amélioré** : Logs détaillés pour le debug sans informations sensibles
5. **Réutilisabilité** : Services et mixins réutilisables dans tout le projet
6. **Cohérence** : Gestion d'erreur uniforme dans toute l'application

## Migration des Composants Existants

### Étapes pour migrer un composant existant :

1. **Ajouter les imports nécessaires**
2. **Étendre ErrorHandlingMixin** ou injecter ErrorHandlerService
3. **Remplacer les gestions d'erreur manuelles** par `this.handleError(error)`
4. **Utiliser la syntaxe moderne** `subscribe({ next, error })` au lieu de `subscribe(success, error)`

### Exemple de migration :

**Avant :**
```typescript
this.service.getData().subscribe(
  (data) => {
    // Succès
  },
  (error) => {
    if (error.status === 500 && error.error && error.error.message) {
      this.alertService.showError(error.error.message);
    } else {
      this.alertService.showError('Une erreur est survenue');
    }
  }
);
```

**Après :**
```typescript
this.service.getData().subscribe({
  next: (data) => {
    // Succès
  },
  error: (error) => {
    this.handleError(error, 'Erreur de chargement');
  }
});
```

## Tests

Pour tester la gestion d'erreur améliorée :

1. **Provoquer une erreur 400** avec un message spécifique du backend
2. **Vérifier que le message complet** s'affiche dans l'alerte
3. **Comparer avec l'onglet réseau** pour confirmer que c'est le même message
4. **Tester différents codes d'erreur** (401, 403, 404, 500, etc.)

## Fichiers Modifiés

- ✅ `src/app/shared/service/error-handler.service.ts` (nouveau)
- ✅ `src/app/shared/service/base-http.service.ts` (nouveau)
- ✅ `src/app/shared/mixins/error-handling.mixin.ts` (nouveau)
- ✅ `src/app/shared/auth.interceptor.ts` (amélioré)
- ✅ `src/app/credit/service/credit.service.ts` (amélioré)
- ✅ `src/app/credit/credit-details/credit-details.component.ts` (exemple d'amélioration)
- ✅ `src/app/credit/credit-list/credit-list.component.ts` (exemple d'amélioration)

## Prochaines Étapes

1. **Migrer progressivement** les autres services pour étendre BaseHttpService
2. **Migrer les composants** pour utiliser ErrorHandlingMixin
3. **Ajouter des tests unitaires** pour le service de gestion d'erreur
4. **Documenter les codes d'erreur** spécifiques de l'API backend